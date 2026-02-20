export type CoreVerifier = "wormhole" | "polymer" | (string & {});

export type IntentDeps = {
  getOracle: (
    verifier: CoreVerifier,
    chainId: bigint,
  ) => `0x${string}` | undefined;
};

export type StandardOrderValidationDeps = {
  allowedInputOracles: (
    args: Readonly<{ chainId: bigint; sameChainFill: boolean }>,
  ) => readonly `0x${string}`[] | undefined;
  allowedOutputOracles: (
    chainId: bigint,
  ) => readonly `0x${string}`[] | undefined;
  allowedOutputSettlers: () => readonly `0x${string}`[];
};

export type OrderContainerValidationDeps = StandardOrderValidationDeps & {
  inputSettlers: readonly `0x${string}`[];
};

export type OrderValidationDeps = OrderContainerValidationDeps;
