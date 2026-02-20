export type NoSignature = {
  type: "None";
  payload: "0x";
};

export type Signature = {
  type: "ECDSA" | "ERC-1271";
  payload: `0x${string}`;
};
