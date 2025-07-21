export const COIN_FILLER_ABI = [
	{
		"type": "function",
		"name": "_fillRecords",
		"inputs": [
			{
				"name": "orderId",
				"type": "bytes32",
				"internalType": "bytes32",
			},
			{
				"name": "outputHash",
				"type": "bytes32",
				"internalType": "bytes32",
			},
		],
		"outputs": [
			{
				"name": "payloadHash",
				"type": "bytes32",
				"internalType": "bytes32",
			},
		],
		"stateMutability": "view",
	},
	{
		"type": "function",
		"name": "arePayloadsValid",
		"inputs": [
			{
				"name": "payloads",
				"type": "bytes[]",
				"internalType": "bytes[]",
			},
		],
		"outputs": [
			{
				"name": "accumulator",
				"type": "bool",
				"internalType": "bool",
			},
		],
		"stateMutability": "view",
	},
	{
		"type": "function",
		"name": "call",
		"inputs": [
			{
				"name": "trueAmount",
				"type": "uint256",
				"internalType": "uint256",
			},
			{
				"name": "output",
				"type": "tuple",
				"internalType": "struct MandateOutput",
				"components": [
					{
						"name": "oracle",
						"type": "bytes32",
						"internalType": "bytes32",
					},
					{
						"name": "settler",
						"type": "bytes32",
						"internalType": "bytes32",
					},
					{
						"name": "chainId",
						"type": "uint256",
						"internalType": "uint256",
					},
					{
						"name": "token",
						"type": "bytes32",
						"internalType": "bytes32",
					},
					{
						"name": "amount",
						"type": "uint256",
						"internalType": "uint256",
					},
					{
						"name": "recipient",
						"type": "bytes32",
						"internalType": "bytes32",
					},
					{
						"name": "call",
						"type": "bytes",
						"internalType": "bytes",
					},
					{
						"name": "context",
						"type": "bytes",
						"internalType": "bytes",
					},
				],
			},
		],
		"outputs": [],
		"stateMutability": "nonpayable",
	},
	{
		"type": "function",
		"name": "efficientRequireProven",
		"inputs": [
			{
				"name": "proofSeries",
				"type": "bytes",
				"internalType": "bytes",
			},
		],
		"outputs": [],
		"stateMutability": "view",
	},
	{
		"type": "function",
		"name": "fill",
		"inputs": [
			{
				"name": "fillDeadline",
				"type": "uint32",
				"internalType": "uint32",
			},
			{
				"name": "orderId",
				"type": "bytes32",
				"internalType": "bytes32",
			},
			{
				"name": "output",
				"type": "tuple",
				"internalType": "struct MandateOutput",
				"components": [
					{
						"name": "oracle",
						"type": "bytes32",
						"internalType": "bytes32",
					},
					{
						"name": "settler",
						"type": "bytes32",
						"internalType": "bytes32",
					},
					{
						"name": "chainId",
						"type": "uint256",
						"internalType": "uint256",
					},
					{
						"name": "token",
						"type": "bytes32",
						"internalType": "bytes32",
					},
					{
						"name": "amount",
						"type": "uint256",
						"internalType": "uint256",
					},
					{
						"name": "recipient",
						"type": "bytes32",
						"internalType": "bytes32",
					},
					{
						"name": "call",
						"type": "bytes",
						"internalType": "bytes",
					},
					{
						"name": "context",
						"type": "bytes",
						"internalType": "bytes",
					},
				],
			},
			{
				"name": "proposedSolver",
				"type": "bytes32",
				"internalType": "bytes32",
			},
		],
		"outputs": [
			{
				"name": "",
				"type": "bytes32",
				"internalType": "bytes32",
			},
		],
		"stateMutability": "nonpayable",
	},
	{
		"type": "function",
		"name": "fillOrderOutputs",
		"inputs": [
			{
				"name": "fillDeadline",
				"type": "uint32",
				"internalType": "uint32",
			},
			{
				"name": "orderId",
				"type": "bytes32",
				"internalType": "bytes32",
			},
			{
				"name": "outputs",
				"type": "tuple[]",
				"internalType": "struct MandateOutput[]",
				"components": [
					{
						"name": "oracle",
						"type": "bytes32",
						"internalType": "bytes32",
					},
					{
						"name": "settler",
						"type": "bytes32",
						"internalType": "bytes32",
					},
					{
						"name": "chainId",
						"type": "uint256",
						"internalType": "uint256",
					},
					{
						"name": "token",
						"type": "bytes32",
						"internalType": "bytes32",
					},
					{
						"name": "amount",
						"type": "uint256",
						"internalType": "uint256",
					},
					{
						"name": "recipient",
						"type": "bytes32",
						"internalType": "bytes32",
					},
					{
						"name": "call",
						"type": "bytes",
						"internalType": "bytes",
					},
					{
						"name": "context",
						"type": "bytes",
						"internalType": "bytes",
					},
				],
			},
			{
				"name": "proposedSolver",
				"type": "bytes32",
				"internalType": "bytes32",
			},
		],
		"outputs": [],
		"stateMutability": "nonpayable",
	},
	{
		"type": "function",
		"name": "isProven",
		"inputs": [
			{
				"name": "remoteChainId",
				"type": "uint256",
				"internalType": "uint256",
			},
			{
				"name": "remoteOracle",
				"type": "bytes32",
				"internalType": "bytes32",
			},
			{
				"name": "application",
				"type": "bytes32",
				"internalType": "bytes32",
			},
			{
				"name": "dataHash",
				"type": "bytes32",
				"internalType": "bytes32",
			},
		],
		"outputs": [
			{
				"name": "",
				"type": "bool",
				"internalType": "bool",
			},
		],
		"stateMutability": "view",
	},
	{
		"type": "function",
		"name": "setAttestation",
		"inputs": [
			{
				"name": "orderId",
				"type": "bytes32",
				"internalType": "bytes32",
			},
			{
				"name": "solver",
				"type": "bytes32",
				"internalType": "bytes32",
			},
			{
				"name": "timestamp",
				"type": "uint32",
				"internalType": "uint32",
			},
			{
				"name": "output",
				"type": "tuple",
				"internalType": "struct MandateOutput",
				"components": [
					{
						"name": "oracle",
						"type": "bytes32",
						"internalType": "bytes32",
					},
					{
						"name": "settler",
						"type": "bytes32",
						"internalType": "bytes32",
					},
					{
						"name": "chainId",
						"type": "uint256",
						"internalType": "uint256",
					},
					{
						"name": "token",
						"type": "bytes32",
						"internalType": "bytes32",
					},
					{
						"name": "amount",
						"type": "uint256",
						"internalType": "uint256",
					},
					{
						"name": "recipient",
						"type": "bytes32",
						"internalType": "bytes32",
					},
					{
						"name": "call",
						"type": "bytes",
						"internalType": "bytes",
					},
					{
						"name": "context",
						"type": "bytes",
						"internalType": "bytes",
					},
				],
			},
		],
		"outputs": [],
		"stateMutability": "nonpayable",
	},
	{
		"type": "event",
		"name": "OutputFilled",
		"inputs": [
			{
				"name": "orderId",
				"type": "bytes32",
				"indexed": true,
				"internalType": "bytes32",
			},
			{
				"name": "solver",
				"type": "bytes32",
				"indexed": false,
				"internalType": "bytes32",
			},
			{
				"name": "timestamp",
				"type": "uint32",
				"indexed": false,
				"internalType": "uint32",
			},
			{
				"name": "output",
				"type": "tuple",
				"indexed": false,
				"internalType": "struct MandateOutput",
				"components": [
					{
						"name": "oracle",
						"type": "bytes32",
						"internalType": "bytes32",
					},
					{
						"name": "settler",
						"type": "bytes32",
						"internalType": "bytes32",
					},
					{
						"name": "chainId",
						"type": "uint256",
						"internalType": "uint256",
					},
					{
						"name": "token",
						"type": "bytes32",
						"internalType": "bytes32",
					},
					{
						"name": "amount",
						"type": "uint256",
						"internalType": "uint256",
					},
					{
						"name": "recipient",
						"type": "bytes32",
						"internalType": "bytes32",
					},
					{
						"name": "call",
						"type": "bytes",
						"internalType": "bytes",
					},
					{
						"name": "context",
						"type": "bytes",
						"internalType": "bytes",
					},
				],
			},
			{
				"name": "finalAmount",
				"type": "uint256",
				"indexed": false,
				"internalType": "uint256",
			},
		],
		"anonymous": false,
	},
	{
		"type": "event",
		"name": "OutputProven",
		"inputs": [
			{
				"name": "chainid",
				"type": "uint256",
				"indexed": false,
				"internalType": "uint256",
			},
			{
				"name": "remoteIdentifier",
				"type": "bytes32",
				"indexed": false,
				"internalType": "bytes32",
			},
			{
				"name": "application",
				"type": "bytes32",
				"indexed": false,
				"internalType": "bytes32",
			},
			{
				"name": "payloadHash",
				"type": "bytes32",
				"indexed": false,
				"internalType": "bytes32",
			},
		],
		"anonymous": false,
	},
	{
		"type": "error",
		"name": "AlreadyFilled",
		"inputs": [],
	},
	{
		"type": "error",
		"name": "CallOutOfRange",
		"inputs": [],
	},
	{
		"type": "error",
		"name": "ContextOutOfRange",
		"inputs": [],
	},
	{
		"type": "error",
		"name": "ExclusiveTo",
		"inputs": [
			{
				"name": "solver",
				"type": "bytes32",
				"internalType": "bytes32",
			},
		],
	},
	{
		"type": "error",
		"name": "FillDeadline",
		"inputs": [],
	},
	{
		"type": "error",
		"name": "InvalidAttestation",
		"inputs": [
			{
				"name": "storedFillRecordHash",
				"type": "bytes32",
				"internalType": "bytes32",
			},
			{
				"name": "givenFillRecordHash",
				"type": "bytes32",
				"internalType": "bytes32",
			},
		],
	},
	{
		"type": "error",
		"name": "NotDivisible",
		"inputs": [
			{
				"name": "value",
				"type": "uint256",
				"internalType": "uint256",
			},
			{
				"name": "divisor",
				"type": "uint256",
				"internalType": "uint256",
			},
		],
	},
	{
		"type": "error",
		"name": "NotFilled",
		"inputs": [],
	},
	{
		"type": "error",
		"name": "NotImplemented",
		"inputs": [],
	},
	{
		"type": "error",
		"name": "NotProven",
		"inputs": [],
	},
	{
		"type": "error",
		"name": "PayloadTooSmall",
		"inputs": [],
	},
	{
		"type": "error",
		"name": "WrongChain",
		"inputs": [
			{
				"name": "expected",
				"type": "uint256",
				"internalType": "uint256",
			},
			{
				"name": "actual",
				"type": "uint256",
				"internalType": "uint256",
			},
		],
	},
	{
		"type": "error",
		"name": "WrongOutputOracle",
		"inputs": [
			{
				"name": "addressThis",
				"type": "bytes32",
				"internalType": "bytes32",
			},
			{
				"name": "expected",
				"type": "bytes32",
				"internalType": "bytes32",
			},
		],
	},
	{
		"type": "error",
		"name": "WrongOutputSettler",
		"inputs": [
			{
				"name": "addressThis",
				"type": "bytes32",
				"internalType": "bytes32",
			},
			{
				"name": "expected",
				"type": "bytes32",
				"internalType": "bytes32",
			},
		],
	},
	{
		"type": "error",
		"name": "ZeroValue",
		"inputs": [],
	},
] as const;
