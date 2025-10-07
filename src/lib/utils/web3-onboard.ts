import Onboard from "@web3-onboard/core";
import type { OnboardAPI } from "@web3-onboard/core";
import injectedWalletsModule from "@web3-onboard/injected-wallets";
import zealWalletModule from "@web3-onboard/zeal";
import coinbaseWalletModule from "@web3-onboard/coinbase";
import walletConnectModule from "@web3-onboard/walletconnect";
import { PUBLIC_WALLET_CONNECT_PROJECT_ID } from "$env/static/public";
import { chainMap } from "../config";

const injected = injectedWalletsModule();
const zealWalletSdk = zealWalletModule();
const coinbaseWalletSdk = coinbaseWalletModule();
const walletConnect = walletConnectModule({
	projectId: PUBLIC_WALLET_CONNECT_PROJECT_ID
});

const wallets = [injected, walletConnect, zealWalletSdk, coinbaseWalletSdk];

const INFURA_ID = "";

const getChains = () => {
	return Object.values(chainMap).map((v) => {
		return {
			id: v.id,
			token: v.nativeCurrency.symbol,
			label: v.name,
			rpcUrl: v.rpcUrls.default.http[0]
		};
	});
};

const appMetadata = {
	name: "Open Intents Framework Demo",
	icon: "<svg />",
	logo: "<svg />",
	description: "A demo website showcasing using the Open Intents Framework. Built by LIFI.",
	recommendedInjectedWallets: [
		{ name: "Coinbase", url: "https://wallet.coinbase.com/" },
		{ name: "MetaMask", url: "https://metamask.io" }
	]
};
let onboard: OnboardAPI | undefined;

if (!onboard) {
	onboard = Onboard({
		// wagmi,
		wallets,
		chains: getChains(),
		appMetadata,
		connect: {
			autoConnectLastWallet: true
		}
	});
}

export default onboard as OnboardAPI;
