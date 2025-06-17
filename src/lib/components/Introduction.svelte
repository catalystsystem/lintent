<div class="px-2">
			<p>
				This webapp demonstrates an
				<a
					class="font-bold text-blue-700 hover:text-blue-500"
					href="https://github.com/openintentsframework/oif-contracts">Open Intents Framework</a
				>
				implementation using
				<a
					class="font-bold text-blue-700 hover:text-blue-500"
					href="https://github.com/Uniswap/the-compact/tree/v1">The Compact</a
				>
				Resource Locks. This app currently supports two flows:
			</p>

			<ul class="list-inside list-disc">
				<li>Swaps using existing deposits (off-chain signature-based settlement)</li>
				<li>Swaps with on-chain deposit and registration (transaction-based resource locking)</li>
			</ul>

			<p>
				A third, currently unimplemented, flow leverages
				<a class="text-blue-700 hover:text-blue-500" href="https://github.com/Uniswap/permit2"
					>permit2</a
				>
				to enable gasless on-chain deposits and registration—providing a smooth user experience without
				requiring user-initiated transactions.
			</p>

			<br />

			<h3 class="font-semibold">Why Resource Locks?</h3>
			<p>
				Resource Locks improve asset availability guarantees in cross-chain contexts and
				asynchronous environments, offering several key advantages:
			</p>

			<ul class="list-inside list-disc">
				<li>Funds are only debited after successful delivery has been proven.</li>
				<li>
					Enables efficient short-lived interactions—intents can expire within seconds without
					consequence.
				</li>
				<li>No upfront deposit or initiation transaction are required.</li>
				<li>Fully composable with other protocols and settlement layers.</li>
			</ul>

			<p>
				Learn more about
				<a
					class="text-blue-700 hover:text-blue-500"
					href="https://docs.catalyst.exchange/knowledge/resource-locks/">Resource Locks</a
				>.
			</p>

			<br />

			<h3 class="font-semibold">Why the Open Intents Framework?</h3>
			<p>
				The Open Intents Framework (OIF) is an open coordination layer for standardizing and scaling
				intent-based workflows across chains. The goal is to:
			</p>

			<ul class="list-inside list-disc">
				<li>Standardise cross-chain interactions.</li>
				<li>Define a permissionless intent implementation that can scale across all chains.</li>
				<li>Create a reference implementation for cross-chain solvers & searchers.</li>
				<li>Provide tooling for wallet and app developers.</li>
			</ul>
			<p>
				Learn more about
				<a class="text-blue-700 hover:text-blue-500" href="https://openintents.xyz"
					>Open Intents Framework</a
				>.
			</p>
		</div>