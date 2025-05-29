<script lang="ts">
	import axios from 'axios';
	import onboard from '$lib/web3-onboard';
	import { compact_type_hash, compactTypes } from '$lib/typedMessage';
	import {
		createWalletClient,
		custom,
		encodePacked,
		hashStruct,
		keccak256,
		maxInt32,
		maxUint256,
		toHex,
		parseAbiParameters,
		encodeAbiParameters
	} from 'viem';
	import { derived, readable, writable, type Readable } from 'svelte/store';
	import type { WalletState } from '@web3-onboard/core';
	import { ERC20_ABI } from '$lib/abi/erc20';
	import { COMPACT_ABI } from '$lib/abi/compact';
	import { WROMHOLE_ORACLE_ABI } from '$lib/abi/wormholeoracle';
	import { ResetPeriod, toId } from '$lib/IdLib';
	import AwaitButton from '$lib/components/AwaitButton.svelte';
	import type { BatchCompact, StandardOrder, CompactMandate, MandateOutput } from '../types';
	import { submitOrder } from '$lib/utils/api';
	import {
		ADDRESS_ZERO,
		BYTES32_ZERO,
		COMPACT,
		CATALYST_SETTLER,
		DEFAULT_ALLOCATOR,
		COIN_FILLER,
		WORMHOLE_ORACLE,
		coinMap,
		decimalMap,
		getCoins,
		chainMap,
		chains,
		type chain,
		type coin,
		getChainName,
		getTokenKeyByAddress,
		formatTokenDecmials,
		wormholeChainIds,
		getOracle,
		POLYMER_ORACLE,
		clients,
		type verifiers
	} from '$lib/config';
	import { COIN_FILLER_ABI } from '$lib/abi/coinfiller';
	import { SETTLER_COMPACT_ABI } from '$lib/abi/settlercompact';
	import { POLYMER_ORACLE_ABI } from '$lib/abi/polymeroracle';
	import { onDestroy, onMount } from 'svelte';
	import {
		addressToBytes32,
		bytes32ToAddress,
		idToToken,
		toBigIntWithDecimals,
		trunc
	} from '$lib/utils/convert';
	import SwapForm from '$lib/components/SwapForm.svelte';

	// Fix bigint so we can json serialize it:
	(BigInt.prototype as any).toJSON = function () {
		return this.toString();
	};

	// Subscribe to wallet updates
	const wallets = onboard.state.select('wallets');
	let initialWalletValue: WalletState | undefined;
	const activeWallet = readable(initialWalletValue, (set) => {
		wallets.subscribe((v) => {
			set(v?.[0]);
		});
	});

	// The first wallet in the array of connected wallets
	$: connectedAccount = $activeWallet?.accounts?.[0];

	// Globals
	const activeChain = writable<chain>('sepolia');

	// Define clients for accessing the chain.
	const walletClient = derived([activeChain, activeWallet], ([activeChain, activeWallet]) => {
		return createWalletClient({
			chain: chainMap[activeChain],
			transport: custom(activeWallet?.provider)
		});
	});

	let ordersSubscription: () => void;

	// Orders
	const orders = writable<{ order: StandardOrder; signature: `0x${string}` }[]>([]);
	onMount(() => {
		// Load orders from local storage.
		const storedOrders = localStorage.getItem('catalyst-orders');
		if (storedOrders) {
			console.log(storedOrders);
			try {
				const parsedOrders = JSON.parse(storedOrders);
				if (Array.isArray(parsedOrders)) {
					// For each order, if a field is string ending in n, convert it to bigint.
					parsedOrders.forEach((instance) => {
						instance.order.nonce = BigInt(instance.order.nonce);
						instance.order.originChainId = BigInt(instance.order.originChainId);
						if (instance.order.inputs) {
							instance.order.inputs = instance.order.inputs.map((input: [string, string]) => {
								return [BigInt(input[0]), BigInt(input[1])];
							});
						}
						if (instance.order.outputs) {
							instance.order.outputs = instance.order.outputs.map(
								(output: {
									remoteOracle: `0x${string}`;
									remoteFiller: `0x${string}`;
									chainId: string;
									token: `0x${string}`;
									amount: string;
									recipient: `0x${string}`;
									remoteCall: `0x${string}`;
									fulfillmentContext: `0x${string}`;
								}) => {
									return {
										...output,
										chainId: BigInt(output.chainId),
										amount: BigInt(output.amount)
									};
								}
							);
						}
					});
					orders.set(parsedOrders);
				}
			} catch (e) {
				console.error('Failed to parse stored orders:', e);
			}
		}
		ordersSubscription = orders.subscribe((v) => {
			// Set the content to local storage.
			localStorage.setItem('catalyst-orders', JSON.stringify(v));
		});
	});
	onDestroy(() => {
		// Unsubscribe from the orders subscription.
		if (ordersSubscription) {
			ordersSubscription();
		}
	});

	// Manage Deposit Variables
	const depositAction = writable<'deposit' | 'withdraw'>('deposit');
	const activeAsset = writable<coin>('usdc');
	const inputValue = writable(0);

	let forceUpdate: () => void;
	const updatedDerived = readable(0, (set) => {
		let value = 0;
		forceUpdate = () => set((value += 1));
		setInterval(() => {
			set((value += 1));
		}, 10000);
	});

	const fillStatus: Readable<boolean[]> = derived([orders, updatedDerived], ([orders, _], set) => {
		const largePromise = Promise.all(
			orders.map(({ order }) => {
				const orderId = getOrderId(order);
				const outputs = order.outputs;
				return Promise.all(
					outputs.map((output) => {
						return checkIfFilled(orderId, output);
					})
				);
			})
		);
		largePromise.then((orderFillStatuses) => {
			set(
				orderFillStatuses.map((order) => {
					return order.every((v) => v === BYTES32_ZERO);
				})
			);
		});
	});

	// Derive relevant wallet balances.
	const compactAllocator = writable(DEFAULT_ALLOCATOR);
	const depositBalance: Readable<number> = derived(
		[activeWallet, activeChain, activeAsset, updatedDerived],
		([activeWallet, activeChain, activeAsset, _], set) => {
			if (!activeWallet) set(0);
			if (activeWallet) {
				const asset = coinMap[activeChain][activeAsset];
				const accountAddress = activeWallet.accounts[0].address;
				if (asset === ADDRESS_ZERO) {
					clients[activeChain]
						.getBalance({
							address: accountAddress,
							blockTag: 'latest'
						})
						.then((v) => {
							set(Number(v));
						});
				} else {
					clients[activeChain]
						?.readContract({
							address: asset,
							abi: ERC20_ABI,
							functionName: 'balanceOf',
							args: [accountAddress]
						})
						.then((v) => {
							set(Number(v));
						});
				}
			}
		}
	);
	const compactDepositedBalance: Readable<number> = derived(
		[activeWallet, activeChain, activeAsset, compactAllocator, updatedDerived],
		([activeWallet, activeChain, activeAsset, compactAllocator, _], set) => {
			if (!activeWallet) set(0);
			if (activeWallet) {
				const asset = coinMap[activeChain][activeAsset];
				const assetId = toId(true, ResetPeriod.OneDay, compactAllocator, asset);
				const accountAddress = activeWallet.accounts[0].address;
				clients[activeChain]
					?.readContract({
						address: COMPACT,
						abi: COMPACT_ABI,
						functionName: 'balanceOf',
						args: [accountAddress, assetId]
					})
					.then((v) => {
						set(Number(v));
					});
			}
		}
	);
	const allowance: Readable<number> = derived(
		[activeWallet, activeChain, activeAsset, updatedDerived],
		([activeWallet, activeChain, activeAsset, _], set) => {
			if (!activeWallet) set(0);
			if (activeWallet) {
				const asset = coinMap[activeChain][activeAsset];
				if (asset == ADDRESS_ZERO) {
					return set(Number(maxUint256));
				}
				const accountAddress = activeWallet.accounts[0].address;
				clients[activeChain]
					?.readContract({
						address: asset,
						abi: ERC20_ABI,
						functionName: 'allowance',
						args: [accountAddress, COMPACT]
					})
					.then((v) => {
						set(Number(v));
					});
			}
		}
	);
	// Convert into formatted values for display
	$: formattedDeposit = $depositBalance / 10 ** decimalMap[$activeAsset];
	$: formattedCompactDepositedBalance = $compactDepositedBalance / 10 ** decimalMap[$activeAsset];
	$: formattedAllowance = $allowance / 10 ** decimalMap[$activeAsset];

	// Execute Transaction Variables
	const buyAmount = writable(0);
	const destinationChain = writable<chain>('baseSepolia');
	const destinationAsset = writable<coin>('usdc');
	const verifier = writable<verifiers>('polymer');

	// Error definition.
	$: depositAndSwapInputError =
		chains.findIndex((c) => c == $activeChain) == -1
			? 1
			: 0 + chains.findIndex((c) => c == $destinationChain) == -1
				? 2
				: 0 + getCoins($activeChain).findIndex((c) => c == $activeAsset) == -1
					? 10
					: 0 + getCoins($destinationChain).findIndex((c) => c == $destinationAsset) == -1
						? 20
						: 0 + $inputValue > formattedDeposit
							? 100
							: 0;
	$: swapInputError =
		chains.findIndex((c) => c == $activeChain) == -1
			? 1
			: 0 + chains.findIndex((c) => c == $destinationChain) == -1
				? 2
				: 0 + getCoins($activeChain).findIndex((c) => c == $activeAsset) == -1
					? 10
					: 0 + getCoins($destinationChain).findIndex((c) => c == $destinationAsset) == -1
						? 20
						: 0 + $inputValue > formattedCompactDepositedBalance
							? 100
							: 0;
	$: depositInputError =
		chains.findIndex((c) => c == $activeChain) == -1
			? 1
			: 0 + getCoins($activeChain).findIndex((c) => c == $activeAsset) == -1
				? 10
				: 0 + $inputValue >
					  ($depositAction === 'deposit' ? formattedDeposit : formattedCompactDepositedBalance)
					? 100
					: 0;

	function setWalletToCorrectChain(chain: chain = $activeChain) {
		if ($activeChain !== chain) {
			$activeChain = chain;
		}
		return $walletClient.switchChain({ id: chainMap[chain].id });
	}

	/// -- Compact -- ///

	async function deposit() {
		await setWalletToCorrectChain();
		const asset = coinMap[$activeChain][$activeAsset];
		const lockTag: `0x${string}` = `0x${toHex(
			toId(true, ResetPeriod.OneDay, $compactAllocator, ADDRESS_ZERO),
			{
				size: 32
			}
		)
			.replace('0x', '')
			.slice(0, 24)}`;
		console.log({ lockTag, id: toId(true, ResetPeriod.OneDay, $compactAllocator, ADDRESS_ZERO) });
		const amount = toBigIntWithDecimals($inputValue, decimalMap[$activeAsset]);
		const recipient = ADDRESS_ZERO; // This means sender.

		if (asset === ADDRESS_ZERO) {
			return $walletClient.writeContract({
				account: connectedAccount.address,
				address: COMPACT,
				abi: COMPACT_ABI,
				functionName: 'depositNative',
				value: amount,
				args: [lockTag, recipient]
			});
		} else {
			return $walletClient.writeContract({
				account: connectedAccount.address,
				address: COMPACT,
				abi: COMPACT_ABI,
				functionName: 'depositERC20',
				args: [asset, lockTag, amount, recipient]
			});
		}
	}

	async function withdraw() {
		await setWalletToCorrectChain();
		const asset = coinMap[$activeChain][$activeAsset];
		const assetId = toId(true, ResetPeriod.OneDay, $compactAllocator, asset);
		const amount = toBigIntWithDecimals($inputValue, decimalMap[$activeAsset]);

		const allocatedTransferStruct: {
			allocatorData: `0x${string}`;
			nonce: bigint;
			expires: bigint;
			id: bigint;
			recipients: {
				claimant: bigint;
				amount: bigint;
			}[];
		} = {
			allocatorData: '0x', // TODO: Get from allocator
			nonce: BigInt(Math.floor(Math.random() * 2 ** 32)),
			expires: maxInt32, // TODO:
			id: assetId,
			recipients: [{ claimant: BigInt(addressToBytes32(connectedAccount.address)), amount }]
		};

		return $walletClient.writeContract({
			account: connectedAccount.address,
			address: COMPACT,
			abi: COMPACT_ABI,
			functionName: 'allocatedTransfer',
			args: [allocatedTransferStruct]
		});
	}

	async function approve() {
		await setWalletToCorrectChain();
		const asset = coinMap[$activeChain][$activeAsset];
		const transactionHash = $walletClient.writeContract({
			account: connectedAccount.address,
			address: asset,
			abi: ERC20_ABI,
			functionName: 'approve',
			args: [COMPACT, maxUint256]
		});

		await clients[$activeChain].waitForTransactionReceipt({
			hash: await transactionHash
		});
		forceUpdate();
		return transactionHash;
	}

	// --- Catalyst Orders --- //

	function createOrder() {
		const inputAsset = coinMap[$activeChain][$activeAsset];
		const inputTokenId = toId(true, ResetPeriod.OneDay, $compactAllocator, inputAsset);
		// Make Inputs
		const amount = toBigIntWithDecimals($inputValue, decimalMap[$activeAsset]);
		const input: [bigint, bigint] = [inputTokenId, amount];
		const inputs = [input];

		const remoteFiller = COIN_FILLER;
		const remoteOracle = getOracle($verifier, $destinationChain)!;
		const localOracle = getOracle($verifier, $activeChain)!;

		const bigintBuyAmount = toBigIntWithDecimals($buyAmount, decimalMap[$destinationAsset]);
		// Make Outputs
		const output: MandateOutput = {
			remoteOracle: addressToBytes32(remoteOracle),
			remoteFiller: addressToBytes32(remoteFiller),
			chainId: BigInt(chainMap[$destinationChain].id),
			token: addressToBytes32(coinMap[$destinationChain][$destinationAsset]),
			amount: bigintBuyAmount,
			recipient: addressToBytes32(connectedAccount.address),
			remoteCall: '0x',
			fulfillmentContext: '0x'
		};
		const outputs = [output];

		// Make order
		const order: StandardOrder = {
			user: connectedAccount.address,
			nonce: BigInt(Math.floor(Math.random() * 2 ** 32)), // Random nonce
			originChainId: BigInt(chainMap[$activeChain].id),
			fillDeadline: Number(maxInt32), // TODO:
			expires: Number(maxInt32), //  TODO:
			localOracle: localOracle,
			inputs: inputs,
			outputs: outputs
		};
		const mandate: CompactMandate = {
			fillDeadline: order.fillDeadline,
			localOracle: order.localOracle,
			outputs: order.outputs
		};

		const batchCompact: BatchCompact = {
			arbiter: CATALYST_SETTLER,
			sponsor: order.user,
			nonce: order.nonce,
			expires: order.expires,
			idsAndAmounts: order.inputs,
			mandate
		};

		return { order, batchCompact };
	}

	async function swap() {
		await setWalletToCorrectChain();
		const { order, batchCompact } = createOrder();

		const signaturePromise = $walletClient.signTypedData({
			account: connectedAccount.address,
			domain: {
				name: 'The Compact',
				version: '1',
				chainId: chainMap[$activeChain].id,
				verifyingContract: COMPACT
			} as const,
			types: compactTypes,
			primaryType: 'BatchCompact',
			message: batchCompact
		});
		const signature = await signaturePromise;

		console.log({ order, batchCompact, signature });
		orders.update((o) => [...o, { order, signature }]);

		// const submitOrderResponse = await submitOrder({
		// 	orderType: 'CatalystCompactOrder',
		// 	order,
		// 	sponsorSigature: signature,
		// 	quote: {
		// 		fromAsset: $activeAsset,
		// 		toAsset: $destinationAsset,
		// 		fromPrice: '1',
		// 		toPrice: '1',
		// 		intermediary: '1',
		// 		discount: '1'
		// 	}
		// });

		// console.log({ submitOrderResponse });
	}

	async function depositAndSwap() {
		await setWalletToCorrectChain();
		const { order, batchCompact } = createOrder();
		const claimHash = hashStruct({
			data: batchCompact,
			types: compactTypes,
			primaryType: 'BatchCompact'
		});
		const typeHash = compact_type_hash;

		const asset = coinMap[$activeChain][$activeAsset];
		// Generate the locktag. We use the toId function and then discard the rightmost 20 bytes.
		const lockTag: `0x${string}` = `0x${toHex(
			toId(true, ResetPeriod.OneDay, $compactAllocator, ADDRESS_ZERO),
			{
				size: 32
			}
		)
			.replace('0x', '')
			.slice(0, 24)}`;
		// Remember to subtract existing deposited value
		let transactionHash;
		const trueInputValue = $inputValue - formattedCompactDepositedBalance;
		if (trueInputValue <= 0) {
			transactionHash = $walletClient.writeContract({
				account: connectedAccount.address,
				address: COMPACT,
				abi: COMPACT_ABI,
				functionName: 'register',
				args: [claimHash, typeHash]
			});
		} else {
			const amount = toBigIntWithDecimals(trueInputValue, decimalMap[$activeAsset]);
			transactionHash =
				asset === ADDRESS_ZERO
					? $walletClient.writeContract({
							account: connectedAccount.address,
							address: COMPACT,
							abi: COMPACT_ABI,
							functionName: 'depositNativeAndRegister',
							value: amount,
							args: [lockTag, claimHash, typeHash]
						})
					: $walletClient.writeContract({
							account: connectedAccount.address,
							address: COMPACT,
							abi: COMPACT_ABI,
							functionName: 'depositERC20AndRegister',
							args: [asset, lockTag, amount, claimHash, typeHash]
						});
		}

		await clients[$activeChain].waitForTransactionReceipt({
			hash: await transactionHash
		});

		const signature = '0x';
		// Needs to be sent to the Catalyst order server:
		console.log({ order, batchCompact, signature });
		orders.update((o) => [...o, { order, signature }]);

		forceUpdate();
		return;
	}

	function getOrderId(order: StandardOrder) {
		return keccak256(
			encodePacked(
				[
					'uint256',
					'address',
					'address',
					'uint256',
					'uint32',
					'uint32',
					'address',
					'uint256[2][]',
					'bytes'
				],
				[
					order.originChainId,
					CATALYST_SETTLER,
					order.user,
					order.nonce,
					order.expires,
					order.fillDeadline,
					order.localOracle,
					order.inputs,
					encodeAbiParameters(
						parseAbiParameters(
							'(bytes32 remoteOracle, bytes32 remoteFiller, uint256 chainId, bytes32 token, uint256 amount, bytes32 recipient, bytes remoteCall, bytes fulfillmentContext)[]'
						),
						[order.outputs]
					)
				]
			)
		);
	}
	function getOutputHash(output: MandateOutput) {
		return keccak256(
			encodePacked(
				[
					'bytes32',
					'bytes32',
					'uint256',
					'bytes32',
					'uint256',
					'bytes32',
					'uint16',
					'bytes',
					'uint16',
					'bytes'
				],
				[
					output.remoteOracle,
					output.remoteFiller,
					output.chainId,
					output.token,
					output.amount,
					output.recipient,
					output.remoteCall.replace('0x', '').length / 2,
					output.remoteCall,
					output.fulfillmentContext.replace('0x', '').length / 2,
					output.fulfillmentContext
				]
			)
		);
	}

	function encodeMandateOutput(
		solver: `0x${string}`,
		orderId: `0x${string}`,
		timestamp: number,
		output: MandateOutput
	) {
		return encodePacked(
			[
				'bytes32',
				'bytes32',
				'uint32',
				'bytes32',
				'uint256',
				'bytes32',
				'uint16',
				'bytes',
				'uint16',
				'bytes'
			],
			[
				solver,
				orderId,
				timestamp,
				output.token,
				output.amount,
				output.recipient,
				output.remoteCall.replace('0x', '').length / 2,
				output.remoteCall,
				output.fulfillmentContext.replace('0x', '').length / 2,
				output.fulfillmentContext
			]
		);
	}

	async function checkIfFilled(orderId: `0x${string}`, output: MandateOutput) {
		const outputHash = getOutputHash(output);
		const destinationChain = getChainName(Number(output.chainId))!;
		return await clients[destinationChain].readContract({
			address: bytes32ToAddress(output.remoteFiller),
			abi: COIN_FILLER_ABI,
			functionName: 'filledOutputs',
			args: [orderId, outputHash]
		});
	}

	async function checkIfValidated(
		order: StandardOrder,
		outputIndex: number = 1,
		transactionHash: `0x${string}`
	) {
		if (!transactionHash || !transactionHash.startsWith('0x') || transactionHash.length != 66)
			return false;
		const output = order.outputs[outputIndex]; // TODO: check all outputs at the same time.
		const destinationChain = getChainName(Number(output.chainId))!;
		const transactionReceipt = await clients[destinationChain].getTransactionReceipt({
			hash: transactionHash
		});
		const blockHashOfFill = transactionReceipt.blockHash;
		const block = await clients[destinationChain].getBlock({
			blockHash: blockHashOfFill
		});
		const fillTimestamp = block.timestamp;
		const orderId = getOrderId(order);
		const encodedOutput = encodeMandateOutput(
			addressToBytes32(connectedAccount.address),
			orderId,
			Number(fillTimestamp),
			output
		);
		const sourceChain = getChainName(Number(order.originChainId))!;
		const outputHash = keccak256(encodedOutput);
		return await clients[sourceChain].readContract({
			address: order.localOracle,
			abi: POLYMER_ORACLE_ABI,
			functionName: 'isProven',
			args: [output.chainId, output.remoteOracle, output.remoteFiller, outputHash]
		});
	}

	async function checkIfClaimed(order: StandardOrder, _: any) {
		const sourceChain = getChainName(Number(order.originChainId))!;
		// Get the allocator address:
		const [token, allocator, resetPeriod, scope] = await clients[sourceChain].readContract({
			address: COMPACT,
			abi: COMPACT_ABI,
			functionName: 'getLockDetails',
			args: [order.inputs[0][0]]
		});
		return await clients[sourceChain].readContract({
			address: COMPACT,
			abi: COMPACT_ABI,
			functionName: 'hasConsumedAllocatorNonce',
			args: [order.nonce, allocator]
		});
	}

	function fill(order: StandardOrder, index: number) {
		return async () => {
			const orderId = getOrderId(order);
			//Check that only 1 output exists.
			if (order.outputs.length !== 1) {
				throw new Error('Order must have exactly one output');
			}
			// The destination asset cannot be ETH.
			const output = order.outputs[0];
			if (output.token === BYTES32_ZERO) {
				throw new Error('Output token cannot be ETH');
			}
			await setWalletToCorrectChain(getChainName(Number(output.chainId))!);

			// Check allowance & set allowance if needed
			const assetAddress = bytes32ToAddress(output.token);
			const allowance = await clients[$activeChain].readContract({
				address: assetAddress,
				abi: ERC20_ABI,
				functionName: 'allowance',
				args: [connectedAccount.address, bytes32ToAddress(output.remoteFiller)]
			});
			if (BigInt(allowance) < output.amount) {
				const approveTransaction = await $walletClient.writeContract({
					account: connectedAccount.address,
					address: assetAddress,
					abi: ERC20_ABI,
					functionName: 'approve',
					args: [bytes32ToAddress(output.remoteFiller), maxUint256]
				});
				await clients[getChainName(Number(output.chainId))!].waitForTransactionReceipt({
					hash: approveTransaction
				});
			}

			const transcationHash = await $walletClient.writeContract({
				account: connectedAccount.address,
				address: bytes32ToAddress(output.remoteFiller),
				abi: COIN_FILLER_ABI,
				functionName: 'fillBatch',
				args: [
					order.fillDeadline,
					orderId,
					order.outputs,
					addressToBytes32(connectedAccount.address)
				]
			});
			await clients[getChainName(Number(output.chainId))!].waitForTransactionReceipt({
				hash: transcationHash
			});
			orderInputs.validate[index] = transcationHash;
			forceUpdate();
			return transcationHash;
		};
	}

	function submit(order: StandardOrder, timestamp: number) {
		return async () => {
			//Check that only 1 output exists.
			if (order.outputs.length !== 1) {
				throw new Error('Order must have exactly one output');
			}
			// The destination asset cannot be ETH.
			const output = order.outputs[0];
			const remoteOracle = bytes32ToAddress(output.remoteOracle);

			await setWalletToCorrectChain(getChainName(Number(output.chainId))!);

			const orderId = getOrderId(order);
			// Lookup timestamp on-chain
			const encodedOutput = encodeMandateOutput(
				addressToBytes32(connectedAccount.address),
				orderId,
				timestamp,
				output
			);
			const payload: `0x${string}`[] = [encodedOutput];
			console.log({ payload });
			if (remoteOracle === WORMHOLE_ORACLE[getChainName(Number(output.chainId))!]) {
				return $walletClient.writeContract({
					account: connectedAccount.address,
					address: remoteOracle,
					abi: WROMHOLE_ORACLE_ABI,
					functionName: 'submit',
					args: [bytes32ToAddress(output.remoteFiller), payload]
				});
			}
			throw new Error('Remote oracle is not supported');
		};
	}

	function validate(order: StandardOrder, fillTransactionHash: string) {
		return async () => {
			const sourceChain = getChainName(Number(order.originChainId))!;
			const destinationChain = getChainName(Number(order.outputs[0].chainId))!;
			if (order.outputs.length !== 1) {
				throw new Error('Order must have exactly one output');
			}
			// The destination asset cannot be ETH.
			const output = order.outputs[0];

			if (order.localOracle === getOracle('polymer', sourceChain)) {
				const transactionReceipt = await clients[destinationChain].getTransactionReceipt({
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
					const dat = response.data as { proof: undefined | string; polymerIndex: number };
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
					await setWalletToCorrectChain(sourceChain);

					const transcationHash = await $walletClient.writeContract({
						account: connectedAccount.address,
						address: order.localOracle,
						abi: POLYMER_ORACLE_ABI,
						functionName: 'receiveMessage',
						args: [`0x${proof.replace('0x', '')}`]
					});

					const result = await clients[sourceChain].waitForTransactionReceipt({
						hash: transcationHash
					});
					forceUpdate();
					return result;
				}
			}

			if (order.localOracle === getOracle('wormhole', sourceChain)) {
				// TODO: get sequence from event.
				const sequence = 0;
				// Get VAA
				const wormholeChainId = wormholeChainIds[destinationChain];
				const requestUrl = `https://api.testnet.wormholescan.io/v1/signed_vaa/${wormholeChainId}/${output.remoteOracle.replace('0x', '')}/${sequence}?network=Testnet`;
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

	function claim(order: StandardOrder, signature: `0x${string}`, fillTransactionHash: string) {
		return async () => {
			console.log({ signature });
			const destinationChain = getChainName(Number(order.outputs[0].chainId))!;
			if (order.outputs.length !== 1) {
				throw new Error('Order must have exactly one output');
			}
			const transactionReceipt = await clients[destinationChain].getTransactionReceipt({
				hash: fillTransactionHash as `0x${string}`
			});
			const blockHashOfFill = transactionReceipt.blockHash;
			const block = await clients[destinationChain].getBlock({
				blockHash: blockHashOfFill
			});
			const fillTimestamp = block.timestamp;

			const sourceChain = getChainName(Number(order.originChainId))!;
			await setWalletToCorrectChain(sourceChain);

			const combinedSignatures = encodeAbiParameters(
				parseAbiParameters(['bytes', 'bytes']),
				[signature, '0x' as `0x${string}`] // TODO: allocator signature
			);

			const transcationHash = await $walletClient.writeContract({
				account: connectedAccount.address,
				address: CATALYST_SETTLER,
				abi: SETTLER_COMPACT_ABI,
				functionName: 'finaliseSelf',
				args: [
					order,
					combinedSignatures,
					[Number(fillTimestamp)],
					addressToBytes32(connectedAccount.address)
				]
			});
			const result = await clients[sourceChain].waitForTransactionReceipt({
				hash: transcationHash
			});
			forceUpdate();
			return result;
		};
	}

	const orderInputs: { submit: number[]; validate: string[] } = { submit: [], validate: [] };
</script>

<main class="main">
	<h1 class="pt-3 text-center align-middle text-xl font-medium">Resource lock intents using OIF</h1>
	<div class="mx-auto flex flex-col px-4 pt-2 md:max-w-10/12 md:flex-row md:px-8 md:pt-3">
		<div class="px-2">
			<p>
				This webapp demonstrates an
				<a
					class="font-bold text-blue-700 hover:text-blue-500"
					href="https://github.com/openintentsframework/oif-contracts">Open Intents Framework</a
				>
				implementation using
				<a
					class="font-bold text-blue-700 hover:text-blue-500"
					href="https://github.com/Uniswap/the-compact/tree/v1">The Compact</a
				>
				Resource Locks. This app currently supports two flows:
			</p>

			<ul class="list-inside list-disc">
				<li>Swaps using existing deposits (off-chain signature-based settlement)</li>
				<li>Swaps with on-chain deposit and registration (transaction-based resource locking)</li>
			</ul>

			<p>
				A third, currently unimplemented, flow leverages
				<a class="text-blue-700 hover:text-blue-500" href="https://github.com/Uniswap/permit2"
					>permit2</a
				>
				to enable gasless on-chain deposits and registration—providing a smooth user experience without
				requiring user-initiated transactions.
			</p>

			<br />

			<h3 class="font-semibold">Why Resource Locks?</h3>
			<p>
				Resource Locks improve asset availability guarantees in cross-chain contexts and asynchronous
				environments, offering several key advantages:
			</p>

			<ul class="list-inside list-disc">
				<li>Funds are only debited after successful delivery has been proven.</li>
				<li>
					Enables efficient short-lived interactions—intents can expire within seconds without consequence.
				</li>
				<li>No upfront deposit or initiation transaction are required.</li>
				<li>Fully composable with other protocols and settlement layers.</li>
			</ul>

			<p>
				Learn more about
				<a
					class="text-blue-700 hover:text-blue-500"
					href="https://docs.catalyst.exchange/knowledge/resource-locks/">Resource Locks</a
				>.
			</p>

			<br />

			<h3 class="font-semibold">Why the Open Intents Framework?</h3>
			<p>
				The Open Intents Framework (OIF) is an open coordination layer for standardizing and scaling
				intent-based workflows across chains. The goal is to:
			</p>

			<ul class="list-inside list-disc">
				<li>Standardise cross-chain interactions.</li>
				<li>Define a permissionless intent implementation that can scale across all chains.</li>
				<li>Create a reference implementation for cross-chain solvers & searchers.</li>
				<li>Provide tooling for wallet and app developers.</li>
			</ul>
			<p>
				Learn more about
				<a class="text-blue-700 hover:text-blue-500" href="https://openintents.xyz"
					>Open Intents Framework</a
				>.
			</p>
		</div>

		<div class="flex w-[128rem] flex-col justify-items-center align-middle">
			<form class="w-full space-y-4 rounded-md border border-gray-200 bg-gray-50 p-4">
				<h1 class="text-xl font-medium">Manage Compact</h1>
				<div class="flex flex-row space-x-2">
					<h1 class="text-md font-medium">Allocator</h1>
					<input type="text" class="w-96 rounded border px-2 py-1" bind:value={$compactAllocator} />
				</div>
				<div class="flex flex-wrap items-center justify-start gap-2">
					<select id="in-asset" class="rounded border px-2 py-1" bind:value={$depositAction}>
						<option value="deposit" selected>Deposit</option>
						<option value="withdraw">Withdraw</option>
					</select>
					<input type="number" class="w-20 rounded border px-2 py-1" bind:value={$inputValue} />
					<span>of</span>
					{#if $depositAction === 'withdraw'}
						<input
							type="text"
							class="w-20 rounded border border-gray-800 bg-gray-50 px-2 py-1"
							disabled
							value={formattedCompactDepositedBalance}
						/>
					{:else}
						<input
							type="text"
							class="w-20 rounded border border-gray-800 bg-gray-50 px-2 py-1"
							disabled
							value={formattedDeposit}
						/>
					{/if}
					<select id="deposit-chain" class="rounded border px-2 py-1" bind:value={$activeChain}>
						<option value="sepolia" selected>Sepolia</option>
						<option value="baseSepolia">Base Sepolia</option>
						<option value="optimismSepolia">Optimism Sepolia</option>
					</select>
					<select id="deposit-asset" class="rounded border px-2 py-1" bind:value={$activeAsset}>
						{#each getCoins($activeChain) as coin (coin)}
							<option value={coin} selected={coin === $activeAsset}>{coin.toUpperCase()}</option>
						{/each}
					</select>
				</div>

				<!-- Action Button -->
				<div class="flex justify-center">
					{#if !connectedAccount}
						<AwaitButton buttonFunction={() => onboard.connectWallet()}>
							{#snippet name()}
								Connect Wallet
							{/snippet}
							{#snippet awaiting()}
								Waiting for wallet...
							{/snippet}
						</AwaitButton>
					{:else if depositInputError}
						<button
							type="button"
							class="rounded border bg-gray-200 px-4 text-xl text-gray-600"
							disabled
						>
							Input not valid {depositInputError}
						</button>
					{:else if formattedAllowance < $inputValue}
						<AwaitButton buttonFunction={approve}>
							{#snippet name()}
								Set allowance
							{/snippet}
							{#snippet awaiting()}
								Waiting for transaction...
							{/snippet}
						</AwaitButton>
					{:else if $depositAction === 'withdraw'}
						<AwaitButton buttonFunction={withdraw}>
							{#snippet name()}
								Withdraw
							{/snippet}
							{#snippet awaiting()}
								Waiting for transaction...
							{/snippet}
						</AwaitButton>
					{:else}
						<AwaitButton buttonFunction={deposit}>
							{#snippet name()}
								Execute deposit
							{/snippet}
							{#snippet awaiting()}
								Waiting for transaction...
							{/snippet}
						</AwaitButton>
					{/if}
				</div>
			</form>
			<SwapForm
				{activeChain}
				outputChain={destinationChain}
				{activeAsset}
				outputAsset={destinationAsset}
				{inputValue}
				outputValue={buyAmount}
				{verifier}
				executeFunction={swap}
				approveFunction={approve}
				showApprove={false}
				showError={swapInputError}
				showConnect={!connectedAccount}
				balance={formattedCompactDepositedBalance}
			>
				{#snippet title()}
					Sign Intent with Deposit
				{/snippet}
				{#snippet executeName()}
					Sign BatchCompact
				{/snippet}
			</SwapForm>
			<SwapForm
				{activeChain}
				outputChain={destinationChain}
				{activeAsset}
				outputAsset={destinationAsset}
				{inputValue}
				outputValue={buyAmount}
				{verifier}
				executeFunction={depositAndSwap}
				approveFunction={approve}
				showApprove={formattedAllowance < $inputValue}
				showError={depositAndSwapInputError}
				showConnect={!connectedAccount}
				balance={formattedDeposit + formattedCompactDepositedBalance}
			>
				{#snippet title()}
					Execute Deposit and Register Intent
				{/snippet}
				{#snippet executeName()}
					Execute depositAndRegister
				{/snippet}
			</SwapForm>
		</div>
	</div>
	<!-- Make a table to display orders from users -->
	<div class="mx-auto mt-3 w-11/12 rounded-md p-4">
		<table class="min-w-full table-auto overflow-hidden rounded-lg border border-gray-200">
			<thead class="bg-gray-100 text-left">
				<tr>
					<th class="px-4 py-2 text-sm font-medium text-gray-700">OrderId</th>
					<th class="px-4 py-2 text-sm font-medium text-gray-700">User</th>
					<th class="px-4 py-2 text-sm font-medium text-gray-700">From</th>
					<th class="px-4 py-2 text-sm font-medium text-gray-700">To</th>
					<th class="px-4 py-2 text-sm font-medium text-gray-700">Input</th>
					<th class="px-4 py-2 text-sm font-medium text-gray-700">Output</th>
					<th class="px-4 py-2 text-sm font-medium text-gray-700">Fill</th>
					<th class="px-4 py-2 text-sm font-medium text-gray-700">Submit</th>
					<th class="px-4 py-2 text-sm font-medium text-gray-700">Validate</th>
					<th class="px-4 py-2 text-sm font-medium text-gray-700">Claim</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200">
				{#each $orders.filter(({ order }) => order.inputs.length === 1 && order.outputs.length === 1) as { order, signature }, index (getOrderId(order))}
					<tr class="hover:bg-gray-50">
						<td class="px-4 py-2 text-sm text-gray-800">{getOrderId(order).slice(2, 8)}...</td>
						<td class="px-4 py-2 text-sm text-gray-800">{trunc(order.user as `0x${string}`)}</td>
						<td class="px-4 py-2 text-sm text-gray-800"
							>{getChainName(Number(order.originChainId))}</td
						>
						<td class="px-4 py-2 text-sm text-gray-800"
							>{getChainName(Number(order.outputs[0].chainId))}</td
						>
						<td class="px-4 py-2 text-sm text-gray-800">
							{order.inputs
								.map(
									([token, amount]) =>
										`${getTokenKeyByAddress(getChainName(Number(order.originChainId))!, idToToken(token))}: ${formatTokenDecmials(amount, getTokenKeyByAddress(getChainName(Number(order.originChainId))!, idToToken(token))!)}`
								)
								.join(', ')}
						</td>
						<td class="px-4 py-2 text-sm text-gray-800">
							{order.outputs
								.map(
									({ token, amount }) =>
										`${getTokenKeyByAddress(getChainName(Number(order.outputs[0].chainId))!, idToToken(token as `0x${string}`))}: ${formatTokenDecmials(amount, getTokenKeyByAddress(getChainName(Number(order.outputs[0].chainId))!, idToToken(token as `0x${string}`))!)}`
								)
								.join(', ')}
						</td>
						<td class="flex">
							{#if $fillStatus?.length >= index && $fillStatus[index]}
								<AwaitButton buttonFunction={fill(order, index)}>
									{#snippet name()}
										Fill
									{/snippet}
									{#snippet awaiting()}
										Waiting for transaction...
									{/snippet}
								</AwaitButton>
							{:else}
								<button
									type="button"
									class="rounded border px-4 text-xl font-bold text-gray-300"
									disabled
								>
									Filled
								</button>
							{/if}
						</td>
						<td>
							{#if (Object.values(POLYMER_ORACLE) as string[]).includes(order.localOracle)}
								<div class="text-center">-</div>
							{:else}
								<input
									type="number"
									class="w-32 rounded border px-2 py-1"
									placeholder="fillTransactionHash"
									bind:value={orderInputs.submit[index]}
								/>
								<AwaitButton buttonFunction={submit(order, orderInputs.submit[index])}>
									{#snippet name()}
										Submit
									{/snippet}
									{#snippet awaiting()}
										Waiting for transaction...
									{/snippet}
								</AwaitButton>
							{/if}
						</td>
						<td class="flex pt-0.5">
							<input
								type="text"
								class="h-8 w-28 rounded-l border-y border-l px-2"
								placeholder="validateContext"
								bind:value={orderInputs.validate[index]}
							/>
							{#await checkIfValidated(order, $updatedDerived * 0, orderInputs.validate[index] as `0x${string}`)}
								<button
									type="button"
									class="h-8 rounded-r border px-4 text-xl font-bold text-gray-300"
									disabled
								>
									Fetching...
								</button>
							{:then isValidated}
								{#if isValidated}
									<button
										type="button"
										class="h-8 rounded-r border px-4 text-xl font-bold text-gray-300"
										disabled
									>
										Validated
									</button>
								{:else}
									<AwaitButton
										baseClass="rounded-r border px-4 h-8 text-xl font-bold"
										buttonFunction={validate(order, orderInputs.validate[index])}
									>
										{#snippet name()}
											Validate
										{/snippet}
										{#snippet awaiting()}
											Waiting for transaction...
										{/snippet}
									</AwaitButton>
								{/if}
							{:catch}
								<AwaitButton
									baseClass="rounded-r border px-4 h-8 text-xl font-bold"
									buttonFunction={validate(order, orderInputs.validate[index])}
								>
									{#snippet name()}
										Validate
									{/snippet}
									{#snippet awaiting()}
										Waiting for transaction...
									{/snippet}
								</AwaitButton>
							{/await}
						</td>
						<td>
							{#await checkIfClaimed(order, $updatedDerived)}
								<button
									type="button"
									class="h-8 rounded-r border px-4 text-xl font-bold text-gray-300"
									disabled
								>
									Fetching...
								</button>
							{:then isValidated}
								{#if isValidated}
									<button
										type="button"
										class="h-8 rounded-r border px-4 text-xl font-bold text-gray-300"
										disabled
									>
										Claimed
									</button>
								{:else}
									<AwaitButton
										buttonFunction={claim(order, signature, orderInputs.validate[index])}
									>
										{#snippet name()}
											Claim
										{/snippet}
										{#snippet awaiting()}
											Waiting for transaction...
										{/snippet}
									</AwaitButton>
								{/if}
							{:catch}
								<AwaitButton buttonFunction={claim(order, signature, orderInputs.validate[index])}>
									{#snippet name()}
										Claim
									{/snippet}
									{#snippet awaiting()}
										Waiting for transaction...
									{/snippet}
								</AwaitButton>
							{/await}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</main>
