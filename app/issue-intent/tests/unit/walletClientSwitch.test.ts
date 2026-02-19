import { describe, expect, it, mock } from "bun:test";
import { switchWalletChain } from "../../src/lib/utils/walletClient";

describe("switchWalletChain", () => {
	it("uses walletClient.switchChain when available", async () => {
		const switchChain = mock(async () => undefined);
		const walletClient = { switchChain } as unknown as Parameters<typeof switchWalletChain>[0];
		await switchWalletChain(walletClient, 8453);
		expect(switchChain).toHaveBeenCalledWith({ id: 8453 });
	});

	it("falls back to provider wallet_switchEthereumChain", async () => {
		const request = mock(async () => null);
		const walletClient = {} as unknown as Parameters<typeof switchWalletChain>[0];
		const provider = { request } as unknown as NonNullable<
			Parameters<typeof switchWalletChain>[2]
		>["provider"];
		await switchWalletChain(walletClient, 8453, { provider });
		expect(request).toHaveBeenCalledWith({
			method: "wallet_switchEthereumChain",
			params: [{ chainId: "0x2105" }]
		});
	});
});
