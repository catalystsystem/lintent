import axios from 'axios';
import type { StandardOrder, Quote } from '../../types';

const ORDER_SERVER_URL = 'http://order-dev.li.fi';

const api = axios.create({
	baseURL: ORDER_SERVER_URL
});

type SubmitOrderDto = {
	orderType: 'CatalystCompactOrder';
	order: StandardOrder;
	quote: Quote;
	sponsorSigature: string;
	allocatorSignature?: string;
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
