// --- Creating intents --- //

import {
	ADDRESS_ZERO,
	BYTES32_ZERO,
	CATALYST_SETTLER,
	type chain,
	chainMap,
	clients,
	COIN_FILLER,
	COMPACT,
	getChainName,
	getOracle,
	type verifier,
	type WC,
	wormholeChainIds,
} from "$lib/config";
import {
	encodeAbiParameters,
	hashStruct,
	maxInt32,
	maxUint256,
	parseAbiParameters,
	toHex,
} from "viem";
import type {
	BatchCompact,
	CompactMandate,
	MandateOutput,
	StandardOrder,
} from "../../../types";
import { addressToBytes32, bytes32ToAddress } from "../convert";
import axios from "axios";
import { POLYMER_ORACLE_ABI } from "$lib/abi/polymeroracle";
import { SETTLER_COMPACT_ABI } from "$lib/abi/settlercompact";
import { COIN_FILLER_ABI } from "$lib/abi/coinfiller";
import { ERC20_ABI } from "$lib/abi/erc20";
import { COMPACT_ABI } from "$lib/abi/compact";
import { ResetPeriod, toId } from "../compact/IdLib";
import { compact_type_hash, compactTypes } from "../typedMessage";
import { getOrderId } from "./OrderLib";

export function createOrder(
	opts: {
		allocatorId: string;
		account: () => `0x${string}`;
		inputAsset: `0x${string}`;
		inputAmount: bigint;
		inputChain: chain;
		outputAsset: `0x${string}`;
		outputAmount: bigint;
		outputChain: chain;
		verifier: verifier;
	},
) {
	const {
		allocatorId,
		inputAsset,
		inputAmount,
		inputChain,
		outputAsset,
		outputAmount,
		outputChain,
		verifier,
		account,
	} = opts;
	const inputTokenId = toId(
		true,
		ResetPeriod.OneDay,
		allocatorId,
		inputAsset,
	);
	// Make Inputs
	const input: [bigint, bigint] = [inputTokenId, inputAmount];
	const inputs = [input];

	const remoteFiller = COIN_FILLER;
	const remoteOracle = getOracle(verifier, outputChain)!;
	const localOracle = getOracle(verifier, inputChain)!;

	// Make Outputs
	const output: MandateOutput = {
		remoteOracle: addressToBytes32(remoteOracle),
		remoteFiller: addressToBytes32(remoteFiller),
		chainId: BigInt(chainMap[outputChain].id),
		token: addressToBytes32(outputAsset),
		amount: outputAmount,
		recipient: addressToBytes32(account()),
		remoteCall: "0x",
		fulfillmentContext: "0x",
	};
	const outputs = [output];

	// Make order
	const order: StandardOrder = {
		user: account(),
		nonce: BigInt(Math.floor(Math.random() * 2 ** 32)), // Random nonce
		originChainId: BigInt(chainMap[inputChain].id),
		fillDeadline: Number(maxInt32), // TODO:
		expires: Number(maxInt32), //  TODO:
		localOracle: localOracle,
		inputs: inputs,
		outputs: outputs,
	};
	const mandate: CompactMandate = {
		fillDeadline: order.fillDeadline,
		localOracle: order.localOracle,
		outputs: order.outputs,
	};

	const batchCompact: BatchCompact = {
		arbiter: CATALYST_SETTLER,
		sponsor: order.user,
		nonce: order.nonce,
		expires: order.expires,
		idsAndAmounts: order.inputs,
		mandate,
	};

	return { order, batchCompact };
}

export function swap(walletClient: WC, opts: {
	preHook?: (chain?: chain) => Promise<any>;
	postHook?: () => Promise<any>;
	allocatorId: string;
	inputAsset: `0x${string}`;
	inputAmount: bigint;
	inputChain: chain;
	outputAsset: `0x${string}`;
	outputAmount: bigint;
	outputChain: chain;
	verifier: verifier;
	account: () => `0x${string}`;
}, orders: { order: StandardOrder; signature: `0x${string}` }[]) {
	return async () => {
		const { preHook, postHook, account, inputChain } = opts;
		if (preHook) await preHook(inputChain);
		const { order, batchCompact } = createOrder(opts);

		const signaturePromise = walletClient.signTypedData({
			account: account(),
			domain: {
				name: "The Compact",
				version: "1",
				chainId: chainMap[opts.inputChain].id,
				verifyingContract: COMPACT,
			} as const,
			types: compactTypes,
			primaryType: "BatchCompact",
			message: batchCompact,
		});
		const signature = await signaturePromise;

		console.log({ order, batchCompact, signature });
		orders.push({ order, signature });

		// const submitOrderResponse = await submitOrder({
		// 	orderType: 'CatalystCompactOrder',
		// 	order,
		// 	sponsorSigature: signature,
		// 	quote: {
		// 		fromAsset: $activeAsset,
		// 		toAsset: $outputAsset,
		// 		fromPrice: '1',
		// 		toPrice: '1',
		// 		intermediary: '1',
		// 		discount: '1'
		// 	}
		// });

		// console.log({ submitOrderResponse });
		if (postHook) await postHook();
	};
}

export function depositAndSwap(walletClient: WC, opts: {
	preHook?: (chain?: chain) => Promise<any>;
	postHook?: () => Promise<any>;
	allocatorId: string;
	inputAsset: `0x${string}`;
	inputAmount: bigint;
	inputChain: chain;
	outputAsset: `0x${string}`;
	outputAmount: bigint;
	outputChain: chain;
	verifier: verifier;
	account: () => `0x${string}`;
}, orders: { order: StandardOrder; signature: `0x${string}` }[]) {
	return async () => {
		const {
			preHook,
			postHook,
			allocatorId,
			inputAmount,
			inputAsset,
			inputChain,
			account,
		} = opts;
		const publicClients = clients;
		const { order, batchCompact } = createOrder(opts);
		const claimHash = hashStruct({
			data: batchCompact,
			types: compactTypes,
			primaryType: "BatchCompact",
		});
		const typeHash = compact_type_hash;

		// Generate the locktag. We use the toId function and then discard the rightmost 20 bytes.
		const lockTag: `0x${string}` = `0x${
			toHex(
				toId(true, ResetPeriod.OneDay, allocatorId, ADDRESS_ZERO),
				{
					size: 32,
				},
			)
				.replace("0x", "")
				.slice(0, 24)
		}`;
		// Remember to subtract existing deposited value
		let transactionHash: `0x${string}`;
		// TODO:
		const trueInputValue = inputAmount; // - formattedCompactDepositedBalance;
		if (preHook) await preHook(inputChain);
		if (trueInputValue <= 0) {
			transactionHash = await walletClient.writeContract({
				chain: chainMap[inputChain],
				account: account(),
				address: COMPACT,
				abi: COMPACT_ABI,
				functionName: "register",
				args: [claimHash, typeHash],
			});
		} else {
			transactionHash = inputAsset === ADDRESS_ZERO
				? await walletClient.writeContract({
					chain: chainMap[inputChain],
					account: account(),
					address: COMPACT,
					abi: COMPACT_ABI,
					functionName: "depositNativeAndRegister",
					value: inputAmount,
					args: [lockTag, claimHash, typeHash],
				})
				: await walletClient.writeContract({
					chain: chainMap[inputChain],
					account: account(),
					address: COMPACT,
					abi: COMPACT_ABI,
					functionName: "depositERC20AndRegister",
					args: [
						inputAsset,
						lockTag,
						inputAmount,
						claimHash,
						typeHash,
					],
				});
		}

		await publicClients[inputChain].waitForTransactionReceipt({
			hash: await transactionHash,
		});
		const signature = "0x";
		// Needs to be sent to the Catalyst order server:
		console.log({ order, batchCompact, signature });
		orders.push({ order, signature });

		if (postHook) await postHook();
	};
}

// --- Filling intents --- //

export function fill(walletClient: WC, args: {
	order: StandardOrder;
	index: number;
}, opts: {
	preHook?: (chain?: chain) => Promise<any>;
	postHook?: () => Promise<any>;
	outputChain: chain;
	account: () => `0x${string}`;
}) {
	return async () => {
		const {
			preHook,
			postHook,
			outputChain,
			account,
		} = opts;
		const {
			order,
			index,
		} = args;
		const publicClients = clients;
		const orderId = getOrderId(order);
		//Check that only 1 output exists.
		if (order.outputs.length !== 1) {
			throw new Error("Order must have exactly one output");
		}
		// The destination asset cannot be ETH.
		const output = order.outputs[index];
		if (output.token === BYTES32_ZERO) {
			throw new Error("Output token cannot be ETH");
		}

		// Check allowance & set allowance if needed
		const assetAddress = bytes32ToAddress(output.token);
		const allowance = await publicClients[outputChain].readContract({
			address: assetAddress,
			abi: ERC20_ABI,
			functionName: "allowance",
			args: [
				account(),
				bytes32ToAddress(output.remoteFiller),
			],
		});
		if (preHook) await preHook(outputChain);
		if (BigInt(allowance) < output.amount) {
			const approveTransaction = await walletClient
				.writeContract({
					chain: chainMap[outputChain],
					account: account(),
					address: assetAddress,
					abi: ERC20_ABI,
					functionName: "approve",
					args: [bytes32ToAddress(output.remoteFiller), maxUint256],
				});
			await clients[getChainName(Number(output.chainId))!]
				.waitForTransactionReceipt({
					hash: approveTransaction,
				});
		}

		const transcationHash = await walletClient.writeContract({
			chain: chainMap[outputChain],
			account: account(),
			address: bytes32ToAddress(output.remoteFiller),
			abi: COIN_FILLER_ABI,
			functionName: "fillBatch",
			args: [
				order.fillDeadline,
				orderId,
				order.outputs,
				addressToBytes32(account()),
			],
		});
		await clients[getChainName(Number(output.chainId))!]
			.waitForTransactionReceipt({
				hash: transcationHash,
			});
		// TODO:
		//orderInputs.validate[index] = transcationHash;
		if (postHook) await postHook();
		return transcationHash;
	};
}

/* export function submit(opts : {
	preHook?: (chain?: chain) => Promise<any>;
	postHook?: () => Promise<any>;
	inputChain: chain;
	order: StandardOrder;
	index: number;
    account:  () =>`0x${string}`;
    walletClients: any;
	timestamp: number;
}) {
	return async () => {
		const { preHook, postHook, order, index, inputChain, account, walletClients } = opts;
		//Check that only 1 output exists.
		if (order.outputs.length !== 1) {
			throw new Error("Order must have exactly one output");
		}
		// The destination asset cannot be ETH.
		const output = order.outputs[0];
		const remoteOracle = bytes32ToAddress(output.remoteOracle);

		await setWalletToCorrectChain(getChainName(Number(output.chainId))!);

		const orderId = getOrderId(order);
		// Lookup timestamp on-chain
		const encodedOutput = encodeMandateOutput(
			addressToBytes32(connectedAccount!.address),
			orderId,
			timestamp,
			output,
		);
		const payload: `0x${string}`[] = [encodedOutput];
		console.log({ payload });
		if (
			remoteOracle ===
				WORMHOLE_ORACLE[getChainName(Number(output.chainId))!]
		) {
			return walletClient!.writeContract({
				account: connectedAccount!.address,
				address: remoteOracle,
				abi: WROMHOLE_ORACLE_ABI,
				functionName: "submit",
				args: [bytes32ToAddress(output.remoteFiller), payload],
			});
		}
		throw new Error("Remote oracle is not supported");
	};
} */

export function validate(
	walletClient: WC,
	args: { order: StandardOrder; fillTransactionHash: string },
	opts: {
		preHook?: (chain?: chain) => Promise<any>;
		postHook?: () => Promise<any>;
		account: () => `0x${string}`;
	},
) {
	return async () => {
		const {
			preHook,
			postHook,
			account,
		} = opts;
		const {
			order,
			fillTransactionHash,
		} = args;
		const sourceChain = getChainName(Number(order.originChainId))!;
		const outputChain = getChainName(Number(order.outputs[0].chainId))!;
		if (order.outputs.length !== 1) {
			throw new Error("Order must have exactly one output");
		}
		// The destination asset cannot be ETH.
		const output = order.outputs[0];

		if (order.localOracle === getOracle("polymer", sourceChain)) {
			const transactionReceipt = await clients[outputChain]
				.getTransactionReceipt({
					hash: fillTransactionHash as `0x${string}`,
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
					polymerIndex,
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

				const transcationHash = await walletClient
					.writeContract({
						chain: chainMap[sourceChain],
						account: account(),
						address: order.localOracle,
						abi: POLYMER_ORACLE_ABI,
						functionName: "receiveMessage",
						args: [`0x${proof.replace("0x", "")}`],
					});

				const result = await clients[sourceChain]
					.waitForTransactionReceipt({
						hash: transcationHash,
					});
				if (postHook) await postHook();
				return result;
			}
		}

		if (order.localOracle === getOracle("wormhole", sourceChain)) {
			// TODO: get sequence from event.
			const sequence = 0;
			// Get VAA
			const wormholeChainId = wormholeChainIds[outputChain];
			const requestUrl =
				`https://api.testnet.wormholescan.io/v1/signed_vaa/${wormholeChainId}/${
					output.remoteOracle.replace("0x", "")
				}/${sequence}?network=Testnet`;
			const response = await axios.get(requestUrl);
			console.log(response.data);
			// return $walletClient.writeContract({
			// 	account: connectedAccount.address,
			// 	address: order.localOracle,
			// 	abi: WROMHOLE_ORACLE_ABI,
			// 	functionName: 'receiveMessage',
			// 	args: [encodedOutput]
			// });
			return;
		}
	};
}

export function claim(
	walletClient: WC,
	args: {
		order: StandardOrder;
		fillTransactionHash: string;
		signature: `0x${string}`;
	},
	opts: {
		preHook?: (chain?: chain) => Promise<any>;
		postHook?: () => Promise<any>;
		account: () => `0x${string}`;
	},
) {
	return async () => {
		const {
			preHook,
			postHook,
			account,
		} = opts;
		const {
			order,
			fillTransactionHash,
			signature,
		} = args;
		console.log({ signature });
		const outputChain = getChainName(Number(order.outputs[0].chainId))!;
		if (order.outputs.length !== 1) {
			throw new Error("Order must have exactly one output");
		}
		const transactionReceipt = await clients[outputChain]
			.getTransactionReceipt({
				hash: fillTransactionHash as `0x${string}`,
			});
		const blockHashOfFill = transactionReceipt.blockHash;
		const block = await clients[outputChain].getBlock({
			blockHash: blockHashOfFill,
		});
		const fillTimestamp = block.timestamp;

		const sourceChain = getChainName(Number(order.originChainId))!;
		if (preHook) await preHook(sourceChain);

		const combinedSignatures = encodeAbiParameters(
			parseAbiParameters(["bytes", "bytes"]),
			[signature, "0x" as `0x${string}`], // TODO: allocator signature
		);

		const transcationHash = await walletClient.writeContract({
			chain: chainMap[sourceChain],
			account: account(),
			address: CATALYST_SETTLER,
			abi: SETTLER_COMPACT_ABI,
			functionName: "finaliseSelf",
			args: [
				order,
				combinedSignatures,
				[Number(fillTimestamp)],
				addressToBytes32(account()),
			],
		});
		const result = await clients[sourceChain].waitForTransactionReceipt({
			hash: transcationHash,
		});
		if (postHook) await postHook();
		return result;
	};
}
