import { createPublicClient, createWalletClient, custom, fallback, http } from "viem";
import { arbitrumSepolia, baseSepolia, optimismSepolia, sepolia } from "viem/chains";

export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000" as const;
export const BYTES32_ZERO =
	"0x0000000000000000000000000000000000000000000000000000000000000000" as const;
export const COMPACT = "0x00000000000000171ede64904551eeDF3C6C9788" as const;
export const INPUT_SETTLER_COMPACT_LIFI = "0x000000c9eC71B1a39055Ec631200ED0022140074" as const;
export const INPUT_SETTLER_ESCROW_LIFI = "0x000001bf3F3175BD007f3889b50000c7006E72c0" as const;
export const ALWAYS_OK_ALLOCATOR = "301267367668059890006832136" as const;
export const POLYMER_ALLOCATOR = "116450367070547927622991121" as const; // 0x02ecC89C25A5DCB1206053530c58E002a737BD11 signing by 0x934244C8cd6BeBDBd0696A659D77C9BDfE86Efe6
export const COIN_FILLER = "0x00000000D7278408CE7a490015577c41e57143a5" as const;
export const WORMHOLE_ORACLE = {
	sepolia: "0x0000000000000000000000000000000000000000",
	baseSepolia: "0x0000000000000000000000000000000000000000",
	arbitrumSepolia: "0x0000000000000000000000000000000000000000",
	optimismSepolia: "0x0000000000000000000000000000000000000000"
} as const;
export const POLYMER_ORACLE = {
	sepolia: "0x00d5b500ECa100F7cdeDC800eC631Aca00BaAC00",
	baseSepolia: "0x00d5b500ECa100F7cdeDC800eC631Aca00BaAC00",
	arbitrumSepolia: "0x00d5b500ECa100F7cdeDC800eC631Aca00BaAC00",
	optimismSepolia: "0x00d5b500ECa100F7cdeDC800eC631Aca00BaAC00"
} as const;

export type availableAllocators = typeof ALWAYS_OK_ALLOCATOR | typeof POLYMER_ALLOCATOR;
export type availableInputSettlers =
	| typeof INPUT_SETTLER_COMPACT_LIFI
	| typeof INPUT_SETTLER_ESCROW_LIFI;
export type balanceQuery = Record<chain, Record<`0x${string}`, Promise<bigint>>>;

export type Token = {
	address: `0x${string}`;
	name: string;
	chain: chain;
	decimals: number;
};

export const coinList = [
	{
		address: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`,
		name: "usdc",
		chain: "sepolia",
		decimals: 6
	},
	{
		address: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`,
		name: "usdc",
		chain: "baseSepolia",
		decimals: 6
	},
	{
		address: `0x5fd84259d66Cd46123540766Be93DFE6D43130D7`,
		name: "usdc",
		chain: "optimismSepolia",
		decimals: 6
	},
	{
		address: ADDRESS_ZERO,
		name: "eth",
		chain: "sepolia",
		decimals: 18
	},
	{
		address: ADDRESS_ZERO,
		name: "eth",
		chain: "baseSepolia",
		decimals: 18
	},
	{
		address: ADDRESS_ZERO,
		name: "eth",
		chain: "optimismSepolia",
		decimals: 18
	},
	{
		address: `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14`,
		name: "weth",
		chain: "sepolia",
		decimals: 18
	},
	{
		address: `0x4200000000000000000000000000000000000006`,
		name: "weth",
		chain: "baseSepolia",
		decimals: 18
	},
	{
		address: `0x4200000000000000000000000000000000000006`,
		name: "weth",
		chain: "optimismSepolia",
		decimals: 18
	}
] as const;

export function printToken(token: Token) {
	return `${token.name.toUpperCase()}, ${token.chain}`;
}

export function formatTokenAmount(amount: bigint, token: Token) {
	return Number(amount) / 10 ** token.decimals;
}

export function getIndexOf(token: Token) {
	for (let i = 0; i < coinList.length; ++i) {
		const elem = coinList[i];
		if (token.chain === elem.chain && token.address === elem.address) return i;
	}
	return -1;
}

export type coin = (typeof coinList)[number]["address"];

export const wormholeChainIds = {
	sepolia: 10002,
	arbitrumSepolia: 10003,
	baseSepolia: 10004,
	optimismSepolia: 10005
} as const;
export const polymerChainIds = {
	sepolia: sepolia.id,
	arbitrumSepolia: arbitrumSepolia.id,
	baseSepolia: baseSepolia.id,
	optimismSepolia: optimismSepolia.id
} as const;

export type Verifier = "wormhole" | "polymer";

export const chainMap = { sepolia, optimismSepolia, baseSepolia } as const;
export const chains = Object.keys(chainMap) as (keyof typeof chainMap)[];
export type chain = (typeof chains)[number];

export function getCoin(
	args:
		| { name: string; chain: chain; address?: undefined }
		| {
				address: `0x${string}`;
				chain: chain;
				name?: undefined;
		  }
) {
	const { name = undefined, address = undefined, chain } = args;
	// ensure the address is ERC20-sized.
	const concatedAddress =
		"0x" + address?.replace("0x", "")?.slice(address.length - 42, address.length);
	for (const token of coinList) {
		// check chain first.
		if (token.chain === chain) {
			if (name === undefined) {
				if (concatedAddress === token.address) return token;
			}
			if (name === token.name) return token;
		}
	}
	throw new Error(`No coins found for chain: ${concatedAddress} ${chain}`);
}

export function getChainName(chainId: number | bigint | string) {
	if (typeof chainId === "string") chainId = Number(chainId);
	if (typeof chainId === "bigint") chainId = Number(chainId);
	for (const key of chains) {
		if (chainMap[key].id === chainId) {
			return key;
		}
	}
	throw new Error(`Chain is not known: ${chainId}`);
}

export function formatTokenDecimals(
	value: bigint | number,
	coin: Token,
	as: "number" | "string" = "string"
) {
	const decimals = coin.decimals;
	const result = Number(value) / 10 ** decimals;
	return as === "string" ? result.toString() : result;
}

export function getOracle(verifier: Verifier, chain: chain) {
	if (verifier === "wormhole") return WORMHOLE_ORACLE[chain];
	if (verifier === "polymer") return POLYMER_ORACLE[chain];
}

export function getClient(chainId: number | bigint | string) {
	const chainName = getChainName(Number(chainId));
	if (!chainName) new Error("Could not find chain");
	return clients[chainName];
}

export const clients = {
	sepolia: createPublicClient({
		chain: sepolia,
		transport: fallback([
			http("https://ethereum-sepolia-rpc.publicnode.com"),
			...sepolia.rpcUrls.default.http.map((v) => http(v))
		])
	}),
	arbitrumSepolia: createPublicClient({
		chain: arbitrumSepolia,
		transport: fallback([
			http("https://arbitrum-sepolia-rpc.publicnode.com"),
			...arbitrumSepolia.rpcUrls.default.http.map((v) => http(v))
		])
	}),
	baseSepolia: createPublicClient({
		chain: baseSepolia,
		transport: fallback([
			http("https://base-sepolia-rpc.publicnode.com"),
			...baseSepolia.rpcUrls.default.http.map((v) => http(v))
		])
	}),
	optimismSepolia: createPublicClient({
		chain: optimismSepolia,
		transport: fallback([
			http("https://optimism-sepolia-rpc.publicnode.com"),
			...optimismSepolia.rpcUrls.default.http.map((v) => http(v))
		])
	})
} as const;

export type WC = ReturnType<
	typeof createWalletClient<ReturnType<typeof custom>, undefined, undefined, undefined>
>;
