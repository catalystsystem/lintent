import { sepolia, optimismSepolia, baseSepolia } from 'viem/chains';

export const ADDRESS_ZERO =
    "0x0000000000000000000000000000000000000000" as const;
export const BYTES32_ZERO = "0x0000000000000000000000000000000000000000000000000000000000000000" as const;
export const COMPACT = "0xE7d08C4D2a8AB8512b6a920bA8E4F4F11f78d376" as const;
export const CATALYST_SETTLER =
    "0xf5D08Ca45a5C98706715F1eEed431798F0E3c5ac" as const;
export const DEFAULT_ALLOCATOR = "22031956229997787190855790" as const;
export const ALWAYS_YES_ORACLE =
    "0xabFd7B10F872356BEbe82405e3D83B3E5C8BE8c8" as const;
export const COIN_FILLER =
    "0x0a8a2521325B259f531F353A55615817FC1d672d" as const;
export const WORMHOLE_ORACLE = {
    sepolia: "0x069cfFa455b2eFFd8adc9531d1fCd55fd32B04Cb",
    baseSepolia: "0xb2477079b498594192837fa3EC4Ebc97153eaA65",
    arbitrumSepolia: "0x46080096B5970d26634479f2F40e9e264B8D439b",
    optimismSepolia: "0xb516aD609f9609C914F5292084398B44fBE84A0C",
} as const;

export const coinMap = {
    sepolia: {
        eth: ADDRESS_ZERO,
        usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
        weth: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    },
    baseSepolia: {
        eth: ADDRESS_ZERO,
        usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        weth: "0x4200000000000000000000000000000000000006",
    },
    optimismSepolia: {
        eth: ADDRESS_ZERO,
        usdc: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
        weth: "0x4200000000000000000000000000000000000006",
    },
} as const;

export const wormholeChainIds = {
    sepolia: 10002,
    arbitrumSepolia: 10003,
    baseSepolia: 10004,
    optimismSepolia: 10005
} as const;

export const decimalMap = {
    eth: 18,
    usdc: 6,
    weth: 18
} as const;

export const chainMap = { sepolia, optimismSepolia, baseSepolia } as const;
export const chains = Object.keys(chainMap) as (keyof typeof chainMap)[];
export type chain = (typeof chains)[number];
export type coin = keyof typeof coinMap[chain];

export function getCoins(chain: chain) {
    if (!coinMap[chain]) {
        throw new Error(`No coins found for chain: ${chain}`);
    }
    return Object.keys(coinMap[chain]) as (keyof typeof coinMap[chain])[];
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
        if (coinMap[chain][coin] === address) {
            return coin;
        }
    }
    console.log({ chain, address });
}

export function formatTokenDecmials(
    value: bigint | number,
    coin: coin,
): string {
    const decimals = decimalMap[coin];
    return (Number(value) / 10 ** decimals).toString();
}