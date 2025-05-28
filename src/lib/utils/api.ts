import axios from 'axios';
import type { CatalystCompactOrder, Quote } from '../../types';

const ORDER_SERVER_URL = 'http://localhost:3333';

const api = axios.create({
	baseURL: ORDER_SERVER_URL
});

type SubmitOrderDto = {
	orderType: 'CatalystCompactOrder';
	order: CatalystCompactOrder;
	quote: Quote;
	sponsorSigature: string;
	allocatorSignature?: string;
};

export const submitOrder = async (request: SubmitOrderDto) => {
	const response = await api.post('/orders/submit', request);
	return response.data;
};
