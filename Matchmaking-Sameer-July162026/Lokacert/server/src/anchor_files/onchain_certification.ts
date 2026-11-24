/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/lokacert.json`.
 */
export type Lokacert = {
  "address": "78g8P6uz4Y9aZ899YfZUNzk5q7WLvxcbUBSQ8Eucgh2X",
  "metadata": {
    "name": "lokacert",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "On-chain certification and award system"
  },
  "instructions": [
    {
      "name": "acceptTransferAuthority",
      "docs": [
        "Step 2: User X signs to accept. The side-account is deleted."
      ],
      "discriminator": [
        89,
        90,
        49,
        53,
        36,
        232,
        11,
        10
      ],
      "accounts": [
        {
          "name": "company",
          "writable": true
        },
        {
          "name": "pendingTransfer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  110,
                  115,
                  102,
                  101,
                  114,
                  95,
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "company"
              }
            ]
          }
        },
        {
          "name": "newAuthority",
          "signer": true
        },
        {
          "name": "oldAuthority",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "addEmployee",
      "docs": [
        "Add an employee to a company"
      ],
      "discriminator": [
        14,
        82,
        239,
        156,
        50,
        90,
        189,
        61
      ],
      "accounts": [
        {
          "name": "company",
          "writable": true
        },
        {
          "name": "employee",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  109,
                  112,
                  108,
                  111,
                  121,
                  101,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "company"
              },
              {
                "kind": "account",
                "path": "employeeWallet"
              }
            ]
          }
        },
        {
          "name": "employeeWallet"
        },
        {
          "name": "companyAuthority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "employeeDetails",
          "type": "string"
        }
      ]
    },
    {
      "name": "cancelTransferAuthority",
      "docs": [
        "Cancel a pending transfer proposal (only Current Authority can do this)"
      ],
      "discriminator": [
        86,
        211,
        3,
        156,
        239,
        64,
        127,
        252
      ],
      "accounts": [
        {
          "name": "company",
          "writable": true
        },
        {
          "name": "pendingTransfer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  110,
                  115,
                  102,
                  101,
                  114,
                  95,
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "company"
              }
            ]
          }
        },
        {
          "name": "currentAuthority",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "closeCertificate",
      "discriminator": [
        213,
        129,
        117,
        207,
        228,
        142,
        217,
        152
      ],
      "accounts": [
        {
          "name": "certificate",
          "writable": true
        },
        {
          "name": "company"
        },
        {
          "name": "companyAuthority",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "closeEmployee",
      "discriminator": [
        36,
        118,
        134,
        167,
        61,
        247,
        239,
        118
      ],
      "accounts": [
        {
          "name": "employee",
          "writable": true
        },
        {
          "name": "company"
        },
        {
          "name": "companyAuthority",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "confirmEmployee",
      "discriminator": [
        150,
        20,
        144,
        101,
        162,
        231,
        1,
        135
      ],
      "accounts": [
        {
          "name": "employee",
          "writable": true
        },
        {
          "name": "employeeWallet",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "createAwardType",
      "docs": [
        "Create an award type"
      ],
      "discriminator": [
        18,
        48,
        127,
        98,
        184,
        32,
        176,
        125
      ],
      "accounts": [
        {
          "name": "company"
        },
        {
          "name": "awardType",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  119,
                  97,
                  114,
                  100,
                  95,
                  116,
                  121,
                  112,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "company"
              },
              {
                "kind": "arg",
                "path": "awardTypeId"
              }
            ]
          }
        },
        {
          "name": "companyAuthority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "awardTypeId",
          "type": {
            "array": [
              "u8",
              6
            ]
          }
        },
        {
          "name": "metadataUri",
          "type": "string"
        }
      ]
    },
    {
      "name": "createCertificateTemplate",
      "docs": [
        "Create a certificate template"
      ],
      "discriminator": [
        229,
        56,
        91,
        167,
        33,
        189,
        104,
        187
      ],
      "accounts": [
        {
          "name": "company",
          "writable": true
        },
        {
          "name": "certificateTemplate",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  101,
                  109,
                  112,
                  108,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "company"
              },
              {
                "kind": "arg",
                "path": "templateId"
              }
            ]
          }
        },
        {
          "name": "companyAuthority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "templateId",
          "type": {
            "array": [
              "u8",
              6
            ]
          }
        },
        {
          "name": "certificateDetails",
          "type": "string"
        }
      ]
    },
    {
      "name": "initializeCompany",
      "docs": [
        "Initialize a new company"
      ],
      "discriminator": [
        75,
        156,
        55,
        94,
        184,
        64,
        58,
        30
      ],
      "accounts": [
        {
          "name": "company",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  112,
                  97,
                  110,
                  121
                ]
              },
              {
                "kind": "arg",
                "path": "companyId"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "companyId",
          "type": {
            "array": [
              "u8",
              6
            ]
          }
        },
        {
          "name": "companyDetails",
          "type": "string"
        }
      ]
    },
    {
      "name": "issueCertificate",
      "docs": [
        "Issue a certificate to an employee"
      ],
      "discriminator": [
        61,
        197,
        55,
        28,
        159,
        18,
        132,
        128
      ],
      "accounts": [
        {
          "name": "company",
          "writable": true
        },
        {
          "name": "employee",
          "writable": true
        },
        {
          "name": "certificate",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  101,
                  114,
                  116,
                  105,
                  102,
                  105,
                  99,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "company"
              },
              {
                "kind": "arg",
                "path": "certificateId"
              }
            ]
          }
        },
        {
          "name": "certificateTemplate",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  101,
                  109,
                  112,
                  108,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "company"
              },
              {
                "kind": "arg",
                "path": "templateId"
              }
            ]
          }
        },
        {
          "name": "companyAuthority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "certificateId",
          "type": {
            "array": [
              "u8",
              6
            ]
          }
        },
        {
          "name": "templateId",
          "type": {
            "array": [
              "u8",
              6
            ]
          }
        },
        {
          "name": "certificateDetails",
          "type": "string"
        },
        {
          "name": "expiresAt",
          "type": {
            "option": "i64"
          }
        }
      ]
    },
    {
      "name": "mintAwardNft",
      "docs": [
        "Mint an NFT award to an employee"
      ],
      "discriminator": [
        98,
        233,
        229,
        8,
        173,
        106,
        163,
        192
      ],
      "accounts": [
        {
          "name": "company",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  112,
                  97,
                  110,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "company.company_id",
                "account": "company"
              }
            ]
          }
        },
        {
          "name": "employee",
          "writable": true
        },
        {
          "name": "awardType",
          "writable": true
        },
        {
          "name": "award",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  119,
                  97,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "company"
              },
              {
                "kind": "arg",
                "path": "awardId"
              }
            ]
          }
        },
        {
          "name": "mint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  119,
                  97,
                  114,
                  100,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "company"
              },
              {
                "kind": "arg",
                "path": "awardId"
              }
            ]
          }
        },
        {
          "name": "employeeWallet"
        },
        {
          "name": "recipientTokenAccount",
          "writable": true
        },
        {
          "name": "metadata",
          "writable": true
        },
        {
          "name": "companyAuthority",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "tokenMetadataProgram",
          "address": "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "awardId",
          "type": {
            "array": [
              "u8",
              6
            ]
          }
        },
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "symbol",
          "type": "string"
        }
      ]
    },
    {
      "name": "proposeTransferAuthority",
      "docs": [
        "Step 1: Create a side-account that says \"I want to give this to User X\""
      ],
      "discriminator": [
        188,
        97,
        126,
        29,
        238,
        178,
        0,
        205
      ],
      "accounts": [
        {
          "name": "company",
          "writable": true
        },
        {
          "name": "pendingTransfer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  110,
                  115,
                  102,
                  101,
                  114,
                  95,
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "company"
              }
            ]
          }
        },
        {
          "name": "currentAuthority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "newAuthority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "revokeCertificate",
      "docs": [
        "Revoke a certificate"
      ],
      "discriminator": [
        236,
        5,
        130,
        119,
        9,
        164,
        130,
        122
      ],
      "accounts": [
        {
          "name": "company",
          "writable": true
        },
        {
          "name": "certificate",
          "writable": true
        },
        {
          "name": "companyAuthority",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "updateAwardType",
      "docs": [
        "Update award type"
      ],
      "discriminator": [
        24,
        181,
        139,
        146,
        176,
        74,
        124,
        247
      ],
      "accounts": [
        {
          "name": "company"
        },
        {
          "name": "awardType",
          "writable": true
        },
        {
          "name": "companyAuthority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "metadataUri",
          "type": {
            "option": "string"
          }
        },
        {
          "name": "isActive",
          "type": {
            "option": "bool"
          }
        }
      ]
    },
    {
      "name": "updateCertificateTemplate",
      "docs": [
        "Update certificate template"
      ],
      "discriminator": [
        42,
        218,
        177,
        159,
        232,
        209,
        71,
        126
      ],
      "accounts": [
        {
          "name": "company"
        },
        {
          "name": "certificateTemplate",
          "writable": true
        },
        {
          "name": "companyAuthority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "certificateDetails",
          "type": "string"
        }
      ]
    },
    {
      "name": "updateCompany",
      "docs": [
        "Update company information"
      ],
      "discriminator": [
        207,
        145,
        102,
        124,
        179,
        41,
        98,
        192
      ],
      "accounts": [
        {
          "name": "company",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "companyDetails",
          "type": {
            "option": "string"
          }
        },
        {
          "name": "isActive",
          "type": {
            "option": "bool"
          }
        }
      ]
    },
    {
      "name": "updateEmployee",
      "docs": [
        "Update employee details (by company authority only)"
      ],
      "discriminator": [
        73,
        4,
        138,
        145,
        85,
        224,
        29,
        186
      ],
      "accounts": [
        {
          "name": "company"
        },
        {
          "name": "employee",
          "writable": true
        },
        {
          "name": "companyAuthority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "employeeDetails",
          "type": "string"
        }
      ]
    },
    {
      "name": "updateEmployeeStatus",
      "docs": [
        "Update employee status (company authority only)"
      ],
      "discriminator": [
        243,
        54,
        106,
        56,
        184,
        224,
        61,
        141
      ],
      "accounts": [
        {
          "name": "company"
        },
        {
          "name": "employee",
          "writable": true
        },
        {
          "name": "companyAuthority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "newStatus",
          "type": {
            "defined": {
              "name": "employeeStatus"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "award",
      "discriminator": [
        189,
        239,
        181,
        244,
        124,
        28,
        66,
        194
      ]
    },
    {
      "name": "awardType",
      "discriminator": [
        190,
        102,
        66,
        251,
        241,
        81,
        222,
        12
      ]
    },
    {
      "name": "certificate",
      "discriminator": [
        202,
        229,
        222,
        220,
        116,
        20,
        74,
        67
      ]
    },
    {
      "name": "certificateTemplate",
      "discriminator": [
        0,
        187,
        48,
        51,
        136,
        120,
        218,
        4
      ]
    },
    {
      "name": "company",
      "discriminator": [
        32,
        212,
        52,
        137,
        90,
        7,
        206,
        183
      ]
    },
    {
      "name": "employee",
      "discriminator": [
        98,
        238,
        61,
        252,
        130,
        77,
        105,
        67
      ]
    },
    {
      "name": "pendingTransfer",
      "discriminator": [
        136,
        107,
        78,
        115,
        95,
        81,
        142,
        155
      ]
    }
  ],
  "events": [
    {
      "name": "awardMinted",
      "discriminator": [
        44,
        223,
        229,
        243,
        20,
        255,
        240,
        8
      ]
    },
    {
      "name": "awardTypeCreated",
      "discriminator": [
        54,
        9,
        90,
        192,
        181,
        82,
        162,
        192
      ]
    },
    {
      "name": "awardTypeUpdated",
      "discriminator": [
        56,
        254,
        163,
        228,
        135,
        28,
        2,
        49
      ]
    },
    {
      "name": "certificateClosed",
      "discriminator": [
        13,
        34,
        135,
        69,
        233,
        104,
        208,
        101
      ]
    },
    {
      "name": "certificateIssued",
      "discriminator": [
        62,
        59,
        26,
        207,
        181,
        234,
        201,
        52
      ]
    },
    {
      "name": "certificateRevoked",
      "discriminator": [
        99,
        180,
        224,
        20,
        200,
        221,
        133,
        47
      ]
    },
    {
      "name": "certificateTemplateCreated",
      "discriminator": [
        21,
        40,
        127,
        148,
        13,
        231,
        204,
        163
      ]
    },
    {
      "name": "certificateTemplateUpdated",
      "discriminator": [
        118,
        184,
        46,
        182,
        20,
        108,
        53,
        67
      ]
    },
    {
      "name": "companyAuthorityTransferCancelled",
      "discriminator": [
        221,
        80,
        239,
        141,
        21,
        19,
        201,
        24
      ]
    },
    {
      "name": "companyAuthorityTransferProposed",
      "discriminator": [
        236,
        3,
        139,
        30,
        116,
        93,
        151,
        34
      ]
    },
    {
      "name": "companyAuthorityTransferred",
      "discriminator": [
        87,
        225,
        27,
        216,
        60,
        215,
        227,
        26
      ]
    },
    {
      "name": "companyInitialized",
      "discriminator": [
        35,
        177,
        237,
        225,
        0,
        150,
        214,
        211
      ]
    },
    {
      "name": "companyUpdated",
      "discriminator": [
        244,
        96,
        109,
        128,
        65,
        251,
        26,
        128
      ]
    },
    {
      "name": "employeeAdded",
      "discriminator": [
        33,
        182,
        133,
        249,
        156,
        132,
        180,
        176
      ]
    },
    {
      "name": "employeeClosed",
      "discriminator": [
        231,
        69,
        252,
        206,
        158,
        35,
        204,
        206
      ]
    },
    {
      "name": "employeeConfirmed",
      "discriminator": [
        224,
        178,
        215,
        7,
        188,
        159,
        207,
        38
      ]
    },
    {
      "name": "employeeDetailsUpdated",
      "discriminator": [
        218,
        143,
        184,
        215,
        21,
        165,
        253,
        32
      ]
    },
    {
      "name": "employeeStatusUpdated",
      "discriminator": [
        183,
        170,
        72,
        112,
        36,
        176,
        193,
        220
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "cidTooLong",
      "msg": "CID too long (max 43 characters)"
    },
    {
      "code": 6001,
      "name": "nameTooLong",
      "msg": "Name too long (max 32 characters)"
    },
    {
      "code": 6002,
      "name": "uriTooLong",
      "msg": "URI too long (max 43 characters)"
    },
    {
      "code": 6003,
      "name": "symbolTooLong",
      "msg": "Symbol too long (max 10 characters)"
    },
    {
      "code": 6004,
      "name": "companyInactive",
      "msg": "Company is not active"
    },
    {
      "code": 6005,
      "name": "employeeNotActive",
      "msg": "Employee is not active"
    },
    {
      "code": 6006,
      "name": "certificateNotActive",
      "msg": "Certificate is not active"
    },
    {
      "code": 6007,
      "name": "awardTypeInactive",
      "msg": "Award type is not active"
    },
    {
      "code": 6008,
      "name": "unauthorized",
      "msg": "Unauthorized access"
    },
    {
      "code": 6009,
      "name": "invalidCompany",
      "msg": "Invalid company"
    },
    {
      "code": 6010,
      "name": "invalidEmployee",
      "msg": "Invalid employee"
    },
    {
      "code": 6011,
      "name": "invalidTokenAccount",
      "msg": "Invalid token account"
    },
    {
      "code": 6012,
      "name": "numericalOverflow",
      "msg": "Numerical overflow"
    },
    {
      "code": 6013,
      "name": "invalidEmployeeState",
      "msg": "Invalid employee state"
    },
    {
      "code": 6014,
      "name": "employeeStillActive",
      "msg": "Employee is still active"
    },
    {
      "code": 6015,
      "name": "certificateNotClosable",
      "msg": "Certificate cannot be closed"
    }
  ],
  "types": [
    {
      "name": "award",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "awardId",
            "type": {
              "array": [
                "u8",
                6
              ]
            }
          },
          {
            "name": "company",
            "type": "pubkey"
          },
          {
            "name": "employee",
            "type": "pubkey"
          },
          {
            "name": "awardType",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "awardMinted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "award",
            "type": "pubkey"
          },
          {
            "name": "company",
            "type": "pubkey"
          },
          {
            "name": "employee",
            "type": "pubkey"
          },
          {
            "name": "awardType",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "awardId",
            "type": {
              "array": [
                "u8",
                6
              ]
            }
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "awardType",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "awardTypeId",
            "type": {
              "array": [
                "u8",
                6
              ]
            }
          },
          {
            "name": "company",
            "type": "pubkey"
          },
          {
            "name": "metadataUri",
            "type": "string"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "totalIssued",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          },
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "awardTypeCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "awardType",
            "type": "pubkey"
          },
          {
            "name": "company",
            "type": "pubkey"
          },
          {
            "name": "awardTypeId",
            "type": {
              "array": [
                "u8",
                6
              ]
            }
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "awardTypeUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "awardType",
            "type": "pubkey"
          },
          {
            "name": "company",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "certificate",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "certificateId",
            "type": {
              "array": [
                "u8",
                6
              ]
            }
          },
          {
            "name": "company",
            "type": "pubkey"
          },
          {
            "name": "employee",
            "type": "pubkey"
          },
          {
            "name": "template",
            "type": {
              "array": [
                "u8",
                6
              ]
            }
          },
          {
            "name": "certificateDetails",
            "type": "string"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "certificateStatus"
              }
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "expiresAt",
            "type": "i64"
          },
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "certificateClosed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "company",
            "type": "pubkey"
          },
          {
            "name": "certificate",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "certificateIssued",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "certificate",
            "type": "pubkey"
          },
          {
            "name": "company",
            "type": "pubkey"
          },
          {
            "name": "employee",
            "type": "pubkey"
          },
          {
            "name": "certificateId",
            "type": {
              "array": [
                "u8",
                6
              ]
            }
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "certificateRevoked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "certificate",
            "type": "pubkey"
          },
          {
            "name": "company",
            "type": "pubkey"
          },
          {
            "name": "employee",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "certificateStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "revoked"
          },
          {
            "name": "expired"
          }
        ]
      }
    },
    {
      "name": "certificateTemplate",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "templateId",
            "type": {
              "array": [
                "u8",
                6
              ]
            }
          },
          {
            "name": "company",
            "type": "pubkey"
          },
          {
            "name": "certificateDetails",
            "type": "string"
          },
          {
            "name": "totalIssued",
            "type": "u16"
          },
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "certificateTemplateCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "template",
            "type": "pubkey"
          },
          {
            "name": "company",
            "type": "pubkey"
          },
          {
            "name": "templateId",
            "type": {
              "array": [
                "u8",
                6
              ]
            }
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "certificateTemplateUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "template",
            "type": "pubkey"
          },
          {
            "name": "company",
            "type": "pubkey"
          },
          {
            "name": "templateId",
            "type": {
              "array": [
                "u8",
                6
              ]
            }
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "company",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "companyId",
            "type": {
              "array": [
                "u8",
                6
              ]
            }
          },
          {
            "name": "companyDetails",
            "type": "string"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "totalEmployees",
            "type": "u16"
          },
          {
            "name": "totalCertificates",
            "type": "u32"
          },
          {
            "name": "totalTemplates",
            "type": "u8"
          },
          {
            "name": "totalAwards",
            "type": "u16"
          },
          {
            "name": "totalRevoked",
            "type": "u32"
          },
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "companyAuthorityTransferCancelled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "company",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "companyAuthorityTransferProposed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "company",
            "type": "pubkey"
          },
          {
            "name": "currentAuthority",
            "type": "pubkey"
          },
          {
            "name": "pendingAuthority",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "companyAuthorityTransferred",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "company",
            "type": "pubkey"
          },
          {
            "name": "oldAuthority",
            "type": "pubkey"
          },
          {
            "name": "newAuthority",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "companyInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "company",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "companyId",
            "type": {
              "array": [
                "u8",
                6
              ]
            }
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "version",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "companyUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "company",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "employee",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "company",
            "type": "pubkey"
          },
          {
            "name": "employeeDetails",
            "type": "string"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "employeeStatus"
              }
            }
          },
          {
            "name": "totalCertificates",
            "type": "u8"
          },
          {
            "name": "totalAwards",
            "type": "u8"
          },
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "employeeAdded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "company",
            "type": "pubkey"
          },
          {
            "name": "employee",
            "type": "pubkey"
          },
          {
            "name": "employeeWallet",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "employeeClosed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "company",
            "type": "pubkey"
          },
          {
            "name": "employee",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "employeeConfirmed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "employee",
            "type": "pubkey"
          },
          {
            "name": "company",
            "type": "pubkey"
          },
          {
            "name": "employeeWallet",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "employeeDetailsUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "employee",
            "type": "pubkey"
          },
          {
            "name": "company",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "employeeStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "active"
          },
          {
            "name": "inactive"
          }
        ]
      }
    },
    {
      "name": "employeeStatusUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "employee",
            "type": "pubkey"
          },
          {
            "name": "company",
            "type": "pubkey"
          },
          {
            "name": "oldStatus",
            "type": {
              "defined": {
                "name": "employeeStatus"
              }
            }
          },
          {
            "name": "newStatus",
            "type": {
              "defined": {
                "name": "employeeStatus"
              }
            }
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "pendingTransfer",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "company",
            "type": "pubkey"
          },
          {
            "name": "newAuthority",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
