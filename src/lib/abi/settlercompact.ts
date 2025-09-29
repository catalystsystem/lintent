export const SETTLER_COMPACT_ABI = [
	{
		type: "constructor",
		inputs: [
			{
				name: "compact",
				type: "address",
				internalType: "address"
			},
			{
				name: "initialOwner",
				type: "address",
				internalType: "address"
			}
		],
		stateMutability: "nonpayable"
	},
	{
		type: "function",
		name: "COMPACT",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "address",
				internalType: "contract TheCompact"
			}
		],
		stateMutability: "view"
	},
	{
		type: "function",
		name: "DOMAIN_SEPARATOR",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "bytes32",
				internalType: "bytes32"
			}
		],
		stateMutability: "view"
	},
	{
		type: "function",
		name: "applyGovernanceFee",
		inputs: [],
		outputs: [],
		stateMutability: "nonpayable"
	},
	{
		type: "function",
		name: "broadcast",
		inputs: [
			{
				name: "order",
				type: "tuple",
				internalType: "struct StandardOrder",
				components: [
					{
						name: "user",
						type: "address",
						internalType: "address"
					},
					{
						name: "nonce",
						type: "uint256",
						internalType: "uint256"
					},
					{
						name: "originChainId",
						type: "uint256",
						internalType: "uint256"
					},
					{
						name: "expires",
						type: "uint32",
						internalType: "uint32"
					},
					{
						name: "fillDeadline",
						type: "uint32",
						internalType: "uint32"
					},
					{
						name: "inputOracle",
						type: "address",
						internalType: "address"
					},
					{
						name: "inputs",
						type: "uint256[2][]",
						internalType: "uint256[2][]"
					},
					{
						name: "outputs",
						type: "tuple[]",
						internalType: "struct MandateOutput[]",
						components: [
							{
								name: "oracle",
								type: "bytes32",
								internalType: "bytes32"
							},
							{
								name: "settler",
								type: "bytes32",
								internalType: "bytes32"
							},
							{
								name: "chainId",
								type: "uint256",
								internalType: "uint256"
							},
							{
								name: "token",
								type: "bytes32",
								internalType: "bytes32"
							},
							{
								name: "amount",
								type: "uint256",
								internalType: "uint256"
							},
							{
								name: "recipient",
								type: "bytes32",
								internalType: "bytes32"
							},
							{
								name: "call",
								type: "bytes",
								internalType: "bytes"
							},
							{
								name: "context",
								type: "bytes",
								internalType: "bytes"
							}
						]
					}
				]
			}
		],
		outputs: [],
		stateMutability: "nonpayable"
	},
	{
		type: "function",
		name: "cancelOwnershipHandover",
		inputs: [],
		outputs: [],
		stateMutability: "payable"
	},
	{
		type: "function",
		name: "completeOwnershipHandover",
		inputs: [
			{
				name: "pendingOwner",
				type: "address",
				internalType: "address"
			}
		],
		outputs: [],
		stateMutability: "payable"
	},
	{
		type: "function",
		name: "eip712Domain",
		inputs: [],
		outputs: [
			{
				name: "fields",
				type: "bytes1",
				internalType: "bytes1"
			},
			{
				name: "name",
				type: "string",
				internalType: "string"
			},
			{
				name: "version",
				type: "string",
				internalType: "string"
			},
			{
				name: "chainId",
				type: "uint256",
				internalType: "uint256"
			},
			{
				name: "verifyingContract",
				type: "address",
				internalType: "address"
			},
			{
				name: "salt",
				type: "bytes32",
				internalType: "bytes32"
			},
			{
				name: "extensions",
				type: "uint256[]",
				internalType: "uint256[]"
			}
		],
		stateMutability: "view"
	},
	{
		type: "function",
		name: "finalise",
		inputs: [
			{
				name: "order",
				type: "tuple",
				internalType: "struct StandardOrder",
				components: [
					{
						name: "user",
						type: "address",
						internalType: "address"
					},
					{
						name: "nonce",
						type: "uint256",
						internalType: "uint256"
					},
					{
						name: "originChainId",
						type: "uint256",
						internalType: "uint256"
					},
					{
						name: "expires",
						type: "uint32",
						internalType: "uint32"
					},
					{
						name: "fillDeadline",
						type: "uint32",
						internalType: "uint32"
					},
					{
						name: "inputOracle",
						type: "address",
						internalType: "address"
					},
					{
						name: "inputs",
						type: "uint256[2][]",
						internalType: "uint256[2][]"
					},
					{
						name: "outputs",
						type: "tuple[]",
						internalType: "struct MandateOutput[]",
						components: [
							{
								name: "oracle",
								type: "bytes32",
								internalType: "bytes32"
							},
							{
								name: "settler",
								type: "bytes32",
								internalType: "bytes32"
							},
							{
								name: "chainId",
								type: "uint256",
								internalType: "uint256"
							},
							{
								name: "token",
								type: "bytes32",
								internalType: "bytes32"
							},
							{
								name: "amount",
								type: "uint256",
								internalType: "uint256"
							},
							{
								name: "recipient",
								type: "bytes32",
								internalType: "bytes32"
							},
							{
								name: "call",
								type: "bytes",
								internalType: "bytes"
							},
							{
								name: "context",
								type: "bytes",
								internalType: "bytes"
							}
						]
					}
				]
			},
			{
				name: "signatures",
				type: "bytes",
				internalType: "bytes"
			},
			{
				name: "solveParams",
				type: "tuple[]",
				internalType: "struct InputSettlerBase.SolveParams[]",
				components: [
					{
						name: "timestamp",
						type: "uint32",
						internalType: "uint32"
					},
					{
						name: "solver",
						type: "bytes32",
						internalType: "bytes32"
					}
				]
			},
			{
				name: "destination",
				type: "bytes32",
				internalType: "bytes32"
			},
			{
				name: "call",
				type: "bytes",
				internalType: "bytes"
			}
		],
		outputs: [],
		stateMutability: "nonpayable"
	},
	{
		type: "function",
		name: "finaliseWithSignature",
		inputs: [
			{
				name: "order",
				type: "tuple",
				internalType: "struct StandardOrder",
				components: [
					{
						name: "user",
						type: "address",
						internalType: "address"
					},
					{
						name: "nonce",
						type: "uint256",
						internalType: "uint256"
					},
					{
						name: "originChainId",
						type: "uint256",
						internalType: "uint256"
					},
					{
						name: "expires",
						type: "uint32",
						internalType: "uint32"
					},
					{
						name: "fillDeadline",
						type: "uint32",
						internalType: "uint32"
					},
					{
						name: "inputOracle",
						type: "address",
						internalType: "address"
					},
					{
						name: "inputs",
						type: "uint256[2][]",
						internalType: "uint256[2][]"
					},
					{
						name: "outputs",
						type: "tuple[]",
						internalType: "struct MandateOutput[]",
						components: [
							{
								name: "oracle",
								type: "bytes32",
								internalType: "bytes32"
							},
							{
								name: "settler",
								type: "bytes32",
								internalType: "bytes32"
							},
							{
								name: "chainId",
								type: "uint256",
								internalType: "uint256"
							},
							{
								name: "token",
								type: "bytes32",
								internalType: "bytes32"
							},
							{
								name: "amount",
								type: "uint256",
								internalType: "uint256"
							},
							{
								name: "recipient",
								type: "bytes32",
								internalType: "bytes32"
							},
							{
								name: "call",
								type: "bytes",
								internalType: "bytes"
							},
							{
								name: "context",
								type: "bytes",
								internalType: "bytes"
							}
						]
					}
				]
			},
			{
				name: "signatures",
				type: "bytes",
				internalType: "bytes"
			},
			{
				name: "solveParams",
				type: "tuple[]",
				internalType: "struct InputSettlerBase.SolveParams[]",
				components: [
					{
						name: "timestamp",
						type: "uint32",
						internalType: "uint32"
					},
					{
						name: "solver",
						type: "bytes32",
						internalType: "bytes32"
					}
				]
			},
			{
				name: "destination",
				type: "bytes32",
				internalType: "bytes32"
			},
			{
				name: "call",
				type: "bytes",
				internalType: "bytes"
			},
			{
				name: "orderOwnerSignature",
				type: "bytes",
				internalType: "bytes"
			}
		],
		outputs: [],
		stateMutability: "nonpayable"
	},
	{
		type: "function",
		name: "governanceFee",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "uint64",
				internalType: "uint64"
			}
		],
		stateMutability: "view"
	},
	{
		type: "function",
		name: "nextGovernanceFee",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "uint64",
				internalType: "uint64"
			}
		],
		stateMutability: "view"
	},
	{
		type: "function",
		name: "nextGovernanceFeeTime",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "uint64",
				internalType: "uint64"
			}
		],
		stateMutability: "view"
	},
	{
		type: "function",
		name: "orderIdentifier",
		inputs: [
			{
				name: "order",
				type: "tuple",
				internalType: "struct StandardOrder",
				components: [
					{
						name: "user",
						type: "address",
						internalType: "address"
					},
					{
						name: "nonce",
						type: "uint256",
						internalType: "uint256"
					},
					{
						name: "originChainId",
						type: "uint256",
						internalType: "uint256"
					},
					{
						name: "expires",
						type: "uint32",
						internalType: "uint32"
					},
					{
						name: "fillDeadline",
						type: "uint32",
						internalType: "uint32"
					},
					{
						name: "inputOracle",
						type: "address",
						internalType: "address"
					},
					{
						name: "inputs",
						type: "uint256[2][]",
						internalType: "uint256[2][]"
					},
					{
						name: "outputs",
						type: "tuple[]",
						internalType: "struct MandateOutput[]",
						components: [
							{
								name: "oracle",
								type: "bytes32",
								internalType: "bytes32"
							},
							{
								name: "settler",
								type: "bytes32",
								internalType: "bytes32"
							},
							{
								name: "chainId",
								type: "uint256",
								internalType: "uint256"
							},
							{
								name: "token",
								type: "bytes32",
								internalType: "bytes32"
							},
							{
								name: "amount",
								type: "uint256",
								internalType: "uint256"
							},
							{
								name: "recipient",
								type: "bytes32",
								internalType: "bytes32"
							},
							{
								name: "call",
								type: "bytes",
								internalType: "bytes"
							},
							{
								name: "context",
								type: "bytes",
								internalType: "bytes"
							}
						]
					}
				]
			}
		],
		outputs: [
			{
				name: "",
				type: "bytes32",
				internalType: "bytes32"
			}
		],
		stateMutability: "view"
	},
	{
		type: "function",
		name: "owner",
		inputs: [],
		outputs: [
			{
				name: "result",
				type: "address",
				internalType: "address"
			}
		],
		stateMutability: "view"
	},
	{
		type: "function",
		name: "ownershipHandoverExpiresAt",
		inputs: [
			{
				name: "pendingOwner",
				type: "address",
				internalType: "address"
			}
		],
		outputs: [
			{
				name: "result",
				type: "uint256",
				internalType: "uint256"
			}
		],
		stateMutability: "view"
	},
	{
		type: "function",
		name: "purchaseOrder",
		inputs: [
			{
				name: "orderPurchase",
				type: "tuple",
				internalType: "struct OrderPurchase",
				components: [
					{
						name: "orderId",
						type: "bytes32",
						internalType: "bytes32"
					},
					{
						name: "destination",
						type: "address",
						internalType: "address"
					},
					{
						name: "call",
						type: "bytes",
						internalType: "bytes"
					},
					{
						name: "discount",
						type: "uint64",
						internalType: "uint64"
					},
					{
						name: "timeToBuy",
						type: "uint32",
						internalType: "uint32"
					}
				]
			},
			{
				name: "order",
				type: "tuple",
				internalType: "struct StandardOrder",
				components: [
					{
						name: "user",
						type: "address",
						internalType: "address"
					},
					{
						name: "nonce",
						type: "uint256",
						internalType: "uint256"
					},
					{
						name: "originChainId",
						type: "uint256",
						internalType: "uint256"
					},
					{
						name: "expires",
						type: "uint32",
						internalType: "uint32"
					},
					{
						name: "fillDeadline",
						type: "uint32",
						internalType: "uint32"
					},
					{
						name: "inputOracle",
						type: "address",
						internalType: "address"
					},
					{
						name: "inputs",
						type: "uint256[2][]",
						internalType: "uint256[2][]"
					},
					{
						name: "outputs",
						type: "tuple[]",
						internalType: "struct MandateOutput[]",
						components: [
							{
								name: "oracle",
								type: "bytes32",
								internalType: "bytes32"
							},
							{
								name: "settler",
								type: "bytes32",
								internalType: "bytes32"
							},
							{
								name: "chainId",
								type: "uint256",
								internalType: "uint256"
							},
							{
								name: "token",
								type: "bytes32",
								internalType: "bytes32"
							},
							{
								name: "amount",
								type: "uint256",
								internalType: "uint256"
							},
							{
								name: "recipient",
								type: "bytes32",
								internalType: "bytes32"
							},
							{
								name: "call",
								type: "bytes",
								internalType: "bytes"
							},
							{
								name: "context",
								type: "bytes",
								internalType: "bytes"
							}
						]
					}
				]
			},
			{
				name: "orderSolvedByIdentifier",
				type: "bytes32",
				internalType: "bytes32"
			},
			{
				name: "purchaser",
				type: "bytes32",
				internalType: "bytes32"
			},
			{
				name: "expiryTimestamp",
				type: "uint256",
				internalType: "uint256"
			},
			{
				name: "solverSignature",
				type: "bytes",
				internalType: "bytes"
			}
		],
		outputs: [],
		stateMutability: "nonpayable"
	},
	{
		type: "function",
		name: "purchasedOrders",
		inputs: [
			{
				name: "solver",
				type: "bytes32",
				internalType: "bytes32"
			},
			{
				name: "orderId",
				type: "bytes32",
				internalType: "bytes32"
			}
		],
		outputs: [
			{
				name: "lastOrderTimestamp",
				type: "uint32",
				internalType: "uint32"
			},
			{
				name: "purchaser",
				type: "bytes32",
				internalType: "bytes32"
			}
		],
		stateMutability: "view"
	},
	{
		type: "function",
		name: "renounceOwnership",
		inputs: [],
		outputs: [],
		stateMutability: "payable"
	},
	{
		type: "function",
		name: "requestOwnershipHandover",
		inputs: [],
		outputs: [],
		stateMutability: "payable"
	},
	{
		type: "function",
		name: "setGovernanceFee",
		inputs: [
			{
				name: "_nextGovernanceFee",
				type: "uint64",
				internalType: "uint64"
			}
		],
		outputs: [],
		stateMutability: "nonpayable"
	},
	{
		type: "function",
		name: "transferOwnership",
		inputs: [
			{
				name: "newOwner",
				type: "address",
				internalType: "address"
			}
		],
		outputs: [],
		stateMutability: "payable"
	},
	{
		type: "event",
		name: "EIP712DomainChanged",
		inputs: [],
		anonymous: false
	},
	{
		type: "event",
		name: "Finalised",
		inputs: [
			{
				name: "orderId",
				type: "bytes32",
				indexed: true,
				internalType: "bytes32"
			},
			{
				name: "solver",
				type: "bytes32",
				indexed: false,
				internalType: "bytes32"
			},
			{
				name: "destination",
				type: "bytes32",
				indexed: false,
				internalType: "bytes32"
			}
		],
		anonymous: false
	},
	{
		type: "event",
		name: "GovernanceFeeChanged",
		inputs: [
			{
				name: "oldGovernanceFee",
				type: "uint64",
				indexed: false,
				internalType: "uint64"
			},
			{
				name: "newGovernanceFee",
				type: "uint64",
				indexed: false,
				internalType: "uint64"
			}
		],
		anonymous: false
	},
	{
		type: "event",
		name: "IntentRegistered",
		inputs: [
			{
				name: "orderId",
				type: "bytes32",
				indexed: true,
				internalType: "bytes32"
			},
			{
				name: "order",
				type: "tuple",
				indexed: false,
				internalType: "struct StandardOrder",
				components: [
					{
						name: "user",
						type: "address",
						internalType: "address"
					},
					{
						name: "nonce",
						type: "uint256",
						internalType: "uint256"
					},
					{
						name: "originChainId",
						type: "uint256",
						internalType: "uint256"
					},
					{
						name: "expires",
						type: "uint32",
						internalType: "uint32"
					},
					{
						name: "fillDeadline",
						type: "uint32",
						internalType: "uint32"
					},
					{
						name: "inputOracle",
						type: "address",
						internalType: "address"
					},
					{
						name: "inputs",
						type: "uint256[2][]",
						internalType: "uint256[2][]"
					},
					{
						name: "outputs",
						type: "tuple[]",
						internalType: "struct MandateOutput[]",
						components: [
							{
								name: "oracle",
								type: "bytes32",
								internalType: "bytes32"
							},
							{
								name: "settler",
								type: "bytes32",
								internalType: "bytes32"
							},
							{
								name: "chainId",
								type: "uint256",
								internalType: "uint256"
							},
							{
								name: "token",
								type: "bytes32",
								internalType: "bytes32"
							},
							{
								name: "amount",
								type: "uint256",
								internalType: "uint256"
							},
							{
								name: "recipient",
								type: "bytes32",
								internalType: "bytes32"
							},
							{
								name: "call",
								type: "bytes",
								internalType: "bytes"
							},
							{
								name: "context",
								type: "bytes",
								internalType: "bytes"
							}
						]
					}
				]
			}
		],
		anonymous: false
	},
	{
		type: "event",
		name: "NextGovernanceFee",
		inputs: [
			{
				name: "nextGovernanceFee",
				type: "uint64",
				indexed: false,
				internalType: "uint64"
			},
			{
				name: "nextGovernanceFeeTime",
				type: "uint64",
				indexed: false,
				internalType: "uint64"
			}
		],
		anonymous: false
	},
	{
		type: "event",
		name: "OrderPurchased",
		inputs: [
			{
				name: "orderId",
				type: "bytes32",
				indexed: true,
				internalType: "bytes32"
			},
			{
				name: "solver",
				type: "bytes32",
				indexed: false,
				internalType: "bytes32"
			},
			{
				name: "purchaser",
				type: "bytes32",
				indexed: false,
				internalType: "bytes32"
			}
		],
		anonymous: false
	},
	{
		type: "event",
		name: "OwnershipHandoverCanceled",
		inputs: [
			{
				name: "pendingOwner",
				type: "address",
				indexed: true,
				internalType: "address"
			}
		],
		anonymous: false
	},
	{
		type: "event",
		name: "OwnershipHandoverRequested",
		inputs: [
			{
				name: "pendingOwner",
				type: "address",
				indexed: true,
				internalType: "address"
			}
		],
		anonymous: false
	},
	{
		type: "event",
		name: "OwnershipTransferred",
		inputs: [
			{
				name: "oldOwner",
				type: "address",
				indexed: true,
				internalType: "address"
			},
			{
				name: "newOwner",
				type: "address",
				indexed: true,
				internalType: "address"
			}
		],
		anonymous: false
	},
	{
		type: "error",
		name: "AlreadyInitialized",
		inputs: []
	},
	{
		type: "error",
		name: "AlreadyPurchased",
		inputs: []
	},
	{
		type: "error",
		name: "CallOutOfRange",
		inputs: []
	},
	{
		type: "error",
		name: "ContextOutOfRange",
		inputs: []
	},
	{
		type: "error",
		name: "DeadlinePassed",
		inputs: []
	},
	{
		type: "error",
		name: "Expired",
		inputs: []
	},
	{
		type: "error",
		name: "FilledTooLate",
		inputs: [
			{
				name: "expected",
				type: "uint32",
				internalType: "uint32"
			},
			{
				name: "actual",
				type: "uint32",
				internalType: "uint32"
			}
		]
	},
	{
		type: "error",
		name: "GovernanceFeeChangeNotReady",
		inputs: []
	},
	{
		type: "error",
		name: "GovernanceFeeTooHigh",
		inputs: []
	},
	{
		type: "error",
		name: "InvalidPurchaser",
		inputs: []
	},
	{
		type: "error",
		name: "InvalidShortString",
		inputs: []
	},
	{
		type: "error",
		name: "InvalidSigner",
		inputs: []
	},
	{
		type: "error",
		name: "InvalidTimestampLength",
		inputs: []
	},
	{
		type: "error",
		name: "NewOwnerIsZeroAddress",
		inputs: []
	},
	{
		type: "error",
		name: "NoDestination",
		inputs: []
	},
	{
		type: "error",
		name: "NoHandoverRequest",
		inputs: []
	},
	{
		type: "error",
		name: "NotOrderOwner",
		inputs: []
	},
	{
		type: "error",
		name: "NotRegistered",
		inputs: []
	},
	{
		type: "error",
		name: "OrderIdMismatch",
		inputs: [
			{
				name: "provided",
				type: "bytes32",
				internalType: "bytes32"
			},
			{
				name: "computed",
				type: "bytes32",
				internalType: "bytes32"
			}
		]
	},
	{
		type: "error",
		name: "SafeERC20FailedOperation",
		inputs: [
			{
				name: "token",
				type: "address",
				internalType: "address"
			}
		]
	},
	{
		type: "error",
		name: "StringTooLong",
		inputs: [
			{
				name: "str",
				type: "string",
				internalType: "string"
			}
		]
	},
	{
		type: "error",
		name: "TimestampNotPassed",
		inputs: []
	},
	{
		type: "error",
		name: "TimestampPassed",
		inputs: []
	},
	{
		type: "error",
		name: "Unauthorized",
		inputs: []
	},
	{
		type: "error",
		name: "UserCannotBeSettler",
		inputs: []
	},
	{
		type: "error",
		name: "WrongChain",
		inputs: [
			{
				name: "expected",
				type: "uint256",
				internalType: "uint256"
			},
			{
				name: "actual",
				type: "uint256",
				internalType: "uint256"
			}
		]
	},
	{
		type: "error",
		name: "WrongChain",
		inputs: [
			{
				name: "expected",
				type: "uint256",
				internalType: "uint256"
			},
			{
				name: "provided",
				type: "uint256",
				internalType: "uint256"
			}
		]
	}
] as const;
