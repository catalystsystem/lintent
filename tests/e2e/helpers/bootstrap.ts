import type { Page } from "@playwright/test";

export async function bootstrapConnectedWallet(page: Page) {
	await page.evaluate(async () => {
		const { default: store } = await import("/src/lib/state.svelte.ts");
		(store as any).activeWallet.wallet = {
			accounts: [{ address: "0x1111111111111111111111111111111111111111" }],
			provider: {
				request: async () => null
			}
		};
	});
}
