import axios from "axios";
import type { NoSignature, OrderContainer, Quote, Signature, StandardOrder } from "../../types";
import { type chain, chainMap } from "$lib/config";
import { getInteropableAddress } from "../utils/interopableAddresses";
import { validateOrder } from "$lib/utils/orderLib";

type OrderStatus = "Signed" | "Delivered" | "Settled";

type SubmitOrderDto = {
	orderType: "CatalystCompactOrder";
	order: StandardOrder;
	inputSettler: `0x${string}`;
	sponsorSignature?: `0x${string}`;
	allocatorSignature?: `0x${string}`;
	compactRegistrationTxHash?: `0x${string}`;
};

type orderPush = (orderArr: {
	order: StandardOrder;
	inputSettler: `0x${string}`;
	sponsorSignature?: `0x${string}`;
	allocatorSignature?: `0x${string}`;
}) => void;

type GetOrderResponse = {
	data: {
		order: StandardOrder;
		quote: Quote;
		sponsorSignature: `0x${string}` | null;
		allocatorSignature?: `0x${string}` | null;
		inputSettler: `0x${string}`;
		meta: {
			submitTime: number;
			orderStatus: OrderStatus;
			destinationAddress: `0x${string}`;
			orderIdentifier: string;
			onChainOrderId: `0x${string}`;
			signedAt: string;
			expiredAt: string | null;
		};
	}[];
	meta: {
		limit: number;
		offset: number;
		total: number;
	};
};

type GetQuoteOptions = {
	user: `0x${string}`;
	userChain: chain;
	inputs: {
		sender: `0x${string}`;
		asset: `0x${string}`;
		chain: chain;
		amount: bigint;
	}[];
	outputs: {
		receiver: `0x${string}`;
		asset: `0x${string}`;
		chain: chain;
		amount: bigint;
	}[];
	minValidUntil?: number;
};

type GetQuoteResponse = {
	quotes: {
		order: null;
		eta: null;
		validUntil: null;
		quoteId: null;
		metadata: {
			exclusiveFor: `0x${string}`;
		};
		preview: {
			inputs: {
				user: `0x${string}`;
				asset: `0x${string}`;
				amount: string;
			}[];
			outputs: {
				receiver: `0x${string}`;
				asset: `0x${string}`;
				amount: string;
			}[];
		};
		provider: null;
		partialFill: false;
		failureHandling: "refund-automatic";
	}[];
};

export class OrderServer {
	baseUrl: string;
	websocketUrl: string;

	api;

	constructor(mainnet: boolean) {
		this.baseUrl = OrderServer.getOrderServerUrl(mainnet);
		this.websocketUrl = OrderServer.getOrderServerWssUrl(mainnet);

		this.api = axios.create({
			baseURL: this.baseUrl
		});
	}

	static getOrderServerUrl(mainnet: boolean) {
		return mainnet ? "https://order.li.fi" : "https://order-dev.li.fi";
	}

	static getOrderServerWssUrl(mainnet: boolean) {
		return mainnet ? "wss://order.li.fi" : "wss://order-dev.li.fi";
	}

	/**
	 * @notice Submits an order to the order server
	 * @param request The order submission request
	 * @returns The response data from the order server
	 */
	async submitOrder(request: SubmitOrderDto) {
		try {
			const response = await this.api.post("/orders/submit", request);
			return response.data;
		} catch (error) {
			console.error("Error submitting order:", error);
			throw error;
		}
	}

	/**
	 * @notice Gets latest orders from the order server
	 * @param options Optional parameters to filter orders
	 * @returns The response data containing the orders
	 */
	async getOrders(options?: { user?: `0x${string}`; status?: OrderStatus }) {
		try {
			const response = await this.api.get("/orders", {
				params: { limit: 50, offset: 0, ...options }
			});
			return response.data as GetOrderResponse;
		} catch (error) {
			console.error("Error getting orders:", error);
			throw error;
		}
	}

	/**
	 * @notice Fetch an intent quote for a set of inputs and outputs.
	 * @param options The intent specifications
	 * @returns The response data containing the quotes
	 */
	async getQuotes(options: GetQuoteOptions): Promise<GetQuoteResponse> {
		const { user, userChain, inputs, outputs, minValidUntil } = options;

		const lockType: undefined | { kind: "the-compact" } = undefined;

		const rq = {
			user: getInteropableAddress(user, chainMap[userChain].id),
			intent: {
				intentType: "oif-swap",
				inputs: inputs.map((input) => {
					return {
						user: getInteropableAddress(input.sender, chainMap[userChain].id),
						asset: getInteropableAddress(input.asset, chainMap[userChain].id),
						amount: input.amount.toString(),
						lock: lockType
					};
				}),
				outputs: outputs.map((output) => {
					return {
						receiver: getInteropableAddress(output.receiver, chainMap[output.chain].id),
						asset: getInteropableAddress(output.asset, chainMap[output.chain].id),
						amount: output.amount.toString()
					};
				}),
				swapType: "exact-input",
				minValidUntil
			},
			supportedTypes: ["oif-escrow-v0"]
		};

		try {
			const response = await this.api.post("/quote/request", rq);
			return response.data;
		} catch (error) {
			console.error("Error submitting order:", error);
			throw error;
		}
	}

	connectOrderServerSocket(newOrderFunction: orderPush) {
		// Websocket
		const socket = new WebSocket(this.websocketUrl);

		socket.onmessage = function (event) {
			const message = JSON.parse(event.data);

			switch (message.event) {
				case "user:vm-order-submit":
					const incomingOrder = message.data as SubmitOrderDto;
					newOrderFunction(incomingOrder);
					break;
				case "ping":
					socket.send(
						JSON.stringify({
							event: "pong"
						})
					);
					break;
				default:
					break;
			}
		};

		socket.addEventListener("open", (event) => {
			console.log("Connected to Catalyst order server");
		});

		socket.addEventListener("close", (event) => {
			console.log("Disconnected from Catalyst order server");
		});

		socket.addEventListener("error", (event) => {
			console.error("WebSocket error:", event);
		});

		return { socket, disconnect: () => socket.close() };
	}

	// -- Translations -- //

	/**
	 * @notice Fetches all intents from the LI.FI order server and then transmutes them into OrderContainers.
	 */
	async getAndParseOrders(): Promise<OrderContainer[] | undefined> {
		const response = await this.getOrders();
		const parsedOrders = response.data;
		if (parsedOrders) {
			if (Array.isArray(parsedOrders)) {
				// For each order, if a field is string ending in n, convert it to bigint.
				return parsedOrders
					.filter((instance) => validateOrder(instance.order))
					.map((instance) => {
						instance.order.nonce = BigInt(instance.order.nonce);
						instance.order.originChainId = BigInt(instance.order.originChainId);
						if (instance.order.inputs) {
							instance.order.inputs = instance.order.inputs.map((input) => {
								return [BigInt(input[0]), BigInt(input[1])];
							});
						}
						if (instance.order.outputs) {
							instance.order.outputs = instance.order.outputs.map((output) => {
								return {
									...output,
									chainId: BigInt(output.chainId),
									amount: BigInt(output.amount)
								};
							});
						}
						const allocatorSignature = instance.allocatorSignature
							? ({
									type: "ECDSA",
									payload: instance.allocatorSignature
								} as Signature)
							: ({
									type: "None",
									payload: "0x"
								} as NoSignature);
						const sponsorSignature = instance.sponsorSignature
							? ({
									type: "ECDSA",
									payload: instance.sponsorSignature
								} as Signature)
							: ({
									type: "None",
									payload: "0x"
								} as NoSignature);
						return { ...instance, allocatorSignature, sponsorSignature };
					});
			}
		}
	}
}
