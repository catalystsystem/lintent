<script lang="ts">
	import AwaitButton from "$lib/components/AwaitButton.svelte";
	import GetQuote from "$lib/components/GetQuote.svelte";
	import FormControl from "$lib/components/ui/FormControl.svelte";
	import { POLYMER_ALLOCATOR, formatTokenAmount, type chain } from "$lib/config";
	import { IntentFactory, escrowApprove } from "$lib/libraries/intentFactory";
	import { CompactLib } from "$lib/libraries/compactLib";
	import store from "$lib/state.svelte";
	import InputTokenModal from "../components/InputTokenModal.svelte";
	import OutputTokenModal from "$lib/components/OutputTokenModal.svelte";
	import { ResetPeriod } from "$lib/utils/idLib";
	import type { CreateIntentOptions } from "$lib/libraries/intent";

	const bigIntSum = (...nums: bigint[]) => nums.reduce((a, b) => a + b, 0n);

	let {
		scroll,
		preHook,
		postHook,
		account
	}: {
		scroll: (direction: boolean | number) => () => void;
		preHook?: (chain: chain) => Promise<any>;
		postHook: () => Promise<void>;
		account: () => `0x${string}`;
	} = $props();

	let inputTokenSelectorActive = $state<boolean>(false);
	let outputTokenSelectorActive = $state<boolean>(false);

	const opts = $derived({
		exclusiveFor: store.exclusiveFor,
		inputTokens: store.inputTokens,
		outputTokens: store.outputTokens,
		preHook,
		postHook,
		verifier: store.verifier,
		lock: {
			type: store.intentType,
			allocatorId: store.allocatorId,
			resetPeriod: ResetPeriod.OneDay
		},
		account
	} as CreateIntentOptions);

	const postHookScroll = async () => {
		await postHook();
		scroll(2)();
	};

	const intentFactory = $derived(
		new IntentFactory({
			mainnet: store.mainnet,
			walletClient: store.walletClient,
			preHook,
			postHook: postHookScroll,
			ordersPointer: store.orders
		})
	);

	const approveFunction = $derived(
		store.intentType === "compact"
			? CompactLib.compactApprove(store.walletClient, opts)
			: escrowApprove(store.walletClient, opts)
	);

	let allowanceCheck = $state(true);
	$effect(() => {
		allowanceCheck = true;
		if (!store.allowances[store.inputTokens[0].token.chain]) {
			allowanceCheck = false;
			return;
		}
		for (let i = 0; i < store.inputTokens.length; ++i) {
			const { token, amount } = store.inputTokens[i];
			store.allowances[token.chain][token.address].then((a) => {
				allowanceCheck = allowanceCheck && a >= amount;
			});
		}
	});
	let balanceCheckWallet = $state(true);
	$effect(() => {
		balanceCheckWallet = true;
		if (!store.balances[store.inputTokens[0].token.chain]) {
			balanceCheckWallet = false;
			return;
		}
		for (let i = 0; i < store.inputTokens.length; ++i) {
			const { token, amount } = store.inputTokens[i];
			store.balances[token.chain][token.address].then((b) => {
				balanceCheckWallet = balanceCheckWallet && b >= amount;
			});
		}
	});
	let balanceCheckCompact = $state(true);
	$effect(() => {
		balanceCheckCompact = true;
		if (!store.compactBalances[store.inputTokens[0].token.chain]) {
			balanceCheckCompact = false;
			return;
		}
		for (let i = 0; i < store.inputTokens.length; ++i) {
			const { token, amount } = store.inputTokens[i];
			store.compactBalances[token.chain][token.address].then((b) => {
				balanceCheckCompact = balanceCheckCompact && b >= amount;
			});
		}
	});

	const abstractInputs = $derived.by(() => {
		const inputs: {
			name: string;
			amount: bigint;
			decimals: number;
			chains: string[];
		}[] = [];
		// Get all unique tokens.
		const allUniqueNames = [
			...new Set(
				store.inputTokens.map((v) => {
					return v.token.name;
				})
			)
		];
		for (let i = 0; i < allUniqueNames.length; ++i) {
			const name = allUniqueNames[i];
			inputs[i] = {
				name,
				amount: bigIntSum(...store.inputTokens.map((v) => (v.token.name == name ? v.amount : 0n))),
				decimals: store.inputTokens.find((v) => v.token.name == name)!.token.decimals,
				chains: [
					...new Set(
						store.inputTokens.filter((v) => v.token.name == name).map((v) => v.token.chain)
					)
				]
			};
		}
		return inputs;
	});

	const numInputChains = $derived.by(() => {
		const tokenChains = store.inputTokens.map(({ token }) => token.chain);
		const uniqueChains = [...new Set(tokenChains)];
		return uniqueChains.length;
	});

	const sameChain = $derived.by(() => {
		if (numInputChains > 1) return false;

		// Only 1 input chain is used.
		const inputChain = store.inputTokens[0].token.chain;
		const outputChains = store.outputTokens.map((o) => o.token.chain);
		const numOutputChains = [...new Set(outputChains)].length;
		if (numOutputChains > 1) return false;
		const outputChain = outputChains[0];
		return inputChain === outputChain;
	});
</script>

<div class="relative h-[29rem] w-[25rem] flex-shrink-0 snap-center snap-always p-3">
	<h1 class="mb-1 w-full text-center text-2xl font-medium text-gray-900">Intent Issuance</h1>
	<p class="mb-2 text-center text-xs leading-relaxed text-gray-500">
		Configure assets and execution settings, then issue your intent.
	</p>
	{#if inputTokenSelectorActive}
		<InputTokenModal
			bind:active={inputTokenSelectorActive}
			bind:currentInputTokens={store.inputTokens}
		></InputTokenModal>
	{/if}
	{#if outputTokenSelectorActive}
		<OutputTokenModal
			bind:active={outputTokenSelectorActive}
			bind:currentOutputTokens={store.outputTokens}
		></OutputTokenModal>
	{/if}
	<div class="mt-2 h-[22.25rem] overflow-y-auto pr-1">
		<div class="mt-2 mb-2 flex items-center justify-between gap-2">
			<div class="text-xs font-semibold text-gray-500">Intent pair</div>
			<div class="w-20">
				<GetQuote
					bind:exclusiveFor={store.exclusiveFor}
					mainnet={store.mainnet}
					inputTokens={store.inputTokens}
					bind:outputTokens={store.outputTokens}
					{account}
				></GetQuote>
			</div>
		</div>
		<div class="rounded border border-gray-200 bg-gray-50 p-2">
			<div class="flex w-full flex-row justify-evenly gap-2">
				<div class="flex flex-col justify-center space-y-1">
					<h2 class="text-center text-xs font-semibold text-gray-500">You Pay</h2>
					{#each abstractInputs as input, i (input.name)}
						<button
							data-testid={`open-input-modal-${i}`}
							class="h-14 w-28 cursor-pointer rounded border border-gray-200 bg-white px-2 py-1 text-center transition-shadow ease-linear hover:shadow-md"
							onclick={() => (inputTokenSelectorActive = true)}
						>
							<div class="flex flex-col items-center justify-center align-middle">
								<div class="flex flex-row space-x-1">
									<div>{formatTokenAmount(input.amount, input.decimals)}</div>
									<div class="text-xs font-medium text-gray-600">{input.name.toUpperCase()}</div>
								</div>
								<div class="mt-0.5 text-center text-[11px] leading-tight text-gray-500">
									{#each input.chains as chainName, chainIndex (chainName)}
										<span>{chainName}{chainIndex < input.chains.length - 1 ? ", " : ""}</span>
									{/each}
								</div>
							</div>
						</button>
					{/each}
					{#if numInputChains > 1}
						<div class="text-center text-xs font-semibold text-amber-700">Multichain</div>
					{/if}
					{#if sameChain}
						<div class="text-center text-xs font-semibold text-sky-700">Same chain</div>
					{/if}
				</div>
				<div class="flex flex-col justify-center">
					<div class="flex flex-col items-center text-xs font-semibold text-gray-500">
						<div>In</div>
						<div>exchange</div>
						<div>for</div>
					</div>
				</div>
				<div class="flex flex-col justify-center space-y-1">
					<h2 class="text-center text-xs font-semibold text-gray-500">You Receive</h2>
					{#each store.outputTokens as outputToken, i (`${outputToken.token.chain}-${outputToken.token.address}-${i}`)}
						<button
							data-testid={`open-output-modal-${i}`}
							class="h-14 w-28 cursor-pointer rounded border border-gray-200 bg-white px-2 py-1 text-center transition-shadow ease-linear hover:shadow-md"
							onclick={() => (outputTokenSelectorActive = true)}
						>
							<div class="flex flex-col items-center justify-center align-middle">
								<div class="flex flex-row space-x-1">
									<div>
										{formatTokenAmount(outputToken.amount, outputToken.token.decimals)}
									</div>
									<div class="text-xs font-medium text-gray-600">
										{outputToken.token.name.toUpperCase()}
									</div>
								</div>
								<div class="mt-0.5 text-[11px] leading-tight text-gray-500">
									{outputToken.token.chain}
								</div>
							</div>
						</button>
					{/each}
				</div>
			</div>
		</div>
		<div class="mt-2 rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
			<div class="flex items-center gap-2">
				<div class="flex items-center gap-1">
					<span class="text-[11px] font-semibold text-gray-500">Verifier</span>
					{#if sameChain}
						<FormControl as="select" size="sm" state="disabled" disabled>
							<option selected disabled>Settler</option>
						</FormControl>
					{:else}
						<FormControl as="select" id="verified-by" size="sm">
							<option value="polymer" selected>Polymer</option>
							<option value="wormhole" disabled>Wormhole</option>
						</FormControl>
					{/if}
				</div>
				<div class="h-5 w-px bg-gray-200"></div>
				<div class="flex min-w-0 flex-1 items-center gap-1">
					<span class="text-[11px] font-semibold whitespace-nowrap text-gray-500">Exclusive</span>
					<FormControl
						type="text"
						size="sm"
						className="flex-1"
						placeholder="0x... (optional)"
						bind:value={store.exclusiveFor}
					/>
				</div>
			</div>
		</div>

		<!-- Action Button -->
		<div class="mt-2 flex justify-center">
			{#if !allowanceCheck}
				<AwaitButton buttonFunction={approveFunction}>
					{#snippet name()}
						Set allowance
					{/snippet}
					{#snippet awaiting()}
						Waiting for transaction...
					{/snippet}
				</AwaitButton>
			{:else}
				<div class="flex flex-row space-x-2">
					{#if !balanceCheckWallet}
						<button
							type="button"
							class="h-8 rounded border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-400"
							disabled
						>
							Low Balance
						</button>
					{:else if store.intentType === "escrow"}
						<AwaitButton buttonFunction={intentFactory.openIntent(opts)}>
							{#snippet name()}
								Execute Open
							{/snippet}
							{#snippet awaiting()}
								Waiting for transaction...
							{/snippet}
						</AwaitButton>
					{/if}
					{#if store.intentType === "compact" && store.allocatorId !== POLYMER_ALLOCATOR}
						{#if !balanceCheckCompact}
							<button
								type="button"
								class="h-8 rounded border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-400"
								disabled
							>
								Low Compact Balance
							</button>
						{:else}
							<AwaitButton buttonFunction={intentFactory.compact(opts)}>
								{#snippet name()}
									Sign Order
								{/snippet}
								{#snippet awaiting()}
									Waiting for transaction...
								{/snippet}
							</AwaitButton>
						{/if}
					{/if}
				</div>
			{/if}
		</div>
		{#if numInputChains > 1 && store.intentType !== "compact"}
			<p class="mx-auto mt-2 w-4/5 text-center text-xs text-gray-600">
				You'll need to open the order on {numInputChains} chains. Be prepared and do not interrupt the
				process.
			</p>
		{/if}
	</div>
</div>
