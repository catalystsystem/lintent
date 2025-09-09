<script lang="ts">
	import onboard from '$lib/utils/web3-onboard';
	import { createWalletClient, custom, maxUint256 } from 'viem';
	import type { WalletState } from '@web3-onboard/core';
	import AwaitButton from '$lib/components/AwaitButton.svelte';
	import SwapForm from '$lib/components/SwapForm.svelte';
	import type { StandardOrder } from '../types';
	import {
		ALWAYS_OK_ALLOCATOR,
		POLYMER_ALLOCATOR,
		coinMap,
		getCoins,
		chainMap,
		type chain,
		type coin,
		clients,
		type verifier,
		decimalMap
	} from '$lib/config';
	import { onDestroy, onMount } from 'svelte';
	import Introduction from '$lib/components/Introduction.svelte';
	import { getBalance, getCompactAllowance, getCompactBalance } from '$lib/state.svelte';
	import BalanceField from '$lib/components/BalanceField.svelte';
	import { compactApprove, compactDeposit, compactWithdraw } from '$lib/utils/compact/tx';
	import { depositAndSwap, swap } from '$lib/utils/lifiintent/tx';
	import IntentTable from '$lib/components/IntentTable.svelte';
	import { toBigIntWithDecimals } from '$lib/utils/convert';
	import { connectOrderServerSocket, getOrders } from '$lib/utils/api';
	import { validateOrder } from '$lib/utils/lifiintent/OrderLib';

	// Fix bigint so we can json serialize it:
	(BigInt.prototype as any).toJSON = function () {
		return this.toString();
	};

	type OrderPackage = {
		order: StandardOrder;
		sponsorSignature: `0x${string}`;
		allocatorSignature: `0x${string}`;
	};

	let orders = $state<OrderPackage[]>([]);

	// Step management variables
	let step0Open = $state(false);
	let step1Open = $state(false);
	let step2Open = $state(false);
	let step3Open = $state(false);
	let step4Open = $state(false);
	let step0Complete = $state(false);
	let step1Complete = $state(false);
	let step2Complete = $state(false);
	let step3Complete = $state(false);
	let step4Complete = $state(false);

	let showSuccess = $state(false);
	let learnMoreOpen = $state(false);

	// Function to complete steps when actions are performed
	function completeStep2() {
		step2Complete = true;
		step3Open = true;
		step2Open = false;
	}

	function completeStep3() {
		step3Complete = true;
		step4Open = true;
		step3Open = false;
	}

	function completeStep4() {
		step4Complete = true;
		step4Open = false;
	}

	onMount(() => {
		// Connect to websocket server
		let { socket, disconnect } = connectOrderServerSocket((order: OrderPackage) => {
			orders.push(order);
			console.log({ orders, order });
		});
		onDestroy(disconnect);

		getOrders().then((response) => {
			const parsedOrders = response.data;
			if (parsedOrders) {
				if (Array.isArray(parsedOrders)) {
					// For each order, if a field is string ending in n, convert it to bigint.
					orders = parsedOrders
						.filter((instance) => validateOrder(instance.order))
						.map((instance) => {
							instance.order.nonce = BigInt(instance.order.nonce);
							instance.order.originChainId = BigInt(instance.order.originChainId);
							if (instance.order.inputs) {
								instance.order.inputs = instance.order.inputs.map((input) => {
									return [BigInt(input[0]), BigInt(input[1])];
								});
							}
							if (instance.order.outputs) {
								instance.order.outputs = instance.order.outputs.map((output) => {
									return {
										...output,
										chainId: BigInt(output.chainId),
										amount: BigInt(output.amount)
									};
								});
							}
							const allocatorSignature = instance.allocatorSignature ?? '0x';
							const sponsorSignature = instance.sponsorSignature ?? '0x';
							return { ...instance, allocatorSignature, sponsorSignature };
						});
					console.log({ orders });
				}
			}
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
		allocatorId: POLYMER_ALLOCATOR as string,
		action: 'deposit' as string
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
	let allowance = $state(0n);
	const needsApproval = $derived(allowance < swapState.inputAmount);
	$effect(() => {
		allowances[swapState.inputChain][
			swapState.inputAsset as keyof (typeof coinMap)[typeof swapState.inputChain]
		].then((a) => {
			allowance = a;
		});
	});
</script>

<main class="max-w-4xl mx-auto px-6 py-16">
	<!-- Header with generous spacing -->
	<div class="text-center space-y-8 mb-16">
		<h1 class="text-4xl font-bold text-gray-900 tracking-tight">
			Open Intent Framework Demo
		</h1>
		<p class="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
			This demo showcases cross-chain intent execution using the{" "}
			<a
				href="#"
				class="text-gray-900 hover:text-gray-700 font-medium border-b border-gray-300 hover:border-gray-500 transition-colors duration-200"
			>
				Open Intents Framework (OIF)
			</a>{" "}
			and{" "}
			<a
				href="#"
				class="text-gray-900 hover:text-gray-700 font-medium border-b border-gray-300 hover:border-gray-500 transition-colors duration-200"
			>
				Resource Locks
			</a>
			.
		</p>

		<!-- What You'll Learn Section -->
		<div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 max-w-2xl mx-auto">
			<div class="flex items-center gap-3 mb-6">
				<div class="w-6 h-6 text-gray-700">📚</div>
				<h3 class="text-xl font-bold text-gray-900">What You'll Learn</h3>
			</div>
			<ul class="space-y-4 text-left">
				<li class="flex items-start gap-3 text-gray-700">
					<div class="w-2 h-2 bg-gray-400 rounded-full mt-2.5 flex-shrink-0" />
					How to deposit testnet USDC using resource locks
				</li>
				<li class="flex items-start gap-3 text-gray-700">
					<div class="w-2 h-2 bg-gray-400 rounded-full mt-2.5 flex-shrink-0" />
					Creating cross-chain swap intents
				</li>
				<li class="flex items-start gap-3 text-gray-700">
					<div class="w-2 h-2 bg-gray-400 rounded-full mt-2.5 flex-shrink-0" />
					How solvers fill and execute intents
				</li>
				<li class="flex items-start gap-3 text-gray-700">
					<div class="w-2 h-2 bg-gray-400 rounded-full mt-2.5 flex-shrink-0" />
					Intent lifecycle from creation to completion
				</li>
			</ul>
		</div>
	</div>

	<!-- Success Animation -->
	{#if showSuccess}
		<div 
			class="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50"
			onclick={() => showSuccess = false}
			role="button"
			tabindex="0"
		>
			<div 
				class="bg-white rounded-2xl p-8 shadow-2xl max-w-md mx-4 text-center"
			>
				<div class="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
					<div class="text-white text-2xl">✓</div>
				</div>
				<h3 class="text-xl font-medium text-gray-900 mb-2">
					Intent completed successfully
				</h3>
				<p class="text-gray-600 mb-6">
					Your cross-chain swap has been executed and the solver has been compensated.
				</p>
				<button 
					onclick={() => showSuccess = false} 
					class="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-lg transition-colors"
				>
					Continue
				</button>
			</div>
		</div>
	{/if}

	<!-- Step 0: Get Testnet Tokens -->
	<div class="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 mb-6">
		<div
			class="hover:bg-gray-50/50 transition-colors duration-200 cursor-pointer p-8"
			onclick={() => step0Open = !step0Open}
		>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-6">
					<div class="flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg transition-all duration-300 {step0Complete ? 'bg-gray-900 text-white scale-110' : 'bg-gray-100 text-gray-600'}">
						{#if step0Complete}
							✓
						{:else}
							0
						{/if}
					</div>
					<div>
						<h3 class="text-xl font-bold text-gray-900 flex items-center gap-3">
							⚡ Get Testnet Tokens
						</h3>
						<p class="text-lg text-gray-600">Obtain testnet USDC and ETH on all supported chains</p>
					</div>
				</div>
				<div class="text-gray-400 transition-transform duration-300 text-2xl {step0Open ? 'rotate-90' : ''}">
					›
				</div>
			</div>
		</div>

		{#if step0Open}
			<div class="px-6 pb-6 space-y-6">
				<div class="p-4 bg-gray-50 border border-gray-200 rounded-lg">
					<p class="text-sm text-gray-700 mb-4">
						You'll need testnet tokens on the following chains to use this demo:
					</p>
					<div class="grid md:grid-cols-3 gap-4">
						{#each ["Sepolia", "Base Sepolia", "Optimism Sepolia"] as chain}
							<div class="space-y-2">
								<h4 class="font-medium text-gray-900 text-sm">{chain}</h4>
								<div class="space-y-1">
									<a
										href="https://sepoliafaucet.com"
										target="_blank"
										rel="noopener noreferrer"
										class="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-2 py-1 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-sm"
									>
										↗ {chain} ETH
									</a>
									<a
										href="https://faucet.circle.com"
										target="_blank"
										rel="noopener noreferrer"
										class="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-2 py-1 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-sm"
									>
										↗ {chain} USDC
									</a>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<div class="flex justify-center">
					<button
						onclick={() => { step0Complete = true; step1Open = true; step0Open = false; }}
						class="bg-gray-900 hover:bg-gray-800 active:bg-gray-950 text-white px-8 py-4 text-lg font-medium rounded-xl transition-all duration-200 hover:scale-105 cursor-pointer"
					>
						I have testnet tokens →
					</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- Step 1: Connect & Configure -->
<div class="border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
  <div 
    class="transition-colors duration-200 {step0Complete ? 'hover:bg-gray-50/50 cursor-pointer' : ''} p-6"
    onclick={() => step0Complete && (step1Open = !step1Open)}
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="flex items-center justify-center w-8 h-8 rounded-full font-medium text-sm transition-colors duration-200 {step1Complete ? 'bg-gray-900 text-white' : step0Complete ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-400'}">
          {#if step1Complete}
            ✓
          {:else}
            1
          {/if}
        </div>
        <div>
          <h3 class="text-lg font-medium flex items-center gap-2 {step0Complete ? 'text-gray-900' : 'text-gray-400'}">
            ⚙️ Connect & Configure
          </h3>
          <p class="text-gray-600">Connect your wallet and select an allocator</p>
        </div>
      </div>
      <div class="text-gray-400 transition-transform duration-200 {step1Open ? 'rotate-90' : ''}">
        ›
      </div>
    </div>
  </div>

  {#if step1Open}
    <div class="px-6 pb-6 space-y-6">
      {#if !step0Complete}
        <div class="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div class="flex items-center gap-2 text-gray-600">
            <div class="w-5 h-5">⚠️</div>
            <span class="font-medium">Complete Step 0 first</span>
          </div>
          <p class="text-sm text-gray-500 mt-1">
            Please get testnet tokens before connecting your wallet.
          </p>
        </div>
      {:else}
        <div class="grid md:grid-cols-2 gap-8">
          <div class="space-y-4">
            <div>
              <label class="text-sm font-medium text-gray-900 mb-3 block">
                Wallet Connection
              </label>
              <div class="flex items-center gap-3">
                <button
                  onclick={() => connectedAccount ? onboard.disconnectWallet({ label: activeWallet.wallet?.label || '' }) : onboard.connectWallet()}
                  class="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors"
                >
                  💼 {connectedAccount ? "Disconnect" : "Connect Wallet"}
                </button>
                {#if connectedAccount}
                  <div class="flex items-center gap-2 text-sm text-gray-600">
                    ✓ Connected
                  </div>
                {/if}
              </div>
              {#if connectedAccount}
                <div class="mt-3">
                  <p class="text-sm text-gray-600">
                    Connected to: <span class="font-medium capitalize">{swapState.inputChain}</span>
                  </p>
                </div>
              {/if}
            </div>
          </div>

          <div class="space-y-4">
            <div>
              <div class="flex items-center gap-2 mb-3">
                <label class="text-sm font-medium text-gray-900">Allocator Selection</label>
                <div class="group relative">
                  <div class="w-4 h-4 text-gray-400 cursor-help hover:text-gray-600 transition-colors">?</div>
                  <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    An allocator is a trusted entity in Resource Locks that sequences your intents. Learn more about Resource Locks at the bottom of the page
                  </div>
                </div>
              </div>
              <div class="flex flex-row">
                <button
                  class="h-8 rounded-l border px-4 transition-colors {swapState.allocatorId === ALWAYS_OK_ALLOCATOR ? 'bg-gray-900 text-white' : 'bg-white hover:bg-gray-50 border-gray-300'}"
                  onclick={() => swapState.allocatorId = ALWAYS_OK_ALLOCATOR}
                >
                  AlwaysYesAllocator
                </button>
                <button
                  class="h-8 rounded-r border border-l-0 px-4 transition-colors {swapState.allocatorId === POLYMER_ALLOCATOR ? 'bg-gray-900 text-white' : 'bg-white hover:bg-gray-50 border-gray-300'}"
                  onclick={() => swapState.allocatorId = POLYMER_ALLOCATOR}
                >
                  Polymer Allocator
                </button>
              </div>
            </div>
          </div>
        </div>

        {#if connectedAccount && swapState.allocatorId}
          <div class="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div class="flex items-center gap-2 text-gray-900">
              ✓ <span class="font-medium">Ready to proceed</span>
            </div>
            <p class="text-sm text-gray-600 mt-1">
              Your wallet is connected and allocator is selected.
            </p>
            <button
              onclick={() => { step1Complete = true; step2Open = true; step1Open = false; }}
              class="mt-3 bg-gray-900 hover:bg-gray-800 active:bg-gray-950 text-white px-8 py-4 text-lg font-medium rounded-xl transition-all duration-200 hover:scale-105 cursor-pointer"
            >
              Continue →
            </button>
          </div>
        {/if}
      {/if}
    </div>
  {/if}
</div>

	<!-- Step 2: Create Your Intent -->
<div class="border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
  <div 
    class="transition-colors duration-200 {step1Complete ? 'hover:bg-gray-50/50 cursor-pointer' : ''} p-6"
    onclick={() => step1Complete && (step2Open = !step2Open)}
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="flex items-center justify-center w-8 h-8 rounded-full font-medium text-sm transition-colors duration-200 {step2Complete ? 'bg-gray-900 text-white' : step1Complete ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-400'}">
          {#if step2Complete}
            ✓
          {:else}
            2
          {/if}
        </div>
        <div>
          <h3 class="text-lg font-medium flex items-center gap-2 {step1Complete ? 'text-gray-900' : 'text-gray-400'}">
             Create Your Intent
          </h3>
          <p class="text-gray-600">Configure your cross-chain swap parameters</p>
        </div>
      </div>
      <div class="text-gray-400 transition-transform duration-200 {step2Open ? 'rotate-90' : ''}">
        ›
      </div>
    </div>
  </div>

  {#if step2Open}
    <div class="px-6 pb-6 space-y-8">
      {#if !step1Complete}
        <div class="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div class="flex items-center gap-2 text-gray-600">
            <div class="w-5 h-5">⚠️</div>
            <span class="font-medium">Complete Step 1 first</span>
          </div>
          <p class="text-sm text-gray-500 mt-1">
            Please connect your wallet and select an allocator to continue.
          </p>
        </div>
      {:else}
        <div class="space-y-8">
          <!-- Flow Selection -->
          <div class="space-y-4">
            <label class="text-lg font-medium text-gray-900">Choose Your Flow</label>
            <div class="grid gap-4">
              {#each [
                {
                  value: "manage-compact",
                  label: "Manage The Compact",
                  description: "Deposit or withdraw funds from your compact"
                },
                {
                  value: "deposit-issue",
                  label: "Deposit and Issue Intent",
                  description: "Deposit and create intent in one transaction"
                }
              ] as option}
                <div
                  class="relative cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 {swapState.action === option.value ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'}"
                  onclick={() => swapState.action = option.value}
                >
                  <div class="flex items-start gap-3">
                    <div class="mt-1 h-4 w-4 rounded-full border-2 transition-colors {swapState.action === option.value ? 'border-gray-900 bg-gray-900' : 'border-gray-300'}">
                      {#if swapState.action === option.value}
                        <div class="h-full w-full rounded-full bg-white scale-50"></div>
                      {/if}
                    </div>
                    <div class="flex-1">
                      <h3 class="font-medium text-gray-900">{option.label}</h3>
                      <p class="text-sm text-gray-600 mt-1">{option.description}</p>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <!-- Compact Management -->
          {#if swapState.action === "manage-compact"}
            <div class="space-y-6">
              <div class="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
                <div class="flex items-center justify-between">
                  <h3 class="text-lg font-medium text-gray-900">Manage The Compact</h3>
                  <div class="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onclick={() => swapState.action = "deposit"}
                      class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors {(swapState.action as string) === 'deposit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
                    >
                      Deposit
                    </button>
                    <button
                      onclick={() => swapState.action = "withdraw"}
                      class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors {(swapState.action as string) === 'withdraw' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
                    >
                      Withdraw
                    </button>
                  </div>
                </div>

                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">
                      Available: {balances[swapState.inputChain]?.[swapState.inputAsset] || "0.00"} {coinMap[swapState.inputChain][swapState.inputAsset]?.toUpperCase()}
                    </span>
                  </div>

                  <div class="flex items-center gap-4">
                    <div class="flex-1">
                      <input
                        type="number"
                        placeholder="0.00"
                        bind:value={inputNumber}
                        class="text-4xl font-bold h-16 border-2 border-gray-200 focus:border-gray-900 focus:ring-0 rounded-xl px-6 bg-transparent outline-none transition-colors duration-200"
                      />
                    </div>
                    <select 
                      bind:value={swapState.inputAsset}
                      class="w-24 h-16 border-2 border-gray-200 focus:border-gray-900 focus:ring-0 rounded-xl px-4 bg-white transition-colors duration-200"
                    >
                      {#each getCoins(swapState.inputChain) as coin (coin)}
                        <option value={coin}>{coinMap[swapState.inputChain][coin].toUpperCase()}</option>
                      {/each}
                    </select>
                  </div>

                  <div class="flex items-center gap-2">
                    <span class="text-sm text-gray-600">on</span>
                    <select 
                      bind:value={swapState.inputChain}
                      class="w-40 border-2 border-gray-200 focus:border-gray-900 focus:ring-0 rounded-xl px-4 bg-white transition-colors duration-200"
                    >
                      <option value="sepolia">Sepolia</option>
                      <option value="baseSepolia">Base Sepolia</option>
                      <option value="optimismSepolia">Optimism Sepolia</option>
                    </select>
                  </div>
                </div>

                {#if inputNumber}
                  <div class="flex justify-center pt-4">
                    <AwaitButton buttonFunction={(swapState.action as string) === 'withdraw' ? compactWithdraw(walletClient!, swapState) : compactDeposit(walletClient!, swapState)}>
                      {#snippet name()}
                        Execute {swapState.action} →
                      {/snippet}
                      {#snippet awaiting()}
                        Waiting for transaction...
                      {/snippet}
                    </AwaitButton>
                  </div>
                {/if}
              </div>
            </div>
          {/if}

          <!-- Deposit and Issue Intent -->
          {#if swapState.action === "deposit-issue"}
            <div class="space-y-6">
              <div class="space-y-4">
                <!-- Sell Section -->
                <div class="bg-white border border-gray-200 rounded-xl p-6">
                  <div class="flex items-center justify-between mb-4">
                    <span class="text-sm font-medium text-gray-700">You sell</span>
                    <span class="text-sm text-gray-600">
                      Available: {balances[swapState.inputChain]?.[swapState.inputAsset] || "0.00"} {coinMap[swapState.inputChain][swapState.inputAsset]?.toUpperCase()}
                    </span>
                  </div>
                  <div class="flex items-center gap-4">
                    <div class="flex-1">
                      <input
                        type="number"
                        placeholder="0.00"
                        bind:value={inputNumber}
                        class="text-4xl font-bold h-16 border-0 p-0 focus:ring-0 bg-transparent outline-none"
                      />
                    </div>
                    <div class="flex items-center gap-3">
                      <select 
                        bind:value={swapState.inputAsset}
                        class="w-20 border-0 bg-gray-100 hover:bg-gray-200 rounded-xl px-3 py-2 transition-colors duration-200"
                      >
                        {#each getCoins(swapState.inputChain) as coin (coin)}
                          <option value={coin}>{coinMap[swapState.inputChain][coin].toUpperCase()}</option>
                        {/each}
                      </select>
                      <span class="text-sm text-gray-500">on</span>
                      <select 
                        bind:value={swapState.inputChain}
                        class="w-32 border-0 bg-gray-100 hover:bg-gray-200 rounded-xl px-3 py-2 transition-colors duration-200"
                      >
                        <option value="sepolia">Sepolia</option>
                        <option value="baseSepolia">Base Sepolia</option>
                        <option value="optimismSepolia">Optimism Sepolia</option>
                      </select>
                    </div>
                  </div>
                </div>

                <!-- Swap Arrow -->
                <div class="flex justify-center">
                  <div class="p-2 bg-gray-50 rounded-full border border-gray-200">
                    <div class="w-4 h-4 text-gray-400">↓</div>
                  </div>
                </div>

                <!-- Buy Section -->
                <div class="bg-white border border-gray-200 rounded-xl p-6">
                  <div class="flex items-center justify-between mb-4">
                    <span class="text-sm font-medium text-gray-700">You receive</span>
                  </div>
                  <div class="flex items-center gap-4">
                    <div class="flex-1">
                      <input
                        type="number"
                        placeholder="0.00"
                        bind:value={() => inputNumber, updateInputAmount}
                        class="text-2xl h-14 border-0 p-0 focus:ring-0 bg-transparent"
                      />
                    </div>
                    <div class="flex items-center gap-3">
                      <select 
                        bind:value={swapState.outputAsset}
                        class="w-20 border-0 bg-gray-100 hover:bg-gray-200 rounded-lg"
                      >
                        {#each getCoins(swapState.outputChain) as coin (coin)}
                          <option value={coin}>{coinMap[swapState.outputChain][coin].toUpperCase()}</option>
                        {/each}
                      </select>
                      <span class="text-sm text-gray-500">on</span>
                      <select 
                        bind:value={swapState.outputChain}
                        class="w-32 border-0 bg-gray-100 hover:bg-gray-200 rounded-lg"
                      >
                        <option value="sepolia">Sepolia</option>
                        <option value="baseSepolia">Base Sepolia</option>
                        <option value="optimismSepolia">Optimism Sepolia</option>
                      </select>
                    </div>
                  </div>
                </div>

                <!-- Verification -->
                <div class="flex justify-center">
                  <div class="flex items-center gap-2 text-sm text-gray-600">
                    <span>Verified by</span>
                    <select 
                      bind:value={swapState.verifier}
                      class="w-36 h-8 border-0 bg-gray-100 hover:bg-gray-200 text-xs rounded-lg"
                    >
                      <option value="polymer">Polymer Oracle</option>
                      <option value="wormhole">Wormhole</option>
                    </select>
                  </div>
                </div>
              </div>

              {#if inputNumber}
                <div class="flex justify-center pt-4">
                  <AwaitButton buttonFunction={depositAndSwap(walletClient!, swapState, orders)}>
                    {#snippet name()}
                      Create Intent →
                    {/snippet}
                    {#snippet awaiting()}
                      Waiting for transaction...
                    {/snippet}
                  </AwaitButton>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

	<!-- Step 3: Monitor & Track Intents -->
<div class="border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
  <div 
    class="transition-colors duration-200 {step2Complete ? 'hover:bg-gray-50/50 cursor-pointer' : ''} p-6"
    onclick={() => step2Complete && (step3Open = !step3Open)}
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="flex items-center justify-center w-8 h-8 rounded-full font-medium text-sm transition-colors duration-200 {step3Complete ? 'bg-gray-900 text-white' : step2Complete ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-400'}">
          {#if step3Complete}
            ✓
          {:else}
            3
          {/if}
        </div>
        <div>
          <h3 class="text-lg font-medium flex items-center gap-2 {step2Complete ? 'text-gray-900' : 'text-gray-400'}">
            👁️ Monitor & Track Intents
          </h3>
          <p class="text-gray-600">View the status of your cross-chain intents</p>
        </div>
      </div>
      <div class="text-gray-400 transition-transform duration-200 {step3Open ? 'rotate-90' : ''}">
        ›
      </div>
    </div>
  </div>

  {#if step3Open}
    <div class="px-6 pb-6">
      {#if orders.length === 0}
        <div class="text-center py-12 text-gray-500">
          <div class="w-12 h-12 mx-auto mb-4 text-gray-300">️</div>
          <p class="text-lg font-medium text-gray-400">No intents yet</p>
          <p class="text-sm text-gray-400">Create your first intent in Step 2 to see it here.</p>
        </div>
      {:else}
        <IntentTable {orders} walletClient={walletClient!} opts={swapState} {updatedDerived} />
      {/if}
    </div>
  {/if}
</div>

	<!-- Step 4: Solver Perspective -->
	<div class="border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
		<div 
			class="transition-colors duration-200 {orders.length > 0 ? 'hover:bg-gray-50/50 cursor-pointer' : ''} p-6"
			onclick={() => orders.length > 0 && (step4Open = !step4Open)}
		>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<div class="flex items-center justify-center w-8 h-8 rounded-full font-medium text-sm transition-colors duration-200 {step4Complete ? 'bg-gray-900 text-white' : orders.length > 0 ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-400'}">
						{#if step4Complete}
							✓
						{:else}
							4
						{/if}
					</div>
					<div>
						<h3 class="text-lg font-medium flex items-center gap-2 {orders.length > 0 ? 'text-gray-900' : 'text-gray-400'}">
							🌐 Solver Perspective
						</h3>
						<p class="text-gray-600">Experience how solvers fulfill intents and earn profits</p>
					</div>
				</div>
				<div class="text-gray-400 transition-transform duration-200 {step4Open ? 'rotate-90' : ''}">
					›
				</div>
			</div>
		</div>

		{#if step4Open}
			<div class="px-6 pb-6 space-y-6">
				<div class="p-4 bg-gray-50 border border-gray-200 rounded-lg">
					<div class="flex items-center gap-2 text-gray-900 mb-2">
						<div class="w-5 h-5">💰</div>
						<span class="font-medium">Solver Workflow</span>
					</div>
					<p class="text-sm text-gray-600">
						Solvers fulfill intents through a 5-step process: switch to destination network, fill
						orders, submit transaction hash and validate, switch back to origin chain, and claim locked
						user funds. Use the action buttons in the table above to complete each step.
					</p>
				</div>

				<div class="space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						<div class="p-4 border border-gray-200 rounded-lg">
							<h4 class="font-medium text-gray-900 mb-2">1. Switch Network</h4>
							<p class="text-sm text-gray-600 mb-3">
								Switch to the destination chain to provide liquidity
							</p>
							<select 
								bind:value={swapState.outputChain}
								class="border-gray-300 rounded-lg w-full"
							>
								<option value="sepolia">Sepolia</option>
								<option value="baseSepolia">Base Sepolia</option>
								<option value="optimismSepolia">Optimism Sepolia</option>
							</select>
						</div>

						<div class="p-4 border border-gray-200 rounded-lg">
							<h4 class="font-medium text-gray-900 mb-2">2. Fill Order</h4>
							<p class="text-sm text-gray-600 mb-3">
								Click "Fill" in the table to provide liquidity
							</p>
							<div class="text-sm text-gray-500">Action available in table →</div>
						</div>

						<div class="p-4 border border-gray-200 rounded-lg">
							<h4 class="font-medium text-gray-900 mb-2">3. Submit & Validate</h4>
							<p class="text-sm text-gray-600 mb-3">Submit transaction hash and click validate</p>
							<div class="text-sm text-gray-500">Sequential actions in table</div>
						</div>

						<div class="p-4 border border-gray-200 rounded-lg">
							<h4 class="font-medium text-gray-900 mb-2">4. Switch Back</h4>
							<p class="text-sm text-gray-600 mb-3">Switch back to origin chain</p>
							<div class="text-sm text-gray-500">Return to source network</div>
						</div>

						<div class="p-4 border border-gray-200 rounded-lg">
							<h4 class="font-medium text-gray-900 mb-2">5. Claim Funds</h4>
							<p class="text-sm text-gray-600 mb-3">Claim locked user funds and profits</p>
							<div class="text-sm text-gray-500">Final action in table</div>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Educational Content -->
	<div class="border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 mt-12">
		<div 
			class="hover:bg-gray-50/50 transition-colors duration-200 cursor-pointer p-6"
			onclick={() => learnMoreOpen = !learnMoreOpen}
		>
			<div class="flex items-center justify-between">
				<h3 class="text-lg font-medium text-gray-900">Learn More</h3>
				<div class="text-gray-400 transition-transform duration-200 {learnMoreOpen ? 'rotate-90' : ''}">
					›
				</div>
			</div>
		</div>

		{#if learnMoreOpen}
			<div class="px-6 pb-6 space-y-8">
				<div class="grid md:grid-cols-2 gap-8">
					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">Why Resource Locks?</h3>
						<p class="text-sm text-gray-600 mb-4">
							Resource Locks improve asset availability guarantees in cross-chain contexts and asynchronous environments, offering several key advantages:
						</p>
						<ul class="space-y-3 text-sm text-gray-600">
							<li class="flex items-start gap-2">
								<div class="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
								Funds are only debited after successful delivery has been proven.
							</li>
							<li class="flex items-start gap-2">
								<div class="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
								Enables efficient short-lived interactions—intents can expire within seconds without consequence.
							</li>
							<li class="flex items-start gap-2">
								<div class="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
								No upfront deposit or initiation transaction are required.
							</li>
							<li class="flex items-start gap-2">
								<div class="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
								Fully composable with other protocols and settlement layers.
							</li>
						</ul>
						<p class="text-sm text-gray-600 mt-4">
							<a href="#" class="text-gray-900 hover:text-gray-700 font-medium border-b border-gray-300 hover:border-gray-500 transition-colors">
								Learn more about Resource Locks.
							</a>
						</p>
					</div>

					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">Why the Open Intents Framework?</h3>
						<p class="text-sm text-gray-600 mb-4">
							The Open Intents Framework (OIF) is an open coordination layer for standardizing and scaling intent-based workflows across chains. The goal is to:
						</p>
						<ul class="space-y-3 text-sm text-gray-600">
							<li class="flex items-start gap-2">
								<div class="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
								Standardise cross-chain interactions.
							</li>
							<li class="flex items-start gap-2">
								<div class="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
								Define a permissionless intent implementation that can scale across all chains.
							</li>
							<li class="flex items-start gap-2">
								<div class="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
								Create a reference implementation for cross-chain solvers & searchers.
							</li>
							<li class="flex items-start gap-2">
								<div class="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
								Provide tooling for wallet and app developers.
							</li>
						</ul>
						<p class="text-sm text-gray-600 mt-4">
							<a href="#" class="text-gray-900 hover:text-gray-700 font-medium border-b border-gray-300 hover:border-gray-500 transition-colors">
								Learn more about Open Intents Framework.
							</a>
						</p>
					</div>
				</div>

				<!-- Supported flows section -->
				<div class="border-t border-gray-200 pt-8">
					<h3 class="text-lg font-medium text-gray-900 mb-4">Supported Flows</h3>
					<div class="space-y-4 text-sm text-gray-600">
						<p class="font-medium text-gray-700">This app currently supports two flows:</p>
						<ul class="space-y-3 ml-4">
							<li class="flex items-start gap-2">
								<div class="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
								<span>
									<strong>Swaps using existing deposits</strong> (off-chain signature-based settlement)
								</span>
							</li>
							<li class="flex items-start gap-2">
								<div class="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
								<span>
									<strong>Swaps with on-chain deposit and registration</strong> (transaction-based
									resource locking)
								</span>
							</li>
						</ul>
						<p class="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
							A third, currently unimplemented, flow leverages permit2 to enable gasless on-chain deposits
							and registration—providing a smooth user experience without requiring user-initiated
							transactions.
						</p>
					</div>
				</div>
			</div>
		{/if}
	</div>
</main>
