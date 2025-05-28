<script lang="ts">
	import onboard from '$lib/web3-onboard';
	import { compactDomain, compactTypes } from '$lib/typedMessage';
	import {
		createPublicClient,
		createWalletClient,
		custom,
		hashStruct,
		// hashType, // This function is not exported. Implemented below.
		hexToBigInt,
		http,
		keccak256,
		maxInt32,
		maxUint256,
		toHex,
		type PublicClient
	} from 'viem';
	import { sepolia, optimismSepolia, baseSepolia } from 'viem/chains';
	import { derived, readable, writable, type Readable, type Writable } from 'svelte/store';
	import type { WalletState } from '@web3-onboard/core';
	import { ERC20_ABI } from '$lib/abi/erc20';
	import { COMPACT_ABI } from '$lib/abi/compact';
	import { ResetPeriod, toId } from '$lib/IdLib';
	import AwaitButton from '$lib/AwaitButton.svelte';
	import type {
		BatchCompact,
		CatalystCompactOrder,
		CompactMandate,
		OutputDescription
	} from '../types';
	import { submitOrder } from '$lib/utils/api';

	type MessageTypeProperty = {
		name: string;
		type: string;
	};

	// import {
	//     sendTransaction,
	//     signTypedData
	// } from '@web3-onboard/wagmi';

	// Subscribe to wallet updates
	const wallets = onboard.state.select('wallets');
	let initialWalletValue: WalletState | undefined;
	const activeWallet = readable(initialWalletValue, (set) => {
		wallets.subscribe((v) => {
			set(v?.[0]);
		});
	});

	// The first wallet in the array of connected wallets
	$: connectedAccount = $activeWallet?.accounts?.[0];

	const COMPACT = '0xE7d08C4D2a8AB8512b6a920bA8E4F4F11f78d376' as const;

	// Web3 account
	const chains = ['sepolia', 'baseSepolia', 'optimismSepolia'] as const;
	const coins = ['eth', 'usdc'] as const;
	type chain = (typeof chains)[number];
	type coin = (typeof coins)[number];
	const chainMap = { sepolia, optimismSepolia, baseSepolia };

	const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000' as const;

	const CATALYST_SETTLER = '0xf5D08Ca45a5C98706715F1eEed431798F0E3c5ac' as const;
	const DEFAULT_ALLOCATOR = '22031956229997787190855790' as const;
	const ALWAYS_YES_ORACLE = '0xabFd7B10F872356BEbe82405e3D83B3E5C8BE8c8' as const;
	const COIN_FILLER = '0x0a8a2521325B259f531F353A55615817FC1d672d' as const;
	const WORMHOLE_ORACLE = {
		sepolia: '0x069cfFa455b2eFFd8adc9531d1fCd55fd32B04Cb',
		baseSepolia: '0xb2477079b498594192837fa3EC4Ebc97153eaA65',
		arbitrumSepolia: '0x46080096B5970d26634479f2F40e9e264B8D439b',
		optimismSepolia: '0xb516aD609f9609C914F5292084398B44fBE84A0C'
	} as const;

	const coinMap = {
		sepolia: {
			eth: ADDRESS_ZERO,
			usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
			weth: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'
		},
		baseSepolia: {
			eth: ADDRESS_ZERO,
			usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
			weth: '0x4200000000000000000000000000000000000006'
		},
		optimismSepolia: {
			eth: ADDRESS_ZERO,
			usdc: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
			weth: '0x4200000000000000000000000000000000000006'
		}
	} as const;

	const decimalMap = {
		eth: 18,
		usdc: 6
	} as const;

	// Globals
	const activeChain = writable<chain>('sepolia');

	const publicClient = derived(activeChain, (activeChain) => {
		return createPublicClient({
			chain: chainMap[activeChain],
			transport: http()
		});
	});

	const walletClient = derived([activeChain, activeWallet], ([activeChain, activeWallet]) => {
		return createWalletClient({
			chain: chainMap[activeChain],
			transport: custom(activeWallet?.provider)
		});
	});

	// Manage Deposit Variables
	const depositAction = writable<'deposit' | 'withdraw'>('deposit');
	const activeAsset = writable<coin>('eth');
	const inputValue = writable(0);
	const compactAllocator = writable(DEFAULT_ALLOCATOR);
	const depositBalance: Readable<number> = derived(
		[activeWallet, activeChain, activeAsset],
		([activeWallet, activeChain, activeAsset], set) => {
			if (!activeWallet) set(0);
			if (activeWallet) {
				const asset = coinMap[activeChain][activeAsset];
				const accountAddress = activeWallet.accounts[0].address;
				if (asset === ADDRESS_ZERO) {
					$publicClient
						.getBalance({
							address: accountAddress,
							blockTag: 'latest'
						})
						.then((v) => {
							console.log(v);
							set(Number(v));
						});
				} else {
					$publicClient
						?.readContract({
							address: asset,
							abi: ERC20_ABI,
							functionName: 'balanceOf',
							args: [accountAddress]
						})
						.then((v) => {
							console.log(v);
							set(Number(v));
						});
				}
			}
		}
	);
	const compactDepositedBalance: Readable<number> = derived(
		[activeWallet, activeChain, activeAsset, compactAllocator],
		([activeWallet, activeChain, activeAsset, compactAllocator], set) => {
			if (!activeWallet) set(0);
			if (activeWallet) {
				const asset = coinMap[activeChain][activeAsset];
				const assetId = toId(true, ResetPeriod.OneDay, compactAllocator, asset);
				const accountAddress = activeWallet.accounts[0].address;
				$publicClient
					?.readContract({
						address: COMPACT,
						abi: COMPACT_ABI,
						functionName: 'balanceOf',
						args: [accountAddress, assetId]
					})
					.then((v) => {
						console.log(v);
						set(Number(v));
					});
			}
		}
	);

	$: formattedDeposit = $depositBalance / 10 ** decimalMap[$activeAsset];
	$: formattedCompactDepositedBalance = $compactDepositedBalance / 10 ** decimalMap[$activeAsset];

	const allowance: Readable<number> = derived(
		[activeWallet, activeChain, activeAsset],
		([activeWallet, activeChain, activeAsset], set) => {
			if (!activeWallet) set(0);
			if (activeWallet) {
				const asset = coinMap[activeChain][activeAsset];
				if (asset == ADDRESS_ZERO) {
					return set(Number(maxUint256));
				}
				const accountAddress = activeWallet.accounts[0].address;
				$publicClient
					?.readContract({
						address: asset,
						abi: ERC20_ABI,
						functionName: 'allowance',
						args: [COMPACT, accountAddress]
					})
					.then((v) => set(Number(v)));
			}
		}
	);
	$: formattedAllowance = $allowance / 10 ** decimalMap[$activeAsset];

	$: depositInputError =
		chains.findIndex((c) => c == $activeChain) == -1
			? 1
			: 0 + coins.findIndex((c) => c == $activeAsset) == -1
				? 10
				: 0 + $inputValue >
					  ($depositAction === 'deposit' ? formattedDeposit : formattedCompactDepositedBalance)
					? 100
					: 0;

	// Execute Transaction Variables
	let buyValue = writable(0);
	let buyAmount = writable(0n);
	let destinationChain = writable<chain>('baseSepolia');
	let destinationAsset = writable<coin>('eth');
	let verifier = writable<'yes' | 'wormhole'>('yes');

	// TODO:
	const fromChainId = writable<number>(1);

	$: depositAndSwapInputError =
		chains.findIndex((c) => c == $activeChain) == -1
			? 1
			: 0 + chains.findIndex((c) => c == $destinationChain) == -1
				? 2
				: 0 + coins.findIndex((c) => c == $activeAsset) == -1
					? 10
					: 0 + coins.findIndex((c) => c == $destinationAsset) == -1
						? 20
						: 0 + $inputValue > formattedDeposit
							? 100
							: 0;
	$: swapInputError =
		chains.findIndex((c) => c == $activeChain) == -1
			? 1
			: 0 + chains.findIndex((c) => c == $destinationChain) == -1
				? 2
				: 0 + coins.findIndex((c) => c == $activeAsset) == -1
					? 10
					: 0 + coins.findIndex((c) => c == $destinationAsset) == -1
						? 20
						: 0 + $inputValue > formattedCompactDepositedBalance
							? 100
							: 0;

	async function connect() {
		await onboard.connectWallet();
	}

	async function disconnect() {
		onboard.disconnectWallet({ label: $wallets?.[0]?.label });
	}

	function toBigIntWithDecimals(value: number, decimals: number): bigint {
		// Convert number to string in full precision
		const [intPart, decPart = ''] = value.toString().split('.');

		// Take up to `decimals` digits of the decimal part
		const truncatedDec = decPart.slice(0, decimals);

		// Pad the decimal part to ensure we have exactly `decimals` digits
		const paddedDec = truncatedDec.padEnd(decimals, '0');

		// Remove leading zeros from intPart just in case
		const normalizedInt = intPart.replace(/^(-?)0+(?=\d)/, '$1');

		// Combine parts
		const combined = (normalizedInt + paddedDec).replace('.', '');

		return BigInt(combined);
	}

	function setWalletToCorrectChain() {
		return $walletClient.switchChain({ id: chainMap[$activeChain].id });
	}

	async function deposit() {
		await setWalletToCorrectChain();
		const asset = coinMap[$activeChain][$activeAsset];
		const lockTag: `0x${string}` = `0x${toHex(
			toId(true, ResetPeriod.OneDay, $compactAllocator, ADDRESS_ZERO),
			{
				size: 32
			}
		)
			.replace('0x', '')
			.slice(0, 24)}`;
		console.log({ lockTag, id: toId(true, ResetPeriod.OneDay, $compactAllocator, ADDRESS_ZERO) });
		const amount = toBigIntWithDecimals($inputValue, decimalMap[$activeAsset]);
		const recipient = ADDRESS_ZERO; // This means sender.

		if (asset === ADDRESS_ZERO) {
			return $walletClient.writeContract({
				account: connectedAccount.address,
				address: COMPACT,
				abi: COMPACT_ABI,
				functionName: 'depositNative',
				value: amount,
				args: [lockTag, recipient]
			});
		} else {
			return $walletClient.writeContract({
				account: connectedAccount.address,
				address: COMPACT,
				abi: COMPACT_ABI,
				functionName: 'depositERC20',
				args: [asset, lockTag, amount, recipient]
			});
		}
	}

	async function withdraw() {
		await setWalletToCorrectChain();
		const asset = coinMap[$activeChain][$activeAsset];
		const assetId = toId(true, ResetPeriod.OneDay, $compactAllocator, asset);
		const amount = toBigIntWithDecimals($inputValue, decimalMap[$activeAsset]);

		const allocatedTransferStruct: {
			allocatorData: `0x${string}`;
			nonce: bigint;
			expires: bigint;
			id: bigint;
			recipients: {
				claimant: bigint;
				amount: bigint;
			}[];
		} = {
			allocatorData: '0x', // TODO: Get from allocator
			nonce: BigInt(Math.floor(Math.random() * 2 ** 32)),
			expires: maxInt32, // TODO:
			id: assetId,
			recipients: [{ claimant: BigInt(addressToBytes32(connectedAccount.address)), amount }]
		};

		return $walletClient.writeContract({
			account: connectedAccount.address,
			address: COMPACT,
			abi: COMPACT_ABI,
			functionName: 'allocatedTransfer',
			args: [allocatedTransferStruct]
		});
	}

	async function approve() {
		await setWalletToCorrectChain();
		const asset = coinMap[$activeChain][$activeAsset];
		return $walletClient.writeContract({
			account: connectedAccount.address,
			address: asset,
			abi: ERC20_ABI,
			functionName: 'approve',
			args: [COMPACT, maxUint256]
		});
	}

	function addressToBytes32(address: `0x${string}`): `0x${string}` {
		return `0x${address.replace('0x', '').padStart(64, '0')}`;
	}

	function createOrder() {
		const inputAsset = coinMap[$activeChain][$activeAsset];
		const inputTokenId = toId(true, ResetPeriod.OneDay, $compactAllocator, inputAsset);
		// Make Inputs
		const amount = toBigIntWithDecimals($inputValue, decimalMap[$activeAsset]);
		const input: [bigint, bigint] = [inputTokenId, amount];
		const inputs = [input];

		const remoteFiller = COIN_FILLER;
		const remoteOracle =
			$verifier === 'yes' ? ALWAYS_YES_ORACLE : WORMHOLE_ORACLE[$destinationChain];
		const localOracle = $verifier === 'yes' ? ALWAYS_YES_ORACLE : WORMHOLE_ORACLE[$activeChain];

		// Make Outputs
		const output: OutputDescription = {
			remoteOracle: addressToBytes32(remoteOracle),
			remoteFiller: addressToBytes32(remoteFiller),
			chainId: chainMap[$destinationChain].id,
			token: addressToBytes32(coinMap[$destinationChain][$destinationAsset]),
			amount: $buyAmount,
			recipient: addressToBytes32(connectedAccount.address),
			remoteCall: '',
			fulfillmentContext: ''
		};
		const outputs = [output];

		// Make order
		const order: CatalystCompactOrder = {
			user: connectedAccount.address,
			nonce: 0,
			originChainId: chainMap[$activeChain].id,
			fillDeadline: Number(maxInt32), // TODO:
			expires: Number(maxInt32), //  TODO:
			localOracle: localOracle,
			inputs: inputs,
			outputs: outputs
		};
		const mandate: CompactMandate = {
			fillDeadline: order.fillDeadline,
			localOracle: order.localOracle,
			outputs: order.outputs
		};

		const batchCompact: BatchCompact = {
			arbiter: CATALYST_SETTLER,
			sponsor: order.user,
			nonce: order.nonce,
			expires: order.expires,
			idsAndAmounts: order.inputs,
			mandate
		};

		return { order, batchCompact };
	}

	async function swap() {
		await setWalletToCorrectChain();
		const { order, batchCompact } = createOrder();

		const signaturePromise = $walletClient.signTypedData({
			account: connectedAccount.address,
			domain: {
				name: 'The Compact',
				version: '1',
				chainId: $fromChainId,
				verifyingContract: COMPACT
			} as const,
			types: compactTypes,
			primaryType: 'BatchCompact',
			message: batchCompact
		});
		const signature = await signaturePromise;

		console.log({ order, batchCompact, signature });

		const submitOrderResponse = await submitOrder({
			orderType: 'CatalystCompactOrder',
			order,
			sponsorSigature: signature,
			quote: {
				fromAsset: $activeAsset,
				toAsset: $destinationAsset,
				fromPrice: '1',
				toPrice: '1',
				intermediary: '1',
				discount: '1'
			}
		});

		console.log({ submitOrderResponse });
	}

	const compact_type =
		'BatchCompact(address arbiter,address sponsor,uint256 nonce,uint256 expires,uint256[2][] idsAndAmounts,Mandate mandate)Mandate(uint32 fillDeadline,address localOracle,MandateOutput[] outputs)MandateOutput(bytes32 remoteOracle,bytes32 remoteFiller,uint256 chainId,bytes32 token,uint256 amount,bytes32 recipient,bytes remoteCall,bytes fulfillmentContext)' as const;
	const compact_type_hash = keccak256(toHex(compact_type));
	const compact_type_hash_contract =
		'0x3df4b6efdfbd05bc0129a40c10b9e80a519127db6100fb77877a4ac4ac191af7';
	if (compact_type_hash != compact_type_hash_contract)
		throw Error(
			`Computed typehash ${compact_type_hash} does not match expected ${compact_type_hash_contract}`
		);

	async function depositAndSwap() {
		await setWalletToCorrectChain();
		const { order, batchCompact } = createOrder();
		const claimHash = hashStruct({
			data: batchCompact,
			types: compactTypes,
			primaryType: 'BatchCompact'
		});
		const typeHash = compact_type_hash;

		const asset = coinMap[$activeChain][$activeAsset];
		// Generate the locktag. We use the toId function and then discard the rightmost 20 bytes.
		const lockTag: `0x${string}` = `0x${toHex(
			toId(true, ResetPeriod.OneDay, $compactAllocator, ADDRESS_ZERO),
			{
				size: 32
			}
		)
			.replace('0x', '')
			.slice(0, 24)}`;
		const amount = toBigIntWithDecimals($inputValue, decimalMap[$activeAsset]);

		const callPromise =
			asset === ADDRESS_ZERO
				? $walletClient.writeContract({
						account: connectedAccount.address,
						address: COMPACT,
						abi: COMPACT_ABI,
						functionName: 'depositNativeAndRegister',
						value: amount,
						args: [lockTag, claimHash, typeHash]
					})
				: $walletClient.writeContract({
						account: connectedAccount.address,
						address: COMPACT,
						abi: COMPACT_ABI,
						functionName: 'depositERC20AndRegister',
						args: [asset, lockTag, amount, claimHash, typeHash]
					});

		await callPromise;
		// Needs to be sent to the Catalyst order server:
		console.log({ order, batchCompact, signature: '' });
		return;
	}

	let manageCompactPromise: Promise<any> | undefined = undefined;
	let exeucteTransactionPromise: Promise<any> | undefined = undefined;

	const trunc = (address: string) =>
		address ? address.slice(0, 6) + '...' + address.slice(-6) : null;
</script>

<main class="main">
	<h1 class="py-1 text-center align-middle text-xl font-medium">Catalyst Intent Issuer</h1>
	<p>
		This small webapp showcases how to issue Catalyst Intents. This demo uses the compact settler.
		This webapp supports two flows:
	</p>
	<ul>
		<li>Swaps using existing deposits (signature)</li>
		<li>Swaps using on-chain deposit & registration (transaction)</li>
	</ul>
	<p>
		A third unsupported flow uses permit2 to do an on-chain deposit & registration with no
		transaction.
	</p>

	<div class="mx-auto">
		{#if connectedAccount}
			<div class="wallet">
				<div>{trunc(connectedAccount.address)}</div>
				<button onclick={disconnect}>Disconnect</button>
			</div>
		{:else}
			<div>
				<button onclick={connect}>Connect</button>
			</div>
		{/if}
	</div>

	<div class="flex flex-col justify-items-center align-middle">
		<form class="mx-auto mt-3 space-y-4 rounded-md border p-4">
			<h1 class="text-xl font-medium">Manage Compact</h1>
			<div class="flex flex-row space-x-2">
				<h1 class="text-md font-medium">Allocator</h1>
				<input type="text" class="w-96 rounded border px-2 py-1" bind:value={$compactAllocator} />
			</div>
			<div class="flex flex-wrap items-center justify-start gap-2">
				<select id="in-asset" class="rounded border px-2 py-1" bind:value={$depositAction}>
					<option value="deposit" selected>Deposit</option>
					<option value="withdraw">Withdraw</option>
				</select>
				<input type="number" class="w-24 rounded border px-2 py-1" bind:value={$inputValue} />
				<span>of</span>
				{#if $depositAction === 'withdraw'}
					<input
						type="text"
						class="w-24 rounded border border-gray-800 bg-gray-50 px-2 py-1"
						disabled
						value={formattedCompactDepositedBalance}
					/>
				{:else}
					<input
						type="text"
						class="w-24 rounded border border-gray-800 bg-gray-50 px-2 py-1"
						disabled
						value={formattedDeposit}
					/>
				{/if}
				<select id="deposit-chain" class="rounded border px-2 py-1" bind:value={$activeChain}>
					<option value="sepolia" selected>Sepolia</option>
					<option value="baseSepolia">Base Sepolia</option>
					<option value="optimismSepolia">Optimism Sepolia</option>
				</select>
				<select id="deposit-asset" class="rounded border px-2 py-1" bind:value={$activeAsset}>
					<option value="eth" selected>ETH</option>
					<option value="usdc">USDC</option>
				</select>
			</div>

			<!-- Action Button -->
			<div class="flex flex-col justify-center">
				{#if !connectedAccount}
					<AwaitButton buttonFunction={connect}>
						{#snippet name()}
							Connect Wallet
						{/snippet}
						{#snippet awaiting()}
							Waiting for wallet...
						{/snippet}
					</AwaitButton>
				{:else if depositInputError}
					<button
						type="button"
						class="rounded border bg-gray-200 px-4 text-xl text-gray-600"
						disabled
					>
						Input not valid {depositInputError}
					</button>
				{:else if formattedAllowance < $inputValue}
					<AwaitButton buttonFunction={approve}>
						{#snippet name()}
							Set allowance
						{/snippet}
						{#snippet awaiting()}
							Waiting for transaction...
						{/snippet}
					</AwaitButton>
				{:else if $depositAction === 'withdraw'}
					<AwaitButton buttonFunction={withdraw}>
						{#snippet name()}
							Withdraw
						{/snippet}
						{#snippet awaiting()}
							Waiting for transaction...
						{/snippet}
					</AwaitButton>
				{:else}
					<AwaitButton buttonFunction={deposit}>
						{#snippet name()}
							Execute Transaction
						{/snippet}
						{#snippet awaiting()}
							Waiting for transaction...
						{/snippet}
					</AwaitButton>
				{/if}
			</div>
		</form>

		<form class="mx-auto mt-3 space-y-4 rounded-md border p-4">
			<h1 class="text-xl font-medium">Sign Intent with Deposit</h1>
			<!-- Sell -->
			<div class="flex flex-wrap items-center justify-start gap-2">
				<span class="font-medium">Sell</span>
				<input type="number" class="w-24 rounded border px-2 py-1" bind:value={$inputValue} />
				<span>of</span>
				<input
					type="text"
					class="w-24 rounded border border-gray-800 bg-gray-50 px-2 py-1"
					disabled
					value={formattedCompactDepositedBalance}
				/>
				<select id="sell-chain" class="rounded border px-2 py-1" bind:value={$activeChain}>
					<option value="sepolia" selected>Sepolia</option>
					<option value="baseSepolia">Base Sepolia</option>
					<option value="optimismSepolia">Optimism Sepolia</option>
				</select>
				<select id="sell-asset" class="rounded border px-2 py-1" bind:value={$activeAsset}>
					<option value="eth" selected>ETH</option>
					<option value="usdc">USDC</option>
				</select>
			</div>

			<!-- Swap button -->
			<div class="flex justify-center">
				<button type="button" class="px-4 text-xl font-bold text-gray-600 hover:text-blue-600">
					⇅
				</button>
			</div>

			<!-- Buy -->
			<div class="flex flex-wrap items-center justify-start gap-2">
				<span class="font-medium">Buy</span>
				<input type="number" class="w-24 rounded border px-2 py-1" bind:value={buyValue} />
				<select id="buy-chain" class="rounded border px-2 py-1" bind:value={destinationChain}>
					<option value="sepolia">Sepolia</option>
					<option value="baseSepolia" selected>Base Sepolia</option>
					<option value="optimismSepolia">Optimism Sepolia</option>
				</select>
				<select id="buy-asset" class="rounded border px-2 py-1" bind:value={destinationAsset}>
					<option value="eth" selected>WETH</option>
					<option value="usdc">USDC</option>
				</select>
			</div>

			<!-- Verified by -->
			<div class="flex flex-wrap items-center justify-center gap-2">
				<span class="font-medium">Verified by</span>
				<select id="verified-by" class="rounded border px-2 py-1" bind:value={verifier}>
					<option value="yes" selected> AlwaysYesOracle </option>
					<option value="wormhole"> Wormhole </option>
				</select>
			</div>

			<!-- Action Button -->
			<div class="flex justify-center">
				{#if !connectedAccount}
					<AwaitButton buttonFunction={connect}>
						{#snippet name()}
							Connect Wallet
						{/snippet}
						{#snippet awaiting()}
							Waiting for wallet...
						{/snippet}
					</AwaitButton>
				{:else if swapInputError}
					<button
						type="button"
						class="rounded border bg-gray-200 px-4 text-xl text-gray-600"
						disabled
					>
						Input not valid {swapInputError}
					</button>
				{:else}
					<AwaitButton buttonFunction={swap}>
						{#snippet name()}
							Sign Swap
						{/snippet}
						{#snippet awaiting()}
							Waiting for signature...
						{/snippet}
					</AwaitButton>
				{/if}
			</div>
		</form>

		<form class="mx-auto mt-3 space-y-4 rounded-md border p-4">
			<h1 class="text-xl font-medium">Execute Deposit and Register Intent</h1>
			<!-- Sell -->
			<div class="flex flex-wrap items-center justify-start gap-2">
				<span class="font-medium">Sell</span>
				<input type="number" class="w-24 rounded border px-2 py-1" bind:value={$inputValue} />
				<span>of</span>
				<input
					type="text"
					class="w-24 rounded border border-gray-800 bg-gray-50 px-2 py-1"
					disabled
					value={formattedDeposit + formattedCompactDepositedBalance}
				/>
				<select id="sell-chain" class="rounded border px-2 py-1" bind:value={$activeChain}>
					<option value="sepolia" selected>Sepolia</option>
					<option value="baseSepolia">Base Sepolia</option>
					<option value="optimismSepolia">Optimism Sepolia</option>
				</select>
				<select id="sell-asset" class="rounded border px-2 py-1" bind:value={$activeAsset}>
					<option value="eth" selected>ETH</option>
					<option value="usdc">USDC</option>
				</select>
			</div>

			<!-- Swap button -->
			<div class="flex justify-center">
				<button type="button" class="px-4 text-xl font-bold text-gray-600 hover:text-blue-600">
					⇅
				</button>
			</div>

			<!-- Buy -->
			<div class="flex flex-wrap items-center justify-start gap-2">
				<span class="font-medium">Buy</span>
				<input type="number" class="w-24 rounded border px-2 py-1" bind:value={buyValue} />
				<select id="buy-chain" class="rounded border px-2 py-1" bind:value={destinationChain}>
					<option value="sepolia">Sepolia</option>
					<option value="baseSepolia" selected>Base Sepolia</option>
					<option value="optimismSepolia">Optimism Sepolia</option>
				</select>
				<select id="buy-asset" class="rounded border px-2 py-1" bind:value={destinationAsset}>
					<option value="eth" selected>WETH</option>
					<option value="usdc">USDC</option>
				</select>
			</div>

			<!-- Verified by -->
			<div class="flex flex-wrap items-center justify-center gap-2">
				<span class="font-medium">Verified by</span>
				<select id="verified-by" class="rounded border px-2 py-1" bind:value={verifier}>
					<option value="yes" selected> AlwaysYesOracle </option>
					<option value="wormhole"> Wormhole </option>
				</select>
			</div>

			<!-- Action Button -->
			<div class="flex justify-center">
				{#if !connectedAccount}
					<AwaitButton buttonFunction={connect}>
						{#snippet name()}
							Connect Wallet
						{/snippet}
						{#snippet awaiting()}
							Waiting for wallet...
						{/snippet}
					</AwaitButton>
				{:else if depositAndSwapInputError}
					<button
						type="button"
						class="rounded border bg-gray-200 px-4 text-xl text-gray-600"
						disabled
					>
						Input not valid {depositAndSwapInputError}
					</button>
				{:else if formattedAllowance < $inputValue}
					<AwaitButton buttonFunction={approve}>
						{#snippet name()}
							Set allowance
						{/snippet}
						{#snippet awaiting()}
							Waiting for transaction...
						{/snippet}
					</AwaitButton>
				{:else}
					<AwaitButton buttonFunction={depositAndSwap}>
						{#snippet name()}
							Execute depositAndSwap
						{/snippet}
						{#snippet awaiting()}
							Waiting for transaction...
						{/snippet}
					</AwaitButton>
				{/if}
			</div>
		</form>
	</div>
</main>
