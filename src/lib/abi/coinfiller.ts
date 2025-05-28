export const COIN_FILLER_ABI = [
  {
    "type": "function",
    "name": "arePayloadsValid",
    "inputs": [
      {
        "name": "payloadHashes",
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "call",
    "inputs": [
      {
        "name": "trueAmount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "output",
        "type": "tuple",
        "internalType": "struct MandateOutput",
        "components": [
          {
            "name": "remoteOracle",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "remoteFiller",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "chainId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "token",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "recipient",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "remoteCall",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "fulfillmentContext",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "efficientRequireProven",
    "inputs": [
      {
        "name": "proofSeries",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "fill",
    "inputs": [
      {
        "name": "fillDeadline",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "orderId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "output",
        "type": "tuple",
        "internalType": "struct MandateOutput",
        "components": [
          {
            "name": "remoteOracle",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "remoteFiller",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "chainId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "token",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "recipient",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "remoteCall",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "fulfillmentContext",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      },
      {
        "name": "proposedSolver",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "fillBatch",
    "inputs": [
      {
        "name": "fillDeadline",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "orderId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "outputs",
        "type": "tuple[]",
        "internalType": "struct MandateOutput[]",
        "components": [
          {
            "name": "remoteOracle",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "remoteFiller",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "chainId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "token",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "recipient",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "remoteCall",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "fulfillmentContext",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      },
      {
        "name": "proposedSolver",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "isProven",
    "inputs": [
      {
        "name": "remoteChainId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "remoteOracle",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "application",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "dataHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "OutputFilled",
    "inputs": [
      {
        "name": "orderId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "solver",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "timestamp",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      },
      {
        "name": "output",
        "type": "tuple",
        "indexed": false,
        "internalType": "struct MandateOutput",
        "components": [
          {
            "name": "remoteOracle",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "remoteFiller",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "chainId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "token",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "recipient",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "remoteCall",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "fulfillmentContext",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OutputProven",
    "inputs": [
      {
        "name": "chainid",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "remoteIdentifier",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "application",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "payloadHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "ExclusiveTo",
    "inputs": [
      {
        "name": "solver",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "FillDeadline",
    "inputs": []
  },
  {
    "type": "error",
    "name": "FilledBySomeoneElse",
    "inputs": [
      {
        "name": "solver",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "FulfillmentContextCallOutOfRange",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotDivisible",
    "inputs": [
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "divisor",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotImplemented",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotProven",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RemoteCallOutOfRange",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SlopeStopped",
    "inputs": []
  },
  {
    "type": "error",
    "name": "WrongChain",
    "inputs": [
      {
        "name": "expected",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "actual",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "WrongRemoteFiller",
    "inputs": [
      {
        "name": "addressThis",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "expected",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "ZeroValue",
    "inputs": []
  }
] as const;
