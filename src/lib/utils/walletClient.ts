import type { EIP1193Provider } from "viem";
import { toHex } from "viem";
import type { WC } from "$lib/config";

type SwitchableWalletClient = WC & {
	switchChain?: (args: { id: number }) => Promise<unknown>;
};

async function resolveWalletProvider(
	walletClient: WC | undefined,
	provider?: EIP1193Provider
): Promise<EIP1193Provider | undefined> {
	if (provider?.request) return provider;

	const walletClientWithTransport = walletClient as
		| (WC & { transport?: { value?: EIP1193Provider } })
		| undefined;
	const transportProvider = walletClientWithTransport?.transport?.value;
	if (transportProvider?.request) return transportProvider;

	try {
		const { getCurrentProvider } = await import("./wagmi");
		return await getCurrentProvider();
	} catch {
		return undefined;
	}
}

export async function switchWalletChain(
	walletClient: WC | undefined,
	chainId: number,
	options?: { provider?: EIP1193Provider }
) {
	if (!walletClient) return;

	const switchableClient = walletClient as SwitchableWalletClient;
	if (typeof switchableClient.switchChain === "function") {
		await switchableClient.switchChain({ id: chainId });
		return;
	}

	const provider = await resolveWalletProvider(walletClient, options?.provider);
	if (!provider?.request) {
		throw new Error(
			`Wallet client does not support switchChain and no provider is available for chain ${chainId}.`
		);
	}

	await provider.request({
		method: "wallet_switchEthereumChain",
		params: [{ chainId: toHex(chainId) }]
	});
}
