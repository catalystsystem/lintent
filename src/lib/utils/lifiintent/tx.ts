// --- Creating intents --- //

import {
	ADDRESS_ZERO,
	ALWAYS_OK_ALLOCATOR,
	BYTES32_ZERO,
	type chain,
	chainMap,
	clients,
	COIN_FILLER,
	COMPACT,
	getChainName,
	getOracle,
	INPUT_SETTLER_COMPACT_LIFI,
	INPUT_SETTLER_ESCROW_LIFI,
	POLYMER_ALLOCATOR,
	type Token,
	type Verifier,
	type WC,
	wormholeChainIds,
} from "$lib/config";
import {
	encodeAbiParameters,
	hashStruct,
	maxUint256,
	parseAbiParameters,
	toHex,
	verifyTypedData,
} from "viem";
import type {
	BatchCompact,
	CompactMandate,
	MandateOutput,
	NoSignature,
	OrderContainer,
	Signature,
	StandardOrder,
} from "../../../types";
import { addressToBytes32, bytes32ToAddress } from "../convert";
import axios from "axios";
import { POLYMER_ORACLE_ABI } from "$lib/abi/polymeroracle";
import { SETTLER_COMPACT_ABI } from "$lib/abi/settlercompact";
import { COIN_FILLER_ABI } from "$lib/abi/outputsettler";
import { ERC20_ABI } from "$lib/abi/erc20";
import { COMPACT_ABI } from "$lib/abi/compact";
import { ResetPeriod, toId } from "../compact/IdLib";
import {
	compact_type_hash,
	compactTypes,
	StandardOrderAbi,
} from "../typedMessage";
import { getOrderId } from "./OrderLib";
import { submitOrder, submitOrderUnsigned } from "../api";
import { SETTLER_ESCROW_ABI } from "$lib/abi/escrow";

export type opts = {
	preHook?: (chain: chain) => Promise<any>;
	postHook?: () => Promise<any>;
	allocatorId: string;
	inputTokens: Token[];
	outputToken: Token;
	inputAmounts: bigint[];
	outputAmount: bigint;
	verifier: Verifier;
	account: () => `0x${string}`;
	inputSettler:
		| typeof INPUT_SETTLER_COMPACT_LIFI
		| typeof INPUT_SETTLER_ESCROW_LIFI;
};

// --- Initiating Intents --- //

export function createOrder(opts: {
	allocatorId: string;
	inputTokens: Token[];
	outputToken: Token;
	inputAmounts: bigint[];
	outputAmount: bigint;
	verifier: Verifier;
	account: () => `0x${string}`;
	inputSettler:
		| typeof INPUT_SETTLER_COMPACT_LIFI
		| typeof INPUT_SETTLER_ESCROW_LIFI;
}) {
	const {
		allocatorId,
		inputTokens,
		outputToken,
		inputAmounts,
		outputAmount,
		verifier,
		account,
		inputSettler,
	} = opts;
	const inputChain = inputTokens[0].chain;
	const inputs: [bigint, bigint][] = [];
	for (let i = 0; i < inputTokens.length; ++i) {
		// If Compact input, then generate the tokenId otherwise cast into uint256.
		const inputTokenId = inputSettler == INPUT_SETTLER_COMPACT_LIFI
			? toId(true, ResetPeriod.OneDay, allocatorId, inputTokens[i].address)
			: BigInt(inputTokens[i].address);
		inputs.push([inputTokenId, inputAmounts[i]]);
	}

	const outputSettler = COIN_FILLER;
	const outputOracle = getOracle(verifier, outputToken.chain)!;
	const inputOracle = getOracle(verifier, inputChain)!;

	// Make Outputs
	const output: MandateOutput = {
		oracle: addressToBytes32(outputOracle),
		settler: addressToBytes32(outputSettler),
		chainId: BigInt(chainMap[outputToken.chain].id),
		token: addressToBytes32(outputToken.address),
		amount: outputAmount,
		recipient: addressToBytes32(account()),
		call: "0x",
		context: "0x",
	};
	const outputs = [output];

	// Get the current epoch timestamp:
	const currentTime = Math.floor(Date.now() / 1000);
	const ONE_MINUTE = 60;

	// Make order
	const order: StandardOrder = {
		user: account(),
		nonce: BigInt(Math.floor(Math.random() * 2 ** 32)), // Random nonce
		originChainId: BigInt(chainMap[inputChain].id),
		fillDeadline: currentTime + ONE_MINUTE * 10,
		expires: currentTime + ONE_MINUTE * 10,
		inputOracle: inputOracle,
		inputs: inputs,
		outputs: outputs,
	};

	const mandate: CompactMandate = {
		fillDeadline: order.fillDeadline,
		inputOracle: order.inputOracle,
		outputs: order.outputs,
	};
	const commitments = inputs.map(([tokenId, amount]) => {
		const lockTag: `0x${string}` = `0x${
			toHex(tokenId)
				.replace("0x", "")
				.slice(0, 12 * 2)
		}`;
		const token: `0x${string}` = `0x${
			toHex(tokenId)
				.replace("0x", "")
				.slice(12 * 2, 32 * 2)
		}`;
		return {
			lockTag,
			token,
			amount,
		};
	});
	const batchCompact: BatchCompact = {
		arbiter: INPUT_SETTLER_COMPACT_LIFI,
		sponsor: order.user,
		nonce: order.nonce,
		expires: order.expires,
		commitments,
		mandate,
	};

	return { order, batchCompact };
}

export function swap(
	walletClient: WC,
	opts: {
		preHook?: (chain: chain) => Promise<any>;
		postHook?: () => Promise<any>;
		allocatorId: string;
		inputTokens: Token[];
		outputToken: Token;
		inputAmounts: bigint[];
		outputAmount: bigint;
		verifier: Verifier;
		inputSettler:
			| typeof INPUT_SETTLER_COMPACT_LIFI
			| typeof INPUT_SETTLER_ESCROW_LIFI;
		account: () => `0x${string}`;
	},
	orders: OrderContainer[],
) {
	return async () => {
		const { preHook, postHook, account, inputTokens } = opts;
		const inputChain = inputTokens[0].chain;
		if (preHook) await preHook(inputChain);
		const { order, batchCompact } = createOrder(opts);

		const signaturePromise = walletClient.signTypedData({
			account: account(),
			domain: {
				name: "The Compact",
				version: "1",
				chainId: chainMap[inputTokens[0].chain].id,
				verifyingContract: COMPACT,
			} as const,
			types: compactTypes,
			primaryType: "BatchCompact",
			message: batchCompact,
		});
		const sponsorSignature = await signaturePromise;

		console.log({ order, batchCompact, sponsorSignature });
		orders.push({
			order: order,
			inputSettler: INPUT_SETTLER_COMPACT_LIFI,
			sponsorSignature: {
				type: "ECDSA",
				payload: sponsorSignature,
			},
			allocatorSignature: {
				type: "None",
				payload: "0x",
			},
		});

		// const submitOrderResponse = await submitOrder({
		// 	orderType: "CatalystCompactOrder",
		// 	order,
		// 	inputSettler: INPUT_SETTLER_COMPACT_LIFI,
		// 	sponsorSignature,
		// 	allocatorSignature: "0x",
		// 	quote: {
		// 		fromAsset: opts.inputTokens[0].address,
		// 		toAsset: opts.inputTokens[0].address,
		// 		fromPrice: "1",
		// 		toPrice: "1",
		// 		intermediary: "1",
		// 		discount: "1",
		// 	},
		// });

		if (postHook) await postHook();
	};
}

export function depositAndSwap(
	walletClient: WC,
	opts: opts,
	orders: OrderContainer[],
) {
	return async () => {
		const {
			preHook,
			postHook,
			allocatorId,
			inputAmounts,
			inputTokens,
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
		const tokenIds: bigint[] = inputTokens.map((tkn) =>
			toId(true, ResetPeriod.OneDay, allocatorId, tkn.address)
		);
		const idsAndAmounts: [bigint, bigint][] = [];
		for (let i = 0; i < inputTokens.length; ++i) {
			idsAndAmounts.push([tokenIds[i], inputAmounts[i]]);
		}
		if (preHook) await preHook(inputTokens[0].chain);
		const inputChain = chainMap[inputTokens[0].chain];

		let transactionHash = await walletClient.writeContract({
			chain: inputChain,
			account: account(),
			address: COMPACT,
			abi: COMPACT_ABI,
			functionName: "batchDepositAndRegisterMultiple",
			args: [idsAndAmounts, [[
				claimHash,
				typeHash,
			]]],
		});

		const recepit = await publicClients[inputTokens[0].chain]
			.waitForTransactionReceipt({
				hash: await transactionHash,
			});
		orders.push({
			order: order,
			inputSettler: INPUT_SETTLER_COMPACT_LIFI,
			sponsorSignature: {
				type: "None",
				payload: "0x",
			},
			allocatorSignature: {
				type: "None",
				payload: "0x",
			},
		});

		const sponsorSignature = "0x";
		const allocatorSignature = "0x";
		// let allocatorSignature: `0x${string}` = "0x";
		// Needs to be sent to the Catalyst order server:
		// Check the allocator:
		if (allocatorId == POLYMER_ALLOCATOR) {
			// Get allocation
			// const response = await axios.post(`/allocator`, {
			// 	chainId: Number(order.originChainId),
			// 	blockNumber: Number(recepit.blockNumber),
			// 	claimHash: claimHash,
			// 	order: order,
			// });
			// const dat = response.data as {
			// 	allocatorSignature: `0x${string}`;
			// 	allocatorAddress: `0x${string}`;
			// };
			// allocatorSignature = dat.allocatorSignature;
			// Check Polymer's signature.
			// const valid = await verifyTypedData({
			// 	address: dat.allocatorAddress,
			// 	domain: {
			// 		name: "The Compact",
			// 		version: "1",
			// 		chainId: chainMap[opts.inputChain].id,
			// 		verifyingContract: COMPACT,
			// 	} as const,
			// 	types: compactTypes,
			// 	primaryType: "BatchCompact",
			// 	message: batchCompact,
			// 	signature: allocatorSignature,
			// });
			// console.log({
			// 	valid,
			// 	allocatorSignature,
			// 	allocatorAddress: dat.allocatorAddress,
			// });
		}
		console.log({
			order,
			batchCompact,
			sponsorSignature,
			allocatorSignature,
		});

		// const submitOrderResponse = await submitOrderUnsigned({
		// 	orderType: "CatalystCompactOrder",
		// 	order,
		// 	inputSettler: INPUT_SETTLER_COMPACT_LIFI,
		// 	quote: {
		// 		fromAsset: opts.inputTokens[0].address,
		// 		toAsset: opts.inputTokens[0].address,
		// 		fromPrice: "1",
		// 		toPrice: "1",
		// 		intermediary: "1",
		// 		discount: "1",
		// 	},
		// 	compactRegistrationTxHash: transactionHash,
		// 	allocatorSignature,
		// });

		// console.log({ submitOrderResponse });
		if (postHook) await postHook();
	};
}

export function escrowApprove(
	walletClient: WC,
	opts: {
		preHook?: (chain: chain) => Promise<any>;
		postHook?: () => Promise<any>;
		inputTokens: Token[];
		inputAmounts: bigint[];
		account: () => `0x${string}`;
	},
) {
	return async () => {
		const { preHook, postHook, inputTokens, inputAmounts, account } = opts;
		for (let i = 0; i < inputTokens.length; ++i) {
			const inputToken = inputTokens[i];
			if (preHook) await preHook(inputToken.chain);
			const publicClient = clients[inputToken.chain];
			const currentAllowance = await publicClient.readContract({
				address: inputToken.address,
				abi: ERC20_ABI,
				functionName: "allowance",
				args: [account(), INPUT_SETTLER_ESCROW_LIFI],
			});
			if (currentAllowance >= inputAmounts[i]) continue;
			const transactionHash = walletClient.writeContract({
				chain: chainMap[inputToken.chain],
				account: account(),
				address: inputToken.address,
				abi: ERC20_ABI,
				functionName: "approve",
				args: [INPUT_SETTLER_ESCROW_LIFI, maxUint256],
			});

			await publicClient.waitForTransactionReceipt({
				hash: await transactionHash,
			});
		}
		if (postHook) await postHook();
	};
}

export function openIntent(
	walletClient: WC,
	opts: opts,
	orders: OrderContainer[],
) {
	return async () => {
		const { preHook, postHook, inputTokens, account } = opts;
		const { order } = createOrder(opts);

		console.log(orders);

		const inputChain = inputTokens[0].chain;
		if (preHook) await preHook(inputChain);
		// Execute the open.
		const transactionHash = await walletClient.writeContract({
			chain: chainMap[inputChain],
			account: account(),
			address: INPUT_SETTLER_ESCROW_LIFI,
			abi: SETTLER_ESCROW_ABI,
			functionName: "open",
			args: [order],
		});

		await clients[inputChain].waitForTransactionReceipt({
			hash: transactionHash,
		});
		if (postHook) await postHook();
		orders.push({
			inputSettler: INPUT_SETTLER_ESCROW_LIFI,
			order,
			sponsorSignature: {
				type: "None",
				payload: "0x",
			},
			allocatorSignature: {
				type: "None",
				payload: "0x",
			},
		});

		return transactionHash;
	};
}

// --- Filling intents --- //

export function fill(
	walletClient: WC,
	args: {
		orderContainer: OrderContainer;
		outputs: MandateOutput[];
	},
	opts: {
		preHook?: (chain: chain) => Promise<any>;
		postHook?: () => Promise<any>;
		account: () => `0x${string}`;
	},
) {
	return async () => {
		const { preHook, postHook, account } = opts;
		const {
			orderContainer: { order, inputSettler },
			outputs,
		} = args;
		const publicClients = clients;
		const orderId = getOrderId({ order, inputSettler });
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
				throw new Error(
					"Filling outputs on multiple chains with single fill call not supported",
				);
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
				args: [account(), bytes32ToAddress(output.settler)],
			});
			if (preHook) await preHook(outputChain);
			if (BigInt(allowance) < output.amount) {
				const approveTransaction = await walletClient.writeContract({
					chain: chainMap[outputChain],
					account: account(),
					address: assetAddress,
					abi: ERC20_ABI,
					functionName: "approve",
					args: [bytes32ToAddress(output.settler), maxUint256],
				});
				await clients[outputChain].waitForTransactionReceipt({
					hash: approveTransaction,
				});
			}
		}

		const transactionHash = await walletClient.writeContract({
			chain: chainMap[outputChain],
			account: account(),
			address: bytes32ToAddress(outputs[0].settler),
			abi: COIN_FILLER_ABI,
			functionName: "fillOrderOutputs",
			args: [
				orderId,
				outputs,
				order.fillDeadline,
				addressToBytes32(account()),
			],
		});
		await clients[outputChain].waitForTransactionReceipt({
			hash: transactionHash,
		});
		// orderInputs.validate[index] = transcationHash;
		if (postHook) await postHook();
		return transactionHash;
	};
}

/* export function submit(opts : {
	preHook?: (chain: chain) => Promise<any>;
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
	args: { orderContainer: OrderContainer; fillTransactionHash: string },
	opts: {
		preHook?: (chain: chain) => Promise<any>;
		postHook?: () => Promise<any>;
		account: () => `0x${string}`;
	},
) {
	return async () => {
		const { preHook, postHook, account } = opts;
		const {
			orderContainer: { order },
			fillTransactionHash,
		} = args;
		const sourceChain = getChainName(order.originChainId);
		const outputChain = getChainName(order.outputs[0].chainId);
		if (order.outputs.length !== 1) {
			throw new Error("Order must have exactly one output");
		}
		// The destination asset cannot be ETH.
		const output = order.outputs[0];

		if (order.inputOracle === getOracle("polymer", sourceChain)) {
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

				const transcationHash = await walletClient.writeContract({
					chain: chainMap[sourceChain],
					account: account(),
					address: order.inputOracle,
					abi: POLYMER_ORACLE_ABI,
					functionName: "receiveMessage",
					args: [`0x${proof.replace("0x", "")}`],
				});

				const result = await clients[sourceChain].waitForTransactionReceipt({
					hash: transcationHash,
				});
				if (postHook) await postHook();
				return result;
			}
		}

		if (order.inputOracle === getOracle("wormhole", sourceChain)) {
			// TODO: get sequence from event.
			const sequence = 0;
			// Get VAA
			const wormholeChainId = wormholeChainIds[outputChain];
			const requestUrl =
				`https://api.testnet.wormholescan.io/v1/signed_vaa/${wormholeChainId}/${
					output.oracle.replace(
						"0x",
						"",
					)
				}/${sequence}?network=Testnet`;
			const response = await axios.get(requestUrl);
			console.log(response.data);
			// return $walletClient.writeContract({
			// 	account: connectedAccount.address,
			// 	address: order.inputOracle,
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
		orderContainer: OrderContainer;
		fillTransactionHash: string;
	},
	opts: {
		preHook?: (chain: chain) => Promise<any>;
		postHook?: () => Promise<any>;
		account: () => `0x${string}`;
	},
) {
	return async () => {
		const { preHook, postHook, account } = opts;
		const { orderContainer, fillTransactionHash } = args;
		const { order } = orderContainer;
		const outputChain = getChainName(order.outputs[0].chainId);
		if (order.outputs.length !== 1) {
			throw new Error("Order must have exactly one output");
		}
		const transactionReceipt = await clients[outputChain].getTransactionReceipt(
			{
				hash: fillTransactionHash as `0x${string}`,
			},
		);
		const blockHashOfFill = transactionReceipt.blockHash;
		const block = await clients[outputChain].getBlock({
			blockHash: blockHashOfFill,
		});
		const fillTimestamp = block.timestamp;

		const sourceChain = getChainName(order.originChainId);
		if (preHook) await preHook(sourceChain);

		const inputSettler = orderContainer.inputSettler;
		let transactionHash: `0x${string}`;
		const actionChain = chainMap[sourceChain];

		const solveParam = {
			timestamp: Number(fillTimestamp),
			solver: addressToBytes32(account()),
		};

		if (inputSettler === INPUT_SETTLER_ESCROW_LIFI) {
			transactionHash = await walletClient.writeContract({
				chain: actionChain,
				account: account(),
				address: inputSettler,
				abi: SETTLER_ESCROW_ABI,
				functionName: "finalise",
				args: [
					order,
					[solveParam],
					addressToBytes32(account()),
					"0x",
				],
			});
		} else if (inputSettler === INPUT_SETTLER_COMPACT_LIFI) {
			// Check whether or not we have a signature.
			const { sponsorSignature, allocatorSignature } = orderContainer;
			console.log({
				sponsorSignature,
				allocatorSignature,
			});
			const combinedSignatures = encodeAbiParameters(
				parseAbiParameters(["bytes", "bytes"]),
				[
					sponsorSignature.payload ?? "0x",
					allocatorSignature.payload,
				],
			);
			transactionHash = await walletClient.writeContract({
				chain: actionChain,
				account: account(),
				address: inputSettler,
				abi: SETTLER_COMPACT_ABI,
				functionName: "finalise",
				args: [
					order,
					combinedSignatures,
					[solveParam],
					addressToBytes32(account()),
					"0x",
				],
			});
		} else {throw new Error(
				`Could not detect settler type ${orderContainer.inputSettler}`,
			);}
		const result = await clients[sourceChain].waitForTransactionReceipt({
			hash: transactionHash,
		});
		if (postHook) await postHook();
		return result;
	};
}
