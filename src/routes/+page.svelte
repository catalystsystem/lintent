<script lang="ts">
	import onboard from '$lib/web3-onboard';
	import { compactDomain, compactTypes } from '$lib/typedMessage';
	import {
		createPublicClient,
		createWalletClient,
		custom,
		hashStruct,
		// hashType, // This function is not exported. Implemented below.
		hexToBigInt,
		http,
		keccak256,
		maxInt32,
		maxUint256,
		toHex,
		type PublicClient
	} from 'viem';
	import { sepolia, optimismSepolia, baseSepolia } from 'viem/chains';
	import { derived, readable, writable, type Readable, type Writable } from 'svelte/store';
	import type { WalletState } from '@web3-onboard/core';
	import { ERC20_ABI } from '$lib/abi/erc20';
	import { COMPACT_ABI } from '$lib/abi/compact';
	import { ResetPeriod, toId } from '$lib/IdLib';
	import AwaitButton from '$lib/AwaitButton.svelte';
	import type { BatchCompact, StandardOrder, CompactMandate, MandateOutput } from '../types';
	import { submitOrder } from '$lib/utils/api';
	import {
		ADDRESS_ZERO,
		COMPACT,
		CATALYST_SETTLER,
		DEFAULT_ALLOCATOR,
		ALWAYS_YES_ORACLE,
		COIN_FILLER,
		WORMHOLE_ORACLE,
		coinMap,
		decimalMap,
		getCoins,
		chainMap,
		chains,
		type chain,
		type coin
	} from '$lib/config';

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
	const publicClient = derived(activeChain, (activeChain) => {
		return createPublicClient({
			chain: chainMap[activeChain],
			transport: http()
		});
	});
	const walletClient = derived([activeChain, activeWallet], ([activeChain, activeWallet]) => {
		return createWalletClient({
			chain: chainMap[activeChain],
			transport: custom(activeWallet?.provider)
		});
	});

	// Orders
	const orders = writable<{ order: StandardOrder; signature: `0x${string}` }[]>([]);

	// Manage Deposit Variables
	const depositAction = writable<'deposit' | 'withdraw'>('deposit');
	const activeAsset = writable<coin>('eth');
	const inputValue = writable(0);

	// Derive relevant wallet balances.
	const compactAllocator = writable(DEFAULT_ALLOCATOR);
	const depositBalance: Readable<number> = derived(
		[activeWallet, activeChain, activeAsset],
		([activeWallet, activeChain, activeAsset], set) => {
			if (!activeWallet) set(0);
			if (activeWallet) {
				const asset = coinMap[activeChain][activeAsset];
				const accountAddress = activeWallet.accounts[0].address;
				if (asset === ADDRESS_ZERO) {
					$publicClient
						.getBalance({
							address: accountAddress,
							blockTag: 'latest'
						})
						.then((v) => {
							console.log(v);
							set(Number(v));
						});
				} else {
					$publicClient
						?.readContract({
							address: asset,
							abi: ERC20_ABI,
							functionName: 'balanceOf',
							args: [accountAddress]
						})
						.then((v) => {
							console.log(v);
							set(Number(v));
						});
				}
			}
		}
	);
	const compactDepositedBalance: Readable<number> = derived(
		[activeWallet, activeChain, activeAsset, compactAllocator],
		([activeWallet, activeChain, activeAsset, compactAllocator], set) => {
			if (!activeWallet) set(0);
			if (activeWallet) {
				const asset = coinMap[activeChain][activeAsset];
				const assetId = toId(true, ResetPeriod.OneDay, compactAllocator, asset);
				const accountAddress = activeWallet.accounts[0].address;
				$publicClient
					?.readContract({
						address: COMPACT,
						abi: COMPACT_ABI,
						functionName: 'balanceOf',
						args: [accountAddress, assetId]
					})
					.then((v) => {
						console.log(v);
						set(Number(v));
					});
			}
		}
	);
	const allowance: Readable<number> = derived(
		[activeWallet, activeChain, activeAsset],
		([activeWallet, activeChain, activeAsset], set) => {
			if (!activeWallet) set(0);
			if (activeWallet) {
				const asset = coinMap[activeChain][activeAsset];
				if (asset == ADDRESS_ZERO) {
					return set(Number(maxUint256));
				}
				const accountAddress = activeWallet.accounts[0].address;
				$publicClient
					?.readContract({
						address: asset,
						abi: ERC20_ABI,
						functionName: 'allowance',
						args: [COMPACT, accountAddress]
					})
					.then((v) => set(Number(v)));
			}
		}
	);
	// Convert into formatted values for display
	$: formattedDeposit = $depositBalance / 10 ** decimalMap[$activeAsset];
	$: formattedCompactDepositedBalance = $compactDepositedBalance / 10 ** decimalMap[$activeAsset];
	$: formattedAllowance = $allowance / 10 ** decimalMap[$activeAsset];

	// Execute Transaction Variables
	const buyValue = writable(0);
	const buyAmount = writable(0n);
	const destinationChain = writable<chain>('baseSepolia');
	const destinationAsset = writable<coin>('weth');
	const verifier = writable<'yes' | 'wormhole'>('yes');

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
	async function connect() {
		await onboard.connectWallet();
	}

	async function disconnect() {
		onboard.disconnectWallet({ label: $wallets?.[0]?.label });
	}

	function toBigIntWithDecimals(value: number, decimals: number): bigint {
		// Convert number to string in full precision
		const [intPart, decPart = ''] = value.toString().split('.');

		// Take up to `decimals` digits of the decimal part
		const truncatedDec = decPart.slice(0, decimals);

		// Pad the decimal part to ensure we have exactly `decimals` digits
		const paddedDec = truncatedDec.padEnd(decimals, '0');

		// Remove leading zeros from intPart just in case
		const normalizedInt = intPart.replace(/^(-?)0+(?=\d)/, '$1');

		// Combine parts
		const combined = (normalizedInt + paddedDec).replace('.', '');

		return BigInt(combined);
	}

	function setWalletToCorrectChain() {
		return $walletClient.switchChain({ id: chainMap[$activeChain].id });
	}

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
		return $walletClient.writeContract({
			account: connectedAccount.address,
			address: asset,
			abi: ERC20_ABI,
			functionName: 'approve',
			args: [COMPACT, maxUint256]
		});
	}

	function addressToBytes32(address: `0x${string}`): `0x${string}` {
		return `0x${address.replace('0x', '').padStart(64, '0')}`;
	}

	function createOrder() {
		const inputAsset = coinMap[$activeChain][$activeAsset];
		const inputTokenId = toId(true, ResetPeriod.OneDay, $compactAllocator, inputAsset);
		// Make Inputs
		const amount = toBigIntWithDecimals($inputValue, decimalMap[$activeAsset]);
		const input: [bigint, bigint] = [inputTokenId, amount];
		const inputs = [input];

		const remoteFiller = COIN_FILLER;
		const remoteOracle =
			$verifier === 'yes' ? ALWAYS_YES_ORACLE : WORMHOLE_ORACLE[$destinationChain];
		const localOracle = $verifier === 'yes' ? ALWAYS_YES_ORACLE : WORMHOLE_ORACLE[$activeChain];

		// Make Outputs
		const output: MandateOutput = {
			remoteOracle: addressToBytes32(remoteOracle),
			remoteFiller: addressToBytes32(remoteFiller),
			chainId: chainMap[$destinationChain].id,
			token: addressToBytes32(coinMap[$destinationChain][$destinationAsset]),
			amount: $buyAmount,
			recipient: addressToBytes32(connectedAccount.address),
			remoteCall: '',
			fulfillmentContext: ''
		};
		const outputs = [output];

		// Make order
		const order: StandardOrder = {
			user: connectedAccount.address,
			nonce: 0,
			originChainId: chainMap[$activeChain].id,
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

	const compact_type =
		'BatchCompact(address arbiter,address sponsor,uint256 nonce,uint256 expires,uint256[2][] idsAndAmounts,Mandate mandate)Mandate(uint32 fillDeadline,address localOracle,MandateOutput[] outputs)MandateOutput(bytes32 remoteOracle,bytes32 remoteFiller,uint256 chainId,bytes32 token,uint256 amount,bytes32 recipient,bytes remoteCall,bytes fulfillmentContext)' as const;
	const compact_type_hash = keccak256(toHex(compact_type));
	const compact_type_hash_contract =
		'0x3df4b6efdfbd05bc0129a40c10b9e80a519127db6100fb77877a4ac4ac191af7';
	if (compact_type_hash != compact_type_hash_contract)
		throw Error(
			`Computed typehash ${compact_type_hash} does not match expected ${compact_type_hash_contract}`
		);

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
		const amount = toBigIntWithDecimals($inputValue, decimalMap[$activeAsset]);

		const callPromise =
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

		await callPromise;
		const signature = '0x';
		// Needs to be sent to the Catalyst order server:
		console.log({ order, batchCompact, signature });
		orders.update((o) => [...o, { order, signature }]);
		return;
	}

	function trunc(value: `0x${string}`, length: number = 4): `0x${string}...${string}` {
		return `0x${value.replace('0x', '').slice(0, length)}...${value.replace('0x', '').slice(-length)}`;
	}
</script>

<main class="main">
	<header class="px-2">
		<h1 class="py-1 text-center align-middle text-xl font-medium">Catalyst Intent Issuer</h1>
		<p>
			This small webapp showcases how to issue Catalyst Intents. This demo uses the compact settler.
			This webapp supports two flows:
		</p>
		<ul class="list-inside list-disc">
			<li>Swaps using existing deposits (signature)</li>
			<li>Swaps using on-chain deposit & registration (transaction)</li>
		</ul>
		<p>
			A third unsupported flow uses permit2 to do an on-chain deposit & registration without user
			transactions.
		</p>
	</header>

	<div class="flex flex-col justify-items-center align-middle">
		<form class="mx-auto mt-3 space-y-4 rounded-md border p-4">
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
				<input type="number" class="w-24 rounded border px-2 py-1" bind:value={$inputValue} />
				<span>of</span>
				{#if $depositAction === 'withdraw'}
					<input
						type="text"
						class="w-24 rounded border border-gray-800 bg-gray-50 px-2 py-1"
						disabled
						value={formattedCompactDepositedBalance}
					/>
				{:else}
					<input
						type="text"
						class="w-24 rounded border border-gray-800 bg-gray-50 px-2 py-1"
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
			<div class="flex flex-col justify-center">
				{#if !connectedAccount}
					<AwaitButton buttonFunction={connect}>
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
							Execute Transaction
						{/snippet}
						{#snippet awaiting()}
							Waiting for transaction...
						{/snippet}
					</AwaitButton>
				{/if}
			</div>
		</form>

		<form class="mx-auto mt-3 space-y-4 rounded-md border p-4">
			<h1 class="text-xl font-medium">Sign Intent with Deposit</h1>
			<!-- Sell -->
			<div class="flex flex-wrap items-center justify-start gap-2">
				<span class="font-medium">Sell</span>
				<input type="number" class="w-24 rounded border px-2 py-1" bind:value={$inputValue} />
				<span>of</span>
				<input
					type="text"
					class="w-24 rounded border border-gray-800 bg-gray-50 px-2 py-1"
					disabled
					value={formattedCompactDepositedBalance}
				/>
				<select id="sell-chain" class="rounded border px-2 py-1" bind:value={$activeChain}>
					<option value="sepolia" selected>Sepolia</option>
					<option value="baseSepolia">Base Sepolia</option>
					<option value="optimismSepolia">Optimism Sepolia</option>
				</select>
				<select id="sell-asset" class="rounded border px-2 py-1" bind:value={$activeAsset}>
					{#each getCoins($activeChain) as coin (coin)}
						<option value={coin} selected={coin === $activeAsset}>{coin.toUpperCase()}</option>
					{/each}
				</select>
			</div>

			<!-- Swap button -->
			<div class="flex justify-center">
				<button type="button" class="px-4 text-xl font-bold text-gray-600 hover:text-blue-600">
					⇅
				</button>
			</div>

			<!-- Buy -->
			<div class="flex flex-wrap items-center justify-start gap-2">
				<span class="font-medium">Buy</span>
				<input type="number" class="w-24 rounded border px-2 py-1" bind:value={$buyValue} />
				<select id="buy-chain" class="rounded border px-2 py-1" bind:value={$destinationChain}>
					<option value="sepolia">Sepolia</option>
					<option value="baseSepolia" selected>Base Sepolia</option>
					<option value="optimismSepolia">Optimism Sepolia</option>
				</select>
				<select id="buy-asset" class="rounded border px-2 py-1" bind:value={$destinationAsset}>
					{#each getCoins($destinationChain).filter((v) => v !== "eth") as coin (coin)}
						<option value={coin} selected={coin === $destinationAsset}>{coin.toUpperCase()}</option>
					{/each}
				</select>
			</div>

			<!-- Verified by -->
			<div class="flex flex-wrap items-center justify-center gap-2">
				<span class="font-medium">Verified by</span>
				<select id="verified-by" class="rounded border px-2 py-1" bind:value={$verifier}>
					<option value="yes" selected> AlwaysYesOracle </option>
					<option value="wormhole"> Wormhole </option>
				</select>
			</div>

			<!-- Action Button -->
			<div class="flex justify-center">
				{#if !connectedAccount}
					<AwaitButton buttonFunction={connect}>
						{#snippet name()}
							Connect Wallet
						{/snippet}
						{#snippet awaiting()}
							Waiting for wallet...
						{/snippet}
					</AwaitButton>
				{:else if swapInputError}
					<button
						type="button"
						class="rounded border bg-gray-200 px-4 text-xl text-gray-600"
						disabled
					>
						Input not valid {swapInputError}
					</button>
				{:else}
					<AwaitButton buttonFunction={swap}>
						{#snippet name()}
							Sign Swap
						{/snippet}
						{#snippet awaiting()}
							Waiting for signature...
						{/snippet}
					</AwaitButton>
				{/if}
			</div>
		</form>

		<form class="mx-auto mt-3 space-y-4 rounded-md border p-4">
			<h1 class="text-xl font-medium">Execute Deposit and Register Intent</h1>
			<!-- Sell -->
			<div class="flex flex-wrap items-center justify-start gap-2">
				<span class="font-medium">Sell</span>
				<input type="number" class="w-24 rounded border px-2 py-1" bind:value={$inputValue} />
				<span>of</span>
				<input
					type="text"
					class="w-24 rounded border border-gray-800 bg-gray-50 px-2 py-1"
					disabled
					value={formattedDeposit + formattedCompactDepositedBalance}
				/>
				<select id="sell-chain" class="rounded border px-2 py-1" bind:value={$activeChain}>
					<option value="sepolia" selected>Sepolia</option>
					<option value="baseSepolia">Base Sepolia</option>
					<option value="optimismSepolia">Optimism Sepolia</option>
				</select>
				<select id="sell-asset" class="rounded border px-2 py-1" bind:value={$activeAsset}>
					{#each getCoins($activeChain) as coin (coin)}
						<option value={coin} selected={coin === $activeAsset}>{coin.toUpperCase()}</option>
					{/each}
				</select>
			</div>

			<!-- Swap button -->
			<div class="flex justify-center">
				<button type="button" class="px-4 text-xl font-bold text-gray-600 hover:text-blue-600">
					⇅
				</button>
			</div>

			<!-- Buy -->
			<div class="flex flex-wrap items-center justify-start gap-2">
				<span class="font-medium">Buy</span>
				<input type="number" class="w-24 rounded border px-2 py-1" bind:value={$buyValue} />
				<select id="buy-chain" class="rounded border px-2 py-1" bind:value={$destinationChain}>
					<option value="sepolia">Sepolia</option>
					<option value="baseSepolia" selected>Base Sepolia</option>
					<option value="optimismSepolia">Optimism Sepolia</option>
				</select>
				<select id="buy-asset" class="rounded border px-2 py-1" bind:value={$destinationAsset}>
					{#each getCoins($destinationChain).filter((v) => v !== "eth") as coin (coin)}
						<option value={coin} selected={coin === $destinationAsset}>{coin.toUpperCase()}</option>
					{/each}
				</select>
			</div>

			<!-- Verified by -->
			<div class="flex flex-wrap items-center justify-center gap-2">
				<span class="font-medium">Verified by</span>
				<select id="verified-by" class="rounded border px-2 py-1" bind:value={$verifier}>
					<option value="yes" selected> AlwaysYesOracle </option>
					<option value="wormhole"> Wormhole </option>
				</select>
			</div>

			<!-- Action Button -->
			<div class="flex justify-center">
				{#if !connectedAccount}
					<AwaitButton buttonFunction={connect}>
						{#snippet name()}
							Connect Wallet
						{/snippet}
						{#snippet awaiting()}
							Waiting for wallet...
						{/snippet}
					</AwaitButton>
				{:else if depositAndSwapInputError}
					<button
						type="button"
						class="rounded border bg-gray-200 px-4 text-xl text-gray-600"
						disabled
					>
						Input not valid {depositAndSwapInputError}
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
				{:else}
					<AwaitButton buttonFunction={depositAndSwap}>
						{#snippet name()}
							Execute depositAndSwap
						{/snippet}
						{#snippet awaiting()}
							Waiting for transaction...
						{/snippet}
					</AwaitButton>
				{/if}
			</div>
		</form>
	</div>
	<!-- Make a table to display orders from users -->
	<div class="mx-auto mt-3 w-11/12 rounded-md border p-4">
		<h1 class="text-xl font-medium">Orders</h1>
		<table class="min-w-full table-auto overflow-hidden rounded-lg border border-gray-200">
			<thead class="bg-gray-100 text-left">
				<tr>
					<th class="px-4 py-2 text-sm font-medium text-gray-700">User</th>
					<th class="px-4 py-2 text-sm font-medium text-gray-700">Chain</th>
					<th class="px-4 py-2 text-sm font-medium text-gray-700">Input</th>
					<th class="px-4 py-2 text-sm font-medium text-gray-700">Output</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200">
				{#each $orders as { order } (order.user)}
					<tr class="hover:bg-gray-50">
						<td class="px-4 py-2 text-sm text-gray-800">{trunc(order.user as `0x${string}`)}</td>
						<td class="px-4 py-2 text-sm text-gray-800">{order.originChainId}</td>
						<td class="px-4 py-2 text-sm text-gray-800">
							{order.inputs.map(([token, amount]) => `${token}: ${amount}`).join(', ')}
						</td>
						<td class="px-4 py-2 text-sm text-gray-800">
							{order.outputs.map(({ token, amount }) => `${token}: ${amount}`).join(', ')}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</main>
