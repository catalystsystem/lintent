import {
    encodeAbiParameters,
    encodePacked,
    keccak256,
    parseAbiParameters,
} from "viem";
import type { MandateOutput, StandardOrder } from "../../../types";
import { CATALYST_SETTLER } from "$lib/config";

export function getOrderId(order: StandardOrder) {
    return keccak256(
        encodePacked(
            [
                "uint256",
                "address",
                "address",
                "uint256",
                "uint32",
                "uint32",
                "address",
                "uint256[2][]",
                "bytes",
            ],
            [
                order.originChainId,
                CATALYST_SETTLER,
                order.user,
                order.nonce,
                order.expires,
                order.fillDeadline,
                order.localOracle,
                order.inputs,
                encodeAbiParameters(
                    parseAbiParameters(
                        "(bytes32 oracle, bytes32 settler, uint256 chainId, bytes32 token, uint256 amount, bytes32 recipient, bytes call, bytes context)[]",
                    ),
                    [order.outputs],
                ),
            ],
        ),
    );
}

export function getOutputHash(output: MandateOutput) {
    return keccak256(
        encodePacked(
            [
                "bytes32",
                "bytes32",
                "uint256",
                "bytes32",
                "uint256",
                "bytes32",
                "uint16",
                "bytes",
                "uint16",
                "bytes",
            ],
            [
                output.oracle,
                output.settler,
                output.chainId,
                output.token,
                output.amount,
                output.recipient,
                output.call.replace("0x", "").length / 2,
                output.call,
                output.context.replace("0x", "").length / 2,
                output.context,
            ],
        ),
    );
}

export function encodeMandateOutput(
    solver: `0x${string}`,
    orderId: `0x${string}`,
    timestamp: number,
    output: MandateOutput,
) {
    return encodePacked(
        [
            "bytes32",
            "bytes32",
            "uint32",
            "bytes32",
            "uint256",
            "bytes32",
            "uint16",
            "bytes",
            "uint16",
            "bytes",
        ],
        [
            solver,
            orderId,
            timestamp,
            output.token,
            output.amount,
            output.recipient,
            output.call.replace("0x", "").length / 2,
            output.call,
            output.context.replace("0x", "").length / 2,
            output.context,
        ],
    );
}
