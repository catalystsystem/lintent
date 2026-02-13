import {
	BYTES32_ZERO,
	type chain,
	chainMap,
	clients,
	COIN_FILLER,
	getChainName,
	getOracle,
	type WC
} from "$lib/config";
import { hashStruct, maxUint256, parseEventLogs } from "viem";
import type { MandateOutput, OrderContainer } from "../../types";
import { addressToBytes32, bytes32ToAddress } from "$lib/utils/convert";
import axios from "axios";
import { POLYMER_ORACLE_ABI } from "$lib/abi/polymeroracle";
import { COIN_FILLER_ABI } from "$lib/abi/outputsettler";
import { ERC20_ABI } from "$lib/abi/erc20";
import { orderToIntent } from "./intent";
import { compactTypes } from "$lib/utils/typedMessage";

/**
 * @notice Class for solving intents. Functions called by solvers.
 */
export class Solver {
	private static validationInflight = new Map<string, Promise<unknown>>();
	private static polymerRequestIndexByLog = new Map<string, number>();

	private static sleep(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	static fill(
		walletClient: WC,
		args: {
			orderContainer: OrderContainer;
			outputs: MandateOutput[];
		},
		opts: {
			preHook?: (chain: chain) => Promise<any>;
			postHook?: () => Promise<any>;
			account: () => `0x${string}`;
		}
	) {
		return async () => {
			const { preHook, postHook, account } = opts;
			const {
				orderContainer: { order, inputSettler },
				outputs
			} = args;
			const publicClients = clients;
			const orderId = orderToIntent({ order, inputSettler }).orderId();

			const outputChain = getChainName(outputs[0].chainId);
			// Always attempt chain switch before fill, including native-token fills.
			if (preHook) await preHook(outputChain);
			const connectedChainId = await walletClient.getChainId();
			const expectedChainId = chainMap[outputChain].id;
			if (connectedChainId !== expectedChainId) {
				throw new Error(
					`Wallet is on chain ${connectedChainId}, expected ${expectedChainId} (${outputChain})`
				);
			}

			let value = 0n;
			for (const output of outputs) {
				if (output.token === BYTES32_ZERO) {
					value += output.amount;
					continue;
				}
				if (output.chainId != outputs[0].chainId) {
					throw new Error("Filling outputs on multiple chains with single fill call not supported");
				}
				if (output.settler != outputs[0].settler) {
					throw new Error("Different settlers on outputs, not supported");
				}

				// Check allowance & set allowance if needed
				const assetAddress = bytes32ToAddress(output.token);
				const allowance = await publicClients[outputChain].readContract({
					address: assetAddress,
					abi: ERC20_ABI,
					functionName: "allowance",
					args: [account(), bytes32ToAddress(output.settler)]
				});
				if (BigInt(allowance) < output.amount) {
					const approveTransaction = await walletClient.writeContract({
						chain: chainMap[outputChain],
						account: account(),
						address: assetAddress,
						abi: ERC20_ABI,
						functionName: "approve",
						args: [bytes32ToAddress(output.settler), maxUint256]
					});
					await clients[outputChain].waitForTransactionReceipt({
						hash: approveTransaction
					});
				}
			}

			const transactionHash = await walletClient.writeContract({
				chain: chainMap[outputChain],
				account: account(),
				address: bytes32ToAddress(outputs[0].settler),
				value,
				abi: COIN_FILLER_ABI,
				functionName: "fillOrderOutputs",
				args: [orderId, outputs, order.fillDeadline, addressToBytes32(account())]
			});
			await clients[outputChain].waitForTransactionReceipt({
				hash: transactionHash
			});
			// orderInputs.validate[index] = transactionHash;
			if (postHook) await postHook();
			return transactionHash;
		};
	}

	static validate(
		walletClient: WC,
		args: {
			output: MandateOutput;
			orderContainer: OrderContainer;
			fillTransactionHash: string;
			sourceChain: chain;
			mainnet: boolean;
		},
		opts: {
			preHook?: (chain: chain) => Promise<any>;
			postHook?: () => Promise<any>;
			account: () => `0x${string}`;
		}
	) {
		return async () => {
			const { preHook, postHook, account } = opts;
			const {
				output,
				orderContainer: { order },
				fillTransactionHash,
				sourceChain,
				mainnet
			} = args;
			const expectedOutputHash = hashStruct({
				types: compactTypes,
				primaryType: "MandateOutput",
				data: output
			});
			const validationKey = `${sourceChain}:${fillTransactionHash}:${expectedOutputHash}`;
			const existingValidation = Solver.validationInflight.get(validationKey);
			if (existingValidation) return existingValidation;

			const validationPromise = (async () => {
				const outputChain = getChainName(output.chainId);
				if (
					!fillTransactionHash ||
					!fillTransactionHash.startsWith("0x") ||
					fillTransactionHash.length !== 66
				) {
					throw new Error(`Invalid fill transaction hash: ${fillTransactionHash}`);
				}

				// Get the output filled event.
				const transactionReceipt = await clients[outputChain].getTransactionReceipt({
					hash: fillTransactionHash as `0x${string}`
				});

				const logs = parseEventLogs({
					abi: COIN_FILLER_ABI,
					eventName: "OutputFilled",
					logs: transactionReceipt.logs
				});
				// We need to search through each log until we find one matching our output.
				let logIndex = -1;
				for (const log of logs) {
					const logOutput = log.args.output;
					// TODO: Optimise by comparing the dicts.
					const logOutputHash = hashStruct({
						types: compactTypes,
						primaryType: "MandateOutput",
						data: logOutput
					});
					if (logOutputHash === expectedOutputHash) {
						logIndex = log.logIndex;
						break;
					}
				}
				if (logIndex === -1) throw Error(`Could not find matching log`);

				if (order.inputOracle === getOracle("polymer", sourceChain)) {
					let proof: string | undefined;
					const polymerKey = `${Number(output.chainId)}:${Number(transactionReceipt.blockNumber)}:${Number(logIndex)}`;
					let polymerIndex: number | undefined = Solver.polymerRequestIndexByLog.get(polymerKey);
					for (const waitMs of [1000, 2000, 4000, 8000]) {
						const response = await axios.post(`/polymer`, {
							srcChainId: Number(output.chainId),
							srcBlockNumber: Number(transactionReceipt.blockNumber),
							globalLogIndex: Number(logIndex),
							polymerIndex,
							mainnet: mainnet
						});
						const dat = response.data as {
							proof: undefined | string;
							polymerIndex: number;
						};
						polymerIndex = dat.polymerIndex;
						if (polymerIndex !== undefined) {
							Solver.polymerRequestIndexByLog.set(polymerKey, polymerIndex);
						}
						if (dat.proof) {
							proof = dat.proof;
							break;
						}
						await Solver.sleep(waitMs);
					}
					if (proof) {
						if (preHook) await preHook(sourceChain);

						const transactionHash = await walletClient.writeContract({
							chain: chainMap[sourceChain],
							account: account(),
							address: order.inputOracle,
							abi: POLYMER_ORACLE_ABI,
							functionName: "receiveMessage",
							args: [`0x${proof.replace("0x", "")}`]
						});

						const result = await clients[sourceChain].waitForTransactionReceipt({
							hash: transactionHash
						});
						if (postHook) await postHook();
						return result;
					}
					throw new Error(
						`Polymer proof unavailable for output on ${outputChain}. Try again after the fill attestation is indexed.`
					);
				} else if (order.inputOracle === COIN_FILLER) {
					const log = logs.find((log) => log.logIndex === logIndex)!;
					if (preHook) await preHook(sourceChain);
					const transactionHash = await walletClient.writeContract({
						chain: chainMap[sourceChain],
						account: account(),
						address: order.inputOracle,
						abi: COIN_FILLER_ABI,
						functionName: "setAttestation",
						args: [log.args.orderId, log.args.solver, log.args.timestamp, log.args.output]
					});

					const result = await clients[sourceChain].waitForTransactionReceipt({
						hash: transactionHash
					});
					if (postHook) await postHook();
					return result;
				}
				throw new Error(
					`Unsupported input oracle ${order.inputOracle} for source chain ${sourceChain}.`
				);
			})();

			Solver.validationInflight.set(validationKey, validationPromise);
			try {
				return await validationPromise;
			} finally {
				Solver.validationInflight.delete(validationKey);
			}
		};
	}

	static claim(
		walletClient: WC,
		args: {
			orderContainer: OrderContainer;
			fillTransactionHashes: string[];
			sourceChain: chain;
		},
		opts: {
			preHook?: (chain: chain) => Promise<any>;
			postHook?: () => Promise<any>;
			account: () => `0x${string}`;
		}
	) {
		return async () => {
			const { preHook, postHook, account } = opts;
			const { orderContainer, fillTransactionHashes, sourceChain } = args;
			const { order, inputSettler } = orderContainer;
			const intent = orderToIntent({
				inputSettler,
				order
			});
			if (fillTransactionHashes.length !== order.outputs.length) {
				throw new Error(
					`Fill transaction hash count (${fillTransactionHashes.length}) does not match output count (${order.outputs.length}).`
				);
			}
			for (let i = 0; i < fillTransactionHashes.length; i++) {
				const hash = fillTransactionHashes[i];
				if (!hash || !hash.startsWith("0x") || hash.length !== 66) {
					throw new Error(`Invalid fill tx hash at index ${i}: ${hash}`);
				}
			}
			const transactionReceipts = await Promise.all(
				fillTransactionHashes.map((fth, i) => {
					const outputChain = getChainName(order.outputs[i].chainId);
					return clients[outputChain].getTransactionReceipt({
						hash: fth as `0x${string}`
					});
				})
			);
			const blocks = await Promise.all(
				transactionReceipts.map((r, i) => {
					const outputChain = getChainName(order.outputs[i].chainId);
					return clients[outputChain].getBlock({
						blockHash: r.blockHash
					});
				})
			);
			const fillTimestamps = blocks.map((b) => b.timestamp);

			if (preHook) await preHook(sourceChain);
			const expectedChainId = chainMap[sourceChain].id;
			const connectedChainId = await walletClient.getChainId();
			if (connectedChainId !== expectedChainId) {
				throw new Error(
					`Wallet is on chain ${connectedChainId}, expected ${expectedChainId} (${sourceChain}) before finalise`
				);
			}

			const solveParams = fillTimestamps.map((fillTimestamp) => {
				return {
					timestamp: Number(fillTimestamp),
					solver: addressToBytes32(account())
				};
			});

			const transactionHash = await intent.finalise({
				sourceChain,
				account: account(),
				walletClient,
				solveParams,
				signatures: orderContainer
			});
			if (!transactionHash) {
				throw new Error(
					`Finalise did not return a transaction hash for source chain ${sourceChain}.`
				);
			}
			let result;
			try {
				result = await clients[sourceChain].waitForTransactionReceipt({
					hash: transactionHash,
					timeout: 120_000,
					pollingInterval: 2_000
				});
			} catch (error) {
				throw new Error(
					`Timed out waiting for finalise tx receipt on ${sourceChain} for hash ${transactionHash}.`,
					{ cause: error as Error }
				);
			}
			if (postHook) await postHook();
			return result;
		};
	}
}
