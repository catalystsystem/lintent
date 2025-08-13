import axios from 'axios';
import type { Quote, StandardOrder } from '../../types';

const ORDER_SERVER_URL = 'https://order-dev.li.fi';
const WSS_ORDER_SERVER_URL = 'wss://order-dev.li.fi';
// const ORDER_SERVER_URL = 'http://localhost:4444';
// const WSS_ORDER_SERVER_URL = 'ws://localhost:4444';

const api = axios.create({
	baseURL: ORDER_SERVER_URL
});

type OrderStatus = 'Signed' | 'Delivered' | 'Settled';

type SubmitOrderDto = {
	orderType: 'CatalystCompactOrder';
	order: StandardOrder;
	quote: Quote;
	inputSettler: `0x${string}`;
	sponsorSignature: `0x${string}`;
	allocatorSignature: `0x${string}`;
};

type SubmitOrderUnsignedDto = {
	orderType: 'CatalystCompactOrder';
	order: StandardOrder;
	quote: Quote;
	inputSettler: `0x${string}`;
	compactRegistrationTxHash: `0x${string}`;
	allocatorSignature: `0x${string}`;
};

type GetOrderResponse = {
	data: {
		order: StandardOrder;
		quote: Quote;
		sponsorSignature: `0x${string}` | null;
		allocatorSignature?: `0x${string}` | null;
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

export const submitOrder = async (request: SubmitOrderDto) => {
	try {
		const response = await api.post('/orders/submit', request);
		return response.data;
	} catch (error) {
		console.error('Error submitting order:', error);
		throw error;
	}
};

export const submitOrderUnsigned = async (request: SubmitOrderUnsignedDto) => {
	try {
		const response = await api.post('/orders/submit/unsigned', request);
		return response.data;
	} catch (error) {
		console.error('Error submitting order:', error);
		throw error;
	}
};

export const getOrders = async (options?: { user?: `0x${string}`; status?: OrderStatus }) => {
	try {
		const response = await api.get('/orders', {
			params: { limit: 50, offset: 0, ...options }
		});
		return response.data as GetOrderResponse;
	} catch (error) {
		console.error('Error getting orders:', error);
		throw error;
	}
};

type orderPush = (orderArr: {
	order: StandardOrder;
	inputSettler: `0x${string}`;
	sponsorSignature: `0x${string}`;
	allocatorSignature: `0x${string}`;
}) => void;

export const connectOrderServerSocket = (newOrderFunction: orderPush) => {
	// Websocket
	const socket = new WebSocket(WSS_ORDER_SERVER_URL);

	socket.onmessage = function (event) {
		console.log('event', event);
		const message = JSON.parse(event.data);
		console.log('Received message:', message);

		switch (message.event) {
			case 'user:vm-order-submit':
				const incomingOrder = message.data as SubmitOrderDto;
				newOrderFunction(incomingOrder);
				break;
			case 'ping':
				socket.send(
					JSON.stringify({
						event: 'pong'
					})
				);
				break;
			default:
				break;
		}
	};

	socket.addEventListener('open', (event) => {
		console.log('Connected to Catalyst order server');
	});

	socket.addEventListener('close', (event) => {
		console.log('Disconnected from Catalyst order server');
	});

	socket.addEventListener('error', (event) => {
		console.error('WebSocket error:', event);
	});

	return { socket, disconnect: () => socket.close() };
};
