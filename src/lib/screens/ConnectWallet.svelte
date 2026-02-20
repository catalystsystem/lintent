<script lang="ts">
	import ScreenFrame from "$lib/components/ui/ScreenFrame.svelte";

	let { onboard }: { onboard: any } = $props();
	let connecting = $state(false);

	const connectWallet = async () => {
		try {
			connecting = true;
			await onboard.connectWallet();
		} finally {
			connecting = false;
		}
	};
</script>

<ScreenFrame title="" description="" contentClass="px-0" bodyClass="h-full">
	<button
		type="button"
		class="h-full w-full cursor-pointer text-base font-semibold text-gray-700 hover:text-sky-700 disabled:cursor-not-allowed disabled:text-gray-400"
		disabled={connecting}
		onclick={connectWallet}
	>
		{connecting ? "Waiting for wallet..." : "Connect Wallet"}
	</button>
</ScreenFrame>
