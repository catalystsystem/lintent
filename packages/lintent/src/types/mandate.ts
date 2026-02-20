export type MandateOutput = {
  oracle: `0x${string}`;
  settler: `0x${string}`;
  chainId: bigint;
  token: `0x${string}`;
  amount: bigint;
  recipient: `0x${string}`;
  callbackData: `0x${string}`;
  context: `0x${string}`;
};

export type CompactMandate = {
  fillDeadline: number;
  inputOracle: `0x${string}`;
  outputs: MandateOutput[];
};
