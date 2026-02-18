import type { MultichainOrder, StandardOrder } from "../types";
import { MultichainOrderIntent } from "./multichain";
import { StandardOrderIntent } from "./standard";

export function orderToIntent(options: {
	inputSettler: `0x${string}`;
	order: StandardOrder;
	lock?: { type: string };
}): StandardOrderIntent;
export function orderToIntent(options: {
	inputSettler: `0x${string}`;
	order: MultichainOrder;
	lock?: { type: string };
}): MultichainOrderIntent;
export function orderToIntent(options: {
	inputSettler: `0x${string}`;
	order: StandardOrder | MultichainOrder;
	lock?: { type: string };
}): StandardOrderIntent | MultichainOrderIntent;
export function orderToIntent(options: {
	inputSettler: `0x${string}`;
	order: StandardOrder | MultichainOrder;
	lock?: { type: string };
}): StandardOrderIntent | MultichainOrderIntent {
	const { inputSettler, order, lock } = options;
	if ("originChainId" in order) {
		return new StandardOrderIntent(inputSettler, order as StandardOrder);
	}
	return new MultichainOrderIntent(inputSettler, order as MultichainOrder, lock);
}
