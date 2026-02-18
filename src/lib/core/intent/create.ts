import { COIN_FILLER, chainMap, getOracle, type Verifier } from "../../config";
import { toId } from "../compact/idLib";
import type {
	CompactLock,
	CreateIntentOptions,
	CreateIntentOptionsCompact,
	CreateIntentOptionsEscrow,
	EscrowLock,
	MultichainOrder,
	StandardOrder,
	TokenContext
} from "../types";
import { MultichainOrderIntent } from "./multichain";
import { StandardOrderIntent } from "./standard";
import { buildMandateOutputs } from "./helpers/output-encoding";
import { ONE_DAY, ONE_HOUR, inputSettlerForLock } from "./helpers/shared";

/**
 * @notice Class representing a Li.Fi Intent. Contains intent abstractions and helpers.
 */
export class Intent {
	private lock: EscrowLock | CompactLock;

	private user: () => `0x${string}`;
	private inputs: TokenContext[];
	private outputs: TokenContext[];
	private verifier: Verifier;
	private exclusiveFor: `0x${string}`;

	private _nonce?: bigint;
	private expiry = ONE_DAY;
	private fillDeadline = 2 * ONE_HOUR;

	constructor(opts: CreateIntentOptionsEscrow | CreateIntentOptionsCompact) {
		this.lock = opts.lock;
		this.user = opts.account;
		this.inputs = opts.inputTokens;
		this.outputs = opts.outputTokens;
		this.verifier = opts.verifier;
		this.exclusiveFor = opts.exclusiveFor as `0x${string}`;
	}

	numInputChains() {
		const tokenChains = this.inputs.map(({ token }) => token.chain);
		return [...new Set(tokenChains)].length;
	}

	isMultichain() {
		return this.numInputChains() > 1;
	}

	isSameChain() {
		if (this.isMultichain()) return false;
		const inputChain = this.inputs[0].token.chain;
		const outputChains = this.outputs.map((o) => o.token.chain);
		const numOutputChains = [...new Set(outputChains)].length;
		if (numOutputChains > 1) return false;
		const outputChain = this.outputs[0].token.chain;
		return inputChain === outputChain;
	}

	nonce() {
		if (this._nonce) return this._nonce;
		this._nonce = BigInt(Math.floor(Math.random() * 2 ** 32));
		return this._nonce;
	}

	inputSettler(multichain: boolean) {
		return inputSettlerForLock(this.lock, multichain);
	}

	singlechain() {
		if (this.isMultichain()) {
			throw new Error(`Not supported as single chain with ${this.numInputChains()} chains`);
		}

		const inputChain = this.inputs[0].token.chain;
		const inputs: [bigint, bigint][] = this.inputs.map(({ token, amount }) => [
			this.lock.type === "compact"
				? toId(true, this.lock.resetPeriod, this.lock.allocatorId, token.address)
				: BigInt(token.address),
			amount
		]);

		const currentTime = Math.floor(Date.now() / 1000);
		const inputOracle = this.isSameChain() ? COIN_FILLER : getOracle(this.verifier, inputChain)!;

		const order: StandardOrder = {
			user: this.user(),
			nonce: this.nonce(),
			originChainId: BigInt(chainMap[inputChain].id),
			fillDeadline: currentTime + this.fillDeadline,
			expires: currentTime + this.expiry,
			inputOracle,
			inputs,
			outputs: buildMandateOutputs({
				exclusiveFor: this.exclusiveFor,
				outputTokens: this.outputs,
				verifier: this.verifier,
				sameChain: this.isSameChain(),
				recipient: this.user(),
				currentTime
			})
		};

		return new StandardOrderIntent(this.inputSettler(false), order);
	}

	multichain() {
		const currentTime = Math.floor(Date.now() / 1000);
		const inputOracle = getOracle(this.verifier, this.inputs[0].token.chain)!;

		const inputs: { chainId: bigint; inputs: [bigint, bigint][] }[] = [
			...new Set(this.inputs.map(({ token }) => token.chain))
		].map((chain) => {
			const chainInputs = this.inputs.filter(({ token }) => token.chain === chain);
			return {
				chainId: BigInt(chainMap[chain].id),
				inputs: chainInputs.map(({ token, amount }) => [
					this.lock.type === "compact"
						? toId(true, this.lock.resetPeriod, this.lock.allocatorId, token.address)
						: BigInt(token.address),
					amount
				])
			};
		});

		const order: MultichainOrder = {
			user: this.user(),
			nonce: this.nonce(),
			fillDeadline: currentTime + this.fillDeadline,
			expires: currentTime + this.expiry,
			inputOracle,
			outputs: buildMandateOutputs({
				exclusiveFor: this.exclusiveFor,
				outputTokens: this.outputs,
				verifier: this.verifier,
				sameChain: false,
				recipient: this.user(),
				currentTime
			}),
			inputs
		};

		return new MultichainOrderIntent(this.inputSettler(true), order, this.lock);
	}

	order() {
		if (this.isMultichain()) return this.multichain();
		return this.singlechain();
	}
}

export type { CreateIntentOptions };
