<script lang="ts">
	import onboard from '$lib/utils/web3-onboard';
	import { createWalletClient, custom, maxUint256 } from 'viem';
	import type { WalletState } from '@web3-onboard/core';
	import AwaitButton from '$lib/components/AwaitButton.svelte';
	import SwapForm from '$lib/components/SwapForm.svelte';
	import type { StandardOrder } from '../types';
	import {
		DEFAULT_ALLOCATOR,
		coinMap,
		getCoins,
		chainMap,
		type chain,
		type coin,
		clients,
		type verifier,
		decimalMap
	} from '$lib/config';
	import { onMount } from 'svelte';
	import Introduction from '$lib/components/Introduction.svelte';
	import { getBalance, getCompactAllowance, getCompactBalance } from '$lib/state.svelte';
	import BalanceField from '$lib/components/BalanceField.svelte';
	import { compactApprove, compactDeposit, compactWithdraw } from '$lib/utils/compact/tx';
	import { depositAndSwap, swap } from '$lib/utils/lifiintent/tx';
	import IntentTable from '$lib/components/IntentTable.svelte';
	import { toBigIntWithDecimals } from '$lib/utils/convert';

	// Fix bigint so we can json serialize it:
	(BigInt.prototype as any).toJSON = function () {
		return this.toString();
	};

	let orders = $state<{ order: StandardOrder; signature: `0x${string}` }[]>([]);
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
					orders = parsedOrders;
				}
			} catch (e) {
				console.error('Failed to parse stored orders:', e);
			}
		}
		$effect(() => {
			// Set the content to local storage.
			localStorage.setItem('catalyst-orders', JSON.stringify(orders));
		});
	});

	// --- Wallet --- //
	const wallets = onboard.state.select('wallets');
	const activeWallet = $state<{ wallet?: WalletState }>({});
	wallets.subscribe((v) => {
		activeWallet.wallet = v?.[0];
	});
	const connectedAccount = $derived(activeWallet.wallet?.accounts?.[0]);

	const walletClient = $derived(
		activeWallet?.wallet?.provider
			? createWalletClient({
					transport: custom(activeWallet?.wallet?.provider)
				})
			: undefined
	);

	export async function setWalletToCorrectChain(chain: chain = swapState.inputChain) {
		if (swapState.inputChain !== chain) {
			swapState.inputChain = chain;
		}
		return walletClient?.switchChain({ id: chainMap[chain].id });
	}

	export async function connect() {
		await onboard.connectWallet();
	}

	// --- Execute Transaction Variables --- //
	let swapState = $state({
		preHook: setWalletToCorrectChain,
		postHook: async () => forceUpdate(),
		inputChain: 'sepolia' as chain,
		account: () => connectedAccount?.address!,
		inputAsset: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as coin, // address string
		inputAmount: 0n,
		outputAsset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as coin,
		outputAmount: 0n,
		outputChain: 'baseSepolia' as chain,
		verifier: 'polymer' as verifier,
		allocatorId: DEFAULT_ALLOCATOR as string,
		action: 'deposit' as 'deposit' | 'withdraw'
	});
	$effect(() => {
		const tokensForOutputChain = coinMap[swapState.outputChain];
		const usdcAddressforOutputChain =
			Object.keys(tokensForOutputChain)[Object.values(tokensForOutputChain).indexOf('usdc')];
		swapState.outputAsset = Object.keys(tokensForOutputChain).includes(swapState.outputAsset)
			? swapState.outputAsset
			: (usdcAddressforOutputChain as coin);
	});
	$effect(() => {
		const tokensForInputChain = coinMap[swapState.inputChain];
		const usdcAddressforInputChain =
			Object.keys(tokensForInputChain)[Object.values(tokensForInputChain).indexOf('usdc')];
		swapState.inputAsset = Object.keys(tokensForInputChain).includes(swapState.inputAsset)
			? swapState.inputAsset
			: (usdcAddressforInputChain as coin);
	});

	function swapInputOutput() {
		[
			swapState.inputAsset,
			swapState.outputAsset,
			swapState.inputChain,
			swapState.outputChain,
			swapState.inputAmount,
			swapState.outputAmount
		] = [
			swapState.outputAsset,
			swapState.inputAsset,
			swapState.outputChain,
			swapState.inputChain,
			swapState.outputAmount,
			swapState.inputAmount
		];
	}

	let updatedDerived = $state(0);
	setInterval(() => {
		updatedDerived += 1;
	}, 10000);
	const forceUpdate = () => (updatedDerived += 1);

	function mapOverCoins<T>(
		func: (
			user: `0x${string}` | undefined,
			asset: `0x${string}`,
			client: (typeof clients)[keyof typeof clients]
		) => T,
		_: any
	) {
		const resolved: {
			-readonly [K in keyof typeof coinMap]: {
				-readonly [V in keyof (typeof coinMap)[K]]: T;
			};
		} = {} as any;
		for (const [network, tokens] of Object.entries(coinMap) as [
			keyof typeof chainMap,
			(typeof coinMap)[keyof typeof chainMap]
		][]) {
			resolved[network as keyof typeof coinMap] = {} as any;

			for (const token of Object.keys(tokens)) {
				resolved[network as keyof typeof coinMap][token as keyof (typeof coinMap)[typeof network]] =
					func(
						connectedAccount?.address,
						token as `0x${string}`,
						clients[network as keyof typeof coinMap]
					);
			}
		}
		return resolved;
	}

	const balances = $derived.by(() => {
		return mapOverCoins(getBalance, updatedDerived);
	});

	const allowances = $derived.by(() => {
		return mapOverCoins(getCompactAllowance, updatedDerived);
	});

	const compactBalances = $derived.by(() => {
		return mapOverCoins(
			(
				user: `0x${string}` | undefined,
				asset: `0x${string}`,
				client: (typeof clients)[keyof typeof clients]
			) => getCompactBalance(user, asset, client, swapState.allocatorId),
			updatedDerived
		);
	});

	const maxAllowances = mapOverCoins(async () => maxUint256, '');

	let inputNumber = $derived(
		Number(swapState.inputAmount) / 10 ** decimalMap[swapState.inputAsset]
	);
	function updateInputAmount(input: number) {
		swapState.inputAmount = toBigIntWithDecimals(input, decimalMap[swapState.inputAsset]);
	}
</script>

<main class="main">
	<h1 class="pt-3 text-center align-middle text-xl font-medium">Resource lock intents using OIF</h1>
	<div class="mx-auto flex flex-col px-4 pt-2 md:max-w-10/12 md:flex-row md:px-8 md:pt-3">
		<Introduction />

		<div class="flex w-[128rem] flex-col justify-items-center align-middle">
			<form class="w-full space-y-4 rounded-md border border-gray-200 bg-gray-50 p-4">
				<h1 class="text-xl font-medium">Manage Compact</h1>
				<div class="flex flex-row space-x-2">
					<h1 class="text-md font-medium">Allocator</h1>
					<input
						type="text"
						class="w-96 rounded border px-2 py-1"
						bind:value={swapState.allocatorId}
					/>
				</div>
				<div class="flex flex-wrap items-center justify-start gap-2">
					<select id="in-asset" class="rounded border px-2 py-1" bind:value={swapState.action}>
						<option value="deposit" selected>Deposit</option>
						<option value="withdraw">Withdraw</option>
					</select>
					<input
						type="number"
						class="w-20 rounded border px-2 py-1"
						bind:value={() => inputNumber, updateInputAmount}
					/>
					<span>of</span>
					<BalanceField
						value={(swapState.action === 'withdraw' ? compactBalances : balances)[
							swapState.inputChain
						][swapState.inputAsset as keyof (typeof coinMap)[typeof swapState.inputChain]]}
						decimals={decimalMap[swapState.inputAsset]}
					/>
					<select
						id="deposit-chain"
						class="rounded border px-2 py-1"
						bind:value={swapState.inputChain}
					>
						<option value="sepolia" selected>Sepolia</option>
						<option value="baseSepolia">Base Sepolia</option>
						<option value="optimismSepolia">Optimism Sepolia</option>
					</select>
					<select
						id="deposit-asset"
						class="rounded border px-2 py-1"
						bind:value={swapState.inputAsset}
					>
						{#each getCoins(swapState.inputChain) as coin (coin)}
							<option value={coin} selected={coin === swapState.inputAsset}
								>{coinMap[swapState.inputChain][coin].toUpperCase()}</option
							>
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
					{:else if false}
						<!-- <button
							type="button"
							class="rounded border bg-gray-200 px-4 text-xl text-gray-600"
							disabled
						>
							Input not valid {depositInputError}
						</button> -->
					{:else if swapState.action === 'withdraw'}
						<AwaitButton buttonFunction={compactWithdraw(walletClient!, swapState)}>
							{#snippet name()}
								Withdraw
							{/snippet}
							{#snippet awaiting()}
								Waiting for transaction...
							{/snippet}
						</AwaitButton>
					{:else}
						{#await allowances[swapState.inputChain][swapState.inputAsset as keyof (typeof coinMap)[typeof swapState.inputChain]]}
							<button
								type="button"
								class="h-8 rounded border px-4 text-xl font-bold text-gray-300"
								disabled
							>
								...
							</button>
						{:then allowance}
							{#if allowance < swapState.inputAmount}
								<AwaitButton buttonFunction={compactApprove(walletClient!, swapState)}>
									{#snippet name()}
										Set allowance
									{/snippet}
									{#snippet awaiting()}
										Waiting for transaction...
									{/snippet}
								</AwaitButton>
							{:else}
								<AwaitButton buttonFunction={compactDeposit(walletClient!, swapState)}>
									{#snippet name()}
										Execute deposit
									{/snippet}
									{#snippet awaiting()}
										Waiting for transaction...
									{/snippet}
								</AwaitButton>
							{/if}
						{/await}
					{/if}
				</div>
			</form>
			<SwapForm
				balances={compactBalances}
				allowances={maxAllowances}
				{swapInputOutput}
				bind:opts={swapState}
				connectFunction={connect}
				executeFunction={swap(walletClient!, swapState, orders)}
				approveFunction={async () => {}}
				showConnect={!connectedAccount}
			>
				{#snippet title()}
					Sign Intent with Deposit
				{/snippet}
				{#snippet executeName()}
					Sign BatchCompact
				{/snippet}
			</SwapForm>
			<SwapForm
				{balances}
				{allowances}
				{swapInputOutput}
				bind:opts={swapState}
				connectFunction={connect}
				executeFunction={depositAndSwap(walletClient!, swapState, orders)}
				approveFunction={compactApprove(walletClient!, swapState)}
				showConnect={!connectedAccount}
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
	<IntentTable {orders} walletClient={walletClient!} bind:opts={swapState} />
</main>
