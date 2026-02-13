<script lang="ts">
	import AwaitButton from "$lib/components/AwaitButton.svelte";
	import ScreenFrame from "$lib/components/ui/ScreenFrame.svelte";

	let { onboard }: { onboard: any } = $props();
</script>

<ScreenFrame
	title="Connect Wallet"
	description="Connect your wallet to continue with intent issuance and filling."
	contentClass="px-10"
	bodyClass="mb-14 flex h-[22rem] flex-col items-center justify-center align-middle"
>
	<AwaitButton buttonFunction={() => onboard.connectWallet()} fullWidth baseClass={["h-full"]}>
		{#snippet name()}
			Connect Wallet
		{/snippet}
		{#snippet awaiting()}
			Waiting for wallet...
		{/snippet}
	</AwaitButton>
	<div></div>
</ScreenFrame>
