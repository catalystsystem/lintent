export type CoreToken = {
  address: `0x${string}`;
  name: string;
  chainId: bigint;
  decimals: number;
};

export type TokenContext = {
  token: CoreToken;
  amount: bigint;
};
