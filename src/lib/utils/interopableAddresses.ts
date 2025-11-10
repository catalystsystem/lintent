function padEven(s: string, minimal = 2, pad: string = "0") {
	return s.padStart(((Math.max(s.length + 1, minimal) / 2) | 0) * 2, pad);
}

function toHex(num: number | bigint, bytes: number = 1) {
	return padEven(num.toString(16), bytes * 2);
}

type Version = "0001";
type ChainType = "0000";
type ChainReferenceLength = string;
type ChainReference = string;
type Address = string;

export type InteropableAddress =
	`0x${Version}${ChainType}${ChainReferenceLength}${ChainReference}${Address}`;

export const getInteropableAddress = (
	address: `0x${string}`,
	chainId: number | bigint
): InteropableAddress => {
	const version = "0001";
	const chainType = "0000";

	const chainReference = padEven(chainId.toString(16));
	const chainReferenceLength = toHex(chainReference.length / 2);

	return `0x${version}${chainType}${chainReferenceLength}${chainReference}${toHex(
		address.replace("0x", "").length / 2
	)}${address.replace("0x", "")}`;
};
