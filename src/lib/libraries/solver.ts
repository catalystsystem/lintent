import {
	BYTES32_ZERO,
	type chain,
	chainMap,
	clients,
	getChainName,
	getOracle,
	INPUT_SETTLER_COMPACT_LIFI,
	INPUT_SETTLER_ESCROW_LIFI,
	type WC
} from "$lib/config";
import { encodeAbiParameters, maxUint256, parseAbiParameters } from "viem";
import type { MandateOutput, OrderContainer } from "../../types";
import { addressToBytes32, bytes32ToAddress } from "$lib/utils/convert";
import axios from "axios";
import { POLYMER_ORACLE_ABI } from "$lib/abi/polymeroracle";
import { SETTLER_COMPACT_ABI } from "$lib/abi/settlercompact";
import { COIN_FILLER_ABI } from "$lib/abi/outputsettler";
import { ERC20_ABI } from "$lib/abi/erc20";
import { SETTLER_ESCROW_ABI } from "$lib/abi/escrow";
import { orderToIntent } from "./intent";

/**
 * @notice Class for solving intents. Functions called by solvers.
 */
export class Solver {
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
			// TODO: MULTICHAIN COMPACT fix escrow typing
			const orderId = orderToIntent({ order, inputSettler, lock: { type: "escrow" } }).orderId();
			//Check that only 1 output exists.
			if (outputs.length !== 1) {
				throw new Error("Order must have exactly one output");
			}

			const outputChain = getChainName(outputs[0].chainId);
			console.log({ outputChain });
			for (const output of outputs) {
				if (output.token === BYTES32_ZERO) {
					// The destination asset cannot be ETH.
					throw new Error("Output token cannot be ETH");
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
				if (preHook) await preHook(outputChain);
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
				abi: COIN_FILLER_ABI,
				functionName: "fillOrderOutputs",
				args: [orderId, outputs, order.fillDeadline, addressToBytes32(account())]
			});
			await clients[outputChain].waitForTransactionReceipt({
				hash: transactionHash
			});
			// orderInputs.validate[index] = transcationHash;
			if (postHook) await postHook();
			return transactionHash;
		};
	}

	static validate(
		walletClient: WC,
		args: { orderContainer: OrderContainer; fillTransactionHash: string; sourceChain: chain },
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
				fillTransactionHash,
				sourceChain
			} = args;
			const outputChain = getChainName(order.outputs[0].chainId);
			if (order.outputs.length !== 1) {
				throw new Error("Order must have exactly one output");
			}
			// The destination asset cannot be ETH.
			const output = order.outputs[0];

			if (order.inputOracle === getOracle("polymer", sourceChain)) {
				const transactionReceipt = await clients[outputChain].getTransactionReceipt({
					hash: fillTransactionHash as `0x${string}`
				});

				const numlogs = transactionReceipt.logs.length;
				if (numlogs !== 2) throw Error(`Unexpected Logs count ${numlogs}`);
				const fillLog = transactionReceipt.logs[1]; // The first log is transfer, next is fill.

				let proof: string | undefined;
				let polymerIndex: number | undefined;
				for (let i = 0; i < 5; ++i) {
					const response = await axios.post(`/polymer`, {
						srcChainId: Number(order.outputs[0].chainId),
						srcBlockNumber: Number(transactionReceipt.blockNumber),
						globalLogIndex: Number(fillLog.logIndex),
						polymerIndex
					});
					const dat = response.data as {
						proof: undefined | string;
						polymerIndex: number;
					};
					polymerIndex = dat.polymerIndex;
					console.log(dat);
					if (dat.proof) {
						proof = dat.proof;
						break;
					}
					// Wait while backing off before requesting again.
					await new Promise((r) => setTimeout(r, i * 2 + 1000));
				}
				console.log({ proof });
				if (proof) {
					if (preHook) await preHook(sourceChain);

					const transcationHash = await walletClient.writeContract({
						chain: chainMap[sourceChain],
						account: account(),
						address: order.inputOracle,
						abi: POLYMER_ORACLE_ABI,
						functionName: "receiveMessage",
						args: [`0x${proof.replace("0x", "")}`]
					});

					const result = await clients[sourceChain].waitForTransactionReceipt({
						hash: transcationHash
					});
					if (postHook) await postHook();
					return result;
				}
			}

			// if (order.inputOracle === getOracle("wormhole", sourceChain)) {
			// 	// TODO: get sequence from event.
			// 	const sequence = 0;
			// 	// Get VAA
			// 	const wormholeChainId = wormholeChainIds[outputChain];
			// 	const requestUrl = `https://api.testnet.wormholescan.io/v1/signed_vaa/${wormholeChainId}/${output.oracle.replace(
			// 		"0x",
			// 		""
			// 	)}/${sequence}?network=Testnet`;
			// 	const response = await axios.get(requestUrl);
			// 	console.log(response.data);
			// return $walletClient.writeContract({
			// 	account: connectedAccount.address,
			// 	address: order.inputOracle,
			// 	abi: WROMHOLE_ORACLE_ABI,
			// 	functionName: 'receiveMessage',
			// 	args: [encodedOutput]
			// });
			// 	return;
			// }
		};
	}

	static claim(
		walletClient: WC,
		args: {
			orderContainer: OrderContainer;
			fillTransactionHash: string;
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
			const { orderContainer, fillTransactionHash, sourceChain } = args;
			const { order, inputSettler } = orderContainer;
			const intent = orderToIntent({
				inputSettler,
				order,
				lock: { type: inputSettler === INPUT_SETTLER_COMPACT_LIFI ? "compact" : "escrow" }
			});

			const outputChain = getChainName(order.outputs[0].chainId);
			if (order.outputs.length !== 1) {
				throw new Error("Order must have exactly one output");
			}
			const transactionReceipt = await clients[outputChain].getTransactionReceipt({
				hash: fillTransactionHash as `0x${string}`
			});
			const blockHashOfFill = transactionReceipt.blockHash;
			const block = await clients[outputChain].getBlock({
				blockHash: blockHashOfFill
			});
			const fillTimestamp = block.timestamp;

			if (preHook) await preHook(sourceChain);

			const solveParam = {
				timestamp: Number(fillTimestamp),
				solver: addressToBytes32(account())
			};

			const transactionHash = intent.finalise({
				sourceChain,
				account: account(),
				walletClient,
				solveParam,
				signatures: orderContainer
			});
			const result = await clients[sourceChain].waitForTransactionReceipt({
				hash: transactionHash
			});
			if (postHook) await postHook();
			return result;
		};
	}
}
