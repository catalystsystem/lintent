import { json } from "@sveltejs/kit";
import axios from "axios";
import type { RequestHandler } from "./$types";
import { PRIVATE_POLYMER_ZONE_API_KEY } from "$env/static/private";
import { toByteArray } from "base64-js";

const MAINNET = false;

export const POST: RequestHandler = async ({ request }) => {
	const { srcChainId, srcBlockNumber, globalLogIndex, polymerIndex } = await request.json();
	console.log({ srcChainId, srcBlockNumber, globalLogIndex, polymerIndex });

	let polymerRequestIndex = polymerIndex;
	if (!polymerRequestIndex) {
		const requestProof = await axios.post(
			"https://proof.testnet.polymer.zone/",
			{
				jsonrpc: "2.0",
				id: 1,
				method: "polymer_requestProof",
				params: [
					{
						srcChainId,
						srcBlockNumber,
						globalLogIndex
					}
				]
			},
			{
				headers: {
					Authorization: `Bearer ${PRIVATE_POLYMER_ZONE_API_KEY}`,
					"Content-Type": "application/json",
					Accept: "application/json"
				}
			}
		);
		polymerRequestIndex = requestProof.data.result;
		console.log({ requestProof: requestProof.data });
	}

	const requestProofData = await axios.post(
		MAINNET ? "https://api.polymer.zone/v1/" : "https://api.testnet.polymer.zone/v1/",
		{
			jsonrpc: "2.0",
			id: 1,
			method: "polymer_queryProof",
			params: [polymerRequestIndex]
		},
		{
			headers: {
				Authorization: `Bearer ${PRIVATE_POLYMER_ZONE_API_KEY}`,
				"Content-Type": "application/json",
				Accept: "application/json"
			}
		}
	);
	const dat: {
		jsonrpc: "2.0";
		id: 1;
		result: {
			jobID: number;
			createdAt: number;
			updatedAt: number;
		} & (
			| {
					status: "error";
					failureReason: string;
			  }
			| {
					status: "complete";
					proof: "string";
			  }
			| {
					status: "initialized";
			  }
		);
	} = requestProofData.data;

	let proof: string | undefined;
	// decode proof from base64 to hex
	if (dat.result.status === "complete") {
		proof = dat.result.proof;
		const proofBytes = toByteArray(proof);
		proof = Array.from(proofBytes)
			.map((byte) => byte.toString(16).padStart(2, "0"))
			.join("");
	} else {
		console.log(dat);
	}
	// create a JSON Response using a header we received
	return json({
		proof,
		polymerIndex: polymerRequestIndex
	});
};
