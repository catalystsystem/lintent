<script lang="ts">
	import { encodeMandateOutput, getOrderId, getOutputHash } from '$lib/utils/lifiintent/OrderLib';
	import { keccak256, zeroAddress } from 'viem';
	import type { MandateOutput, StandardOrder } from '../../types';
	import {
		ADDRESS_ZERO,
		BYTES32_ZERO,
		clients,
		COMPACT,
		formatTokenDecimals,
		getChainName,
		getTokenKeyByAddress,
		POLYMER_ORACLE,
		type chain,
		type coin,
		type verifier,
		type WC
	} from '$lib/config';
	import { addressToBytes32, bytes32ToAddress, idToToken, trunc } from '$lib/utils/convert';
	import { COIN_FILLER_ABI } from '$lib/abi/coinfiller';
	import { POLYMER_ORACLE_ABI } from '$lib/abi/polymeroracle';
	import { COMPACT_ABI } from '$lib/abi/compact';
	import AwaitButton from './AwaitButton.svelte';
	import { claim, fill, validate } from '$lib/utils/lifiintent/tx';

	const orderInputs: { submit: number[]; validate: string[] } = $state({ submit: [], validate: [] });
	const {
		orders,
		walletClient,
		opts = $bindable()
	}: {
		orders: { order: StandardOrder; signature: `0x${string}` }[];
		walletClient: WC;
		opts: {
			preHook?: (chain?: chain) => Promise<any>;
			postHook?: () => Promise<any>;
			inputAsset: coin;
			inputAmount: bigint;
			outputAsset: coin;
			outputAmount: bigint;
			outputChain: chain;
			verifier: verifier;
			account: () => `0x${string}`;
			inputChain: chain;
		};
	} = $props();

	async function checkIfFilled(orderId: `0x${string}`, output: MandateOutput) {
		const outputHash = getOutputHash(output);
		const outputChain = getChainName(Number(output.chainId))!;
		return await clients[outputChain].readContract({
			address: bytes32ToAddress(output.remoteFiller),
			abi: COIN_FILLER_ABI,
			functionName: 'filledOutputs',
			args: [orderId, outputHash]
		});
	}

	async function checkIfValidated(
		order: StandardOrder,
		outputIndex: number = 1,
		transactionHash: `0x${string}`
	) {
		if (!transactionHash || !transactionHash.startsWith('0x') || transactionHash.length != 66)
			return false;
		const output = order.outputs[outputIndex]; // TODO: check all outputs at the same time.
		const outputChain = getChainName(Number(output.chainId))!;
		const transactionReceipt = await clients[outputChain].getTransactionReceipt({
			hash: transactionHash
		});
		const blockHashOfFill = transactionReceipt.blockHash;
		const block = await clients[outputChain].getBlock({
			blockHash: blockHashOfFill
		});
		const fillTimestamp = block.timestamp;
		const orderId = getOrderId(order);
		const encodedOutput = encodeMandateOutput(
			addressToBytes32(opts.account()),
			orderId,
			Number(fillTimestamp),
			output
		);
		const sourceChain = getChainName(Number(order.originChainId))!;
		const outputHash = keccak256(encodedOutput);
		return await clients[sourceChain].readContract({
			address: order.localOracle,
			abi: POLYMER_ORACLE_ABI,
			functionName: 'isProven',
			args: [output.chainId, output.remoteOracle, output.remoteFiller, outputHash]
		});
	}

	async function checkIfClaimed(order: StandardOrder, _: any) {
		const sourceChain = getChainName(Number(order.originChainId))!;
		// Get the allocator address:
		const [token, allocator, resetPeriod, scope] = await clients[sourceChain].readContract({
			address: COMPACT,
			abi: COMPACT_ABI,
			functionName: 'getLockDetails',
			args: [order.inputs[0][0]]
		});
		return await clients[sourceChain].readContract({
			address: COMPACT,
			abi: COMPACT_ABI,
			functionName: 'hasConsumedAllocatorNonce',
			args: [order.nonce, allocator]
		});
	}
</script>

<div class="mx-auto mt-3 w-11/12 rounded-md p-4">
	<table class="min-w-full table-auto overflow-hidden rounded-lg border border-gray-200">
		<thead class="bg-gray-100 text-left">
			<tr>
				<th class="px-4 py-2 text-sm font-medium text-gray-700">OrderId</th>
				<th class="px-4 py-2 text-sm font-medium text-gray-700">User</th>
				<th class="px-4 py-2 text-sm font-medium text-gray-700">From</th>
				<th class="px-4 py-2 text-sm font-medium text-gray-700">To</th>
				<th class="px-4 py-2 text-sm font-medium text-gray-700">Input</th>
				<th class="px-4 py-2 text-sm font-medium text-gray-700">Output</th>
				<th class="px-4 py-2 text-sm font-medium text-gray-700">Fill</th>
				<th class="px-4 py-2 text-sm font-medium text-gray-700">Submit</th>
				<th class="px-4 py-2 text-sm font-medium text-gray-700">Validate</th>
				<th class="px-4 py-2 text-sm font-medium text-gray-700">Claim</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-gray-200">
			{#each orders.filter(({ order }) => order.inputs.length === 1 && order.outputs.length === 1) as { order, signature }, index (getOrderId(order))}
				<tr class="hover:bg-gray-50">
					<td class="px-4 py-2 text-sm text-gray-800">{getOrderId(order).slice(2, 8)}...</td>
					<td class="px-4 py-2 text-sm text-gray-800">{trunc(order.user as `0x${string}`)}</td>
					<td class="px-4 py-2 text-sm text-gray-800"
						>{getChainName(Number(order.originChainId))}</td
					>
					<td class="px-4 py-2 text-sm text-gray-800"
						>{getChainName(Number(order.outputs[0].chainId))}</td
					>
					<td class="px-4 py-2 text-sm text-gray-800">
						{order.inputs
							.map(
								([token, amount]) =>
									`${getTokenKeyByAddress(getChainName(Number(order.originChainId))!, idToToken(token))}: ${formatTokenDecimals(amount, idToToken(token) as coin)}`
							)
							.join(', ')}
					</td>
					<td class="px-4 py-2 text-sm text-gray-800">
						{order.outputs
							.map(
								({ token, amount }) =>
									`${getTokenKeyByAddress(getChainName(Number(order.outputs[0].chainId))!, idToToken(token as `0x${string}`))}: ${formatTokenDecimals(amount, idToToken(token) as coin)}`
							)
							.join(', ')}
					</td>
					<td class="flex">
						{#await checkIfFilled(getOrderId(order), order.outputs[0])}
							<button
								type="button"
								class="h-8 rounded-r border px-4 text-xl font-bold text-gray-300"
								disabled
							>
								Fill
							</button>
						{:then isFilled}
							{#if isFilled}
								<AwaitButton
									buttonFunction={async () => {
										const txHash = await fill(walletClient, { order, index: 0 }, opts)();
										orderInputs.validate[index] = txHash;
									}}
								>
									{#snippet name()}
										Fill
									{/snippet}
									{#snippet awaiting()}
										Waiting for transaction...
									{/snippet}
								</AwaitButton>
							{:else}
								<button
									type="button"
									class="rounded border px-4 text-xl font-bold text-gray-300"
									disabled
								>
									Filled
								</button>
							{/if}
						{/await}
					</td>
					<td>
						{#if (Object.values(POLYMER_ORACLE) as string[]).includes(order.localOracle)}
							<div class="text-center">-</div>
						{:else}
							<input
								type="number"
								class="w-32 rounded border px-2 py-1"
								placeholder="fillTransactionHash"
								bind:value={orderInputs.submit[index]}
							/>
							<!-- <AwaitButton buttonFunction={submit(order, orderInputs.submit[index])}>
								{#snippet name()}
									Submit
								{/snippet}
								{#snippet awaiting()}
									Waiting for transaction...
								{/snippet}
							</AwaitButton> -->
						{/if}
					</td>
					<td class="flex pt-0.5">
						<input
							type="text"
							class="h-8 w-28 rounded-l border-y border-l px-2"
							placeholder="validateContext"
							bind:value={orderInputs.validate[index]}
						/>
						{#await checkIfValidated(order, 0, orderInputs.validate[index] as `0x${string}`)}
							<button
								type="button"
								class="h-8 rounded-r border px-4 text-xl font-bold text-gray-300"
								disabled
							>
								Validate
							</button>
						{:then isValidated}
							{#if isValidated}
								<button
									type="button"
									class="h-8 rounded-r border px-4 text-xl font-bold text-gray-300"
									disabled
								>
									Validated
								</button>
							{:else}
								<AwaitButton
									baseClass="rounded-r border px-4 h-8 text-xl font-bold"
									buttonFunction={validate(
										walletClient,
										{ order, fillTransactionHash: orderInputs.validate[index] },
										opts
									)}
								>
									{#snippet name()}
										Validate
									{/snippet}
									{#snippet awaiting()}
										Waiting for transaction...
									{/snippet}
								</AwaitButton>
							{/if}
						{:catch}
							<AwaitButton
								baseClass="rounded-r border px-4 h-8 text-xl font-bold"
								buttonFunction={validate(
									walletClient,
									{ order, fillTransactionHash: orderInputs.validate[index] },
									opts
								)}
							>
								{#snippet name()}
									Validate
								{/snippet}
								{#snippet awaiting()}
									Waiting for transaction...
								{/snippet}
							</AwaitButton>
						{/await}
					</td>
					<td>
						{#await checkIfClaimed(order, 0)}
							<button
								type="button"
								class="h-8 rounded-r border px-4 text-xl font-bold text-gray-300"
								disabled
							>
								Claim
							</button>
						{:then isValidated}
							{#if isValidated}
								<button
									type="button"
									class="h-8 rounded-r border px-4 text-xl font-bold text-gray-300"
									disabled
								>
									Claimed
								</button>
							{:else}
								<AwaitButton
									buttonFunction={claim(
										walletClient,
										{ order, signature, fillTransactionHash: orderInputs.validate[index] },
										opts
									)}
								>
									{#snippet name()}
										Claim
									{/snippet}
									{#snippet awaiting()}
										Waiting for transaction...
									{/snippet}
								</AwaitButton>
							{/if}
						{:catch}
							<AwaitButton
								buttonFunction={claim(
									walletClient,
									{ order, signature, fillTransactionHash: orderInputs.validate[index] },
									opts
								)}
							>
								{#snippet name()}
									Claim
								{/snippet}
								{#snippet awaiting()}
									Waiting for transaction...
								{/snippet}
							</AwaitButton>
						{/await}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
