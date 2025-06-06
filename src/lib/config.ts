import {
    createPublicClient,
    createWalletClient,
    custom,
    fallback,
    http,
} from "viem";
import {
    arbitrumSepolia,
    baseSepolia,
    optimismSepolia,
    sepolia,
} from "viem/chains";

export const ADDRESS_ZERO =
    "0x0000000000000000000000000000000000000000" as const;
export const BYTES32_ZERO =
    "0x0000000000000000000000000000000000000000000000000000000000000000" as const;
export const COMPACT = "0x70EEFf73E540C8F68477510F096c0d903D31594a" as const;
export const CATALYST_SETTLER =
    "0x0ebD1a4EE74A98291B3E1A6c84016b54A134B68a" as const;
export const DEFAULT_ALLOCATOR = "208895859788420342859855417" as const;
export const COIN_FILLER =
    "0xd83a1a16822680D0a7666B9d2744B05D6aec7c2e" as const;
export const WORMHOLE_ORACLE = {
    sepolia: "0x069cfFa455b2eFFd8adc9531d1fCd55fd32B04Cb",
    baseSepolia: "0xb2477079b498594192837fa3EC4Ebc97153eaA65",
    arbitrumSepolia: "0x46080096B5970d26634479f2F40e9e264B8D439b",
    optimismSepolia: "0xb516aD609f9609C914F5292084398B44fBE84A0C",
} as const;
export const POLYMER_ORACLE = {
    sepolia: "0x8CC4969a529dE674B72E77C5205229c6b4a17755",
    baseSepolia: "0x8CC4969a529dE674B72E77C5205229c6b4a17755",
    arbitrumSepolia: "0x8CC4969a529dE674B72E77C5205229c6b4a17755",
    optimismSepolia: "0x8CC4969a529dE674B72E77C5205229c6b4a17755",
} as const;

export const coinMap = {
    sepolia: {
        [ADDRESS_ZERO]: "eth",
        "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238": "usdc",
        "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14": "weth",
    },
    baseSepolia: {
        [ADDRESS_ZERO]: "eth",
        "0x036CbD53842c5426634e7929541eC2318f3dCF7e": "usdc",
        "0x4200000000000000000000000000000000000006": "weth",
    },
    optimismSepolia: {
        [ADDRESS_ZERO]: "eth",
        "0x5fd84259d66Cd46123540766Be93DFE6D43130D7": "usdc",
        "0x4200000000000000000000000000000000000006": "weth",
    },
} as const;

// Automatically infer the union of all coin address keys across all chains
export type coin = {
    [K in keyof typeof coinMap]: keyof (typeof coinMap)[K];
}[keyof typeof coinMap];
//export type coin = keyof typeof coinMap[chain];

export const wormholeChainIds = {
    sepolia: 10002,
    arbitrumSepolia: 10003,
    baseSepolia: 10004,
    optimismSepolia: 10005,
} as const;
export const polymerChainIds = {
    sepolia: sepolia.id,
    arbitrumSepolia: arbitrumSepolia.id,
    baseSepolia: baseSepolia.id,
    optimismSepolia: optimismSepolia.id,
} as const;

export type verifier = "wormhole" | "polymer";

export const decimalMap = {
    "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238": 6,
    "0x036CbD53842c5426634e7929541eC2318f3dCF7e": 6,
    "0x5fd84259d66Cd46123540766Be93DFE6D43130D7": 6,
    "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14": 18,
    "0x4200000000000000000000000000000000000006": 18,
    [ADDRESS_ZERO]: 18,
} as const;

export const chainMap = { sepolia, optimismSepolia, baseSepolia } as const;
export const chains = Object.keys(chainMap) as (keyof typeof chainMap)[];
export type chain = (typeof chains)[number];

export function getCoins(chain: chain) {
    if (!coinMap[chain]) {
        throw new Error(`No coins found for chain: ${chain}`);
    }
    return Object.keys(coinMap[chain]) as (keyof typeof coinMap[chain])[];
}

export function getCoinAddresses(chain: chain) {
    if (!coinMap[chain]) {
        throw new Error(`No coins found for chain: ${chain}`);
    }
    return Object.values(
        coinMap[chain],
    ) as (typeof coinMap[chain][keyof typeof coinMap[chain]])[];
}

export function getChainName(chainId: number) {
    for (const key of chains) {
        if (chainMap[key].id === chainId) {
            return key;
        }
    }
}

export function getTokenKeyByAddress(chain: chain, address: string) {
    const coins = getCoins(chain);
    for (const coin of coins) {
        if (coin === address) {
            return coinMap[chain][coin];
        }
    }
}

export function formatTokenDecimals(
    value: bigint | number,
    coin: coin,
    as: "number" | "string" = "string",
) {
    const decimals = decimalMap[coin];
    const result = Number(value) / 10 ** decimals;
    return as === "string" ? result.toString() : result;
}

export function getOracle(verifier: verifier, chain: chain) {
    if (verifier === "wormhole") return WORMHOLE_ORACLE[chain];
    if (verifier === "polymer") return POLYMER_ORACLE[chain];
}

export const clients = {
    sepolia: createPublicClient({
        chain: sepolia,
        transport: fallback([
            http("https://ethereum-sepolia-rpc.publicnode.com"),
            ...sepolia.rpcUrls.default.http.map((v) => http(v)),
        ]),
    }),
    arbitrumSepolia: createPublicClient({
        chain: arbitrumSepolia,
        transport: fallback([
            http("https://arbitrum-sepolia-rpc.publicnode.com"),
            ...arbitrumSepolia.rpcUrls.default.http.map((v) => http(v)),
        ]),
    }),
    baseSepolia: createPublicClient({
        chain: baseSepolia,
        transport: fallback([
            http("https://base-sepolia-rpc.publicnode.com"),
            ...baseSepolia.rpcUrls.default.http.map((v) => http(v)),
        ]),
    }),
    optimismSepolia: createPublicClient({
        chain: optimismSepolia,
        transport: fallback([
            http("https://optimism-sepolia-rpc.publicnode.com"),
            ...optimismSepolia.rpcUrls.default.http.map((v) => http(v)),
        ]),
    }),
} as const;

export type WC = ReturnType<
    typeof createWalletClient<
        ReturnType<typeof custom>,
        undefined,
        undefined,
        undefined
    >
>;
