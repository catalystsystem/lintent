<script lang="ts">
	import AwaitButton from "$lib/components/AwaitButton.svelte";

	let { onboard }: { onboard: any } = $props();
</script>

<div class="h-[29rem] w-[25rem] snap-center snap-always p-4 px-10">
	<h1 class="mb-1 w-full text-center text-2xl font-medium text-gray-900">Connect Wallet</h1>
	<p class="mb-2 text-center text-xs leading-relaxed text-gray-500">
		Connect your wallet to continue with intent issuance and filling.
	</p>
	<div class="mb-14 flex h-[22rem] flex-col items-center justify-center align-middle">
		<AwaitButton buttonFunction={() => onboard.connectWallet()} baseClass={["h-full w-full"]}>
			{#snippet name()}
				Connect Wallet
			{/snippet}
			{#snippet awaiting()}
				Waiting for wallet...
			{/snippet}
		</AwaitButton>
		<div></div>
	</div>
</div>
