export const idl = {
  version: "0.1.0",
  name: "match_agreement",
  instructions: [
    {
      name: "createAgreement",
      accounts: [
        { name: "agreement", isMut: true, isSigner: false },
        { name: "matcher", isMut: true, isSigner: true },
        { name: "matchee", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "metadataCid", type: "string" },
        { name: "totalCheckpoints", type: "u8" },
      ],
    },
    {
      name: "acceptAgreement",
      accounts: [
        { name: "agreement", isMut: true, isSigner: false },
        { name: "matchee", isMut: false, isSigner: true },
      ],
      args: [],
    },
    {
      name: "closeAgreement",
      accounts: [
        { name: "agreement", isMut: true, isSigner: false },
        { name: "signer", isMut: false, isSigner: true },
      ],
      args: [],
    },
    {
      name: "markCheckpointDone",
      accounts: [
        { name: "agreement", isMut: true, isSigner: false },
        { name: "matcher", isMut: false, isSigner: true },
      ],
      args: [{ name: "index", type: "u8" }],
    },
    {
      name: "getAgreementStatus",
      accounts: [{ name: "agreement", isMut: false, isSigner: false }],
      args: [],
      returns: { defined: "AgreementStatus" },
    },
    {
      name: "reopenAgreement",
      accounts: [
        { name: "agreement", isMut: true, isSigner: false },
        { name: "signer", isMut: false, isSigner: true },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "Agreement",
      type: {
        kind: "struct",
        fields: [
          { name: "matcher", type: "publicKey" },
          { name: "matchee", type: "publicKey" },
          { name: "isAccepted", type: "bool" },
          { name: "metadataCid", type: "string" },
          { name: "totalCheckpoints", type: "u8" },
          { name: "currentCheckpoint", type: "u8" },
          { name: "checkpointStatus", type: { vec: "bool" } },
          { name: "isCompleted", type: "bool" },
          { name: "isClosed", type: "bool" },
          { name: "bump", type: "u8" },
        ],
      },
    },
  ],
  types: [
    {
      name: "AgreementStatus",
      type: {
        kind: "struct",
        fields: [
          { name: "isAccepted", type: "bool" },
          { name: "isCompleted", type: "bool" },
          { name: "isClosed", type: "bool" },
          { name: "completedCheckpoints", type: "u8" },
          { name: "totalCheckpoints", type: "u8" },
          { name: "matcher", type: "publicKey" },
          { name: "matchee", type: "publicKey" },
          { name: "metadataCid", type: "string" },
        ],
      },
    },
  ],
  events: [
    {
      name: "NewAgreementEvent",
      fields: [
        { name: "matcher", type: "publicKey", index: false },
        { name: "matchee", type: "publicKey", index: false },
        { name: "totalCheckpoints", type: "u8", index: false },
      ],
    },
    {
      name: "AgreementAcceptedEvent",
      fields: [
        { name: "matcher", type: "publicKey", index: false },
        { name: "matchee", type: "publicKey", index: false },
      ],
    },
    {
      name: "AgreementClosedEvent",
      fields: [
        { name: "matcher", type: "publicKey", index: false },
        { name: "matchee", type: "publicKey", index: false },
        { name: "closedBy", type: "publicKey", index: false },
      ],
    },
    {
      name: "AgreementReopenedEvent",
      fields: [
        { name: "matcher", type: "publicKey", index: false },
        { name: "matchee", type: "publicKey", index: false },
        { name: "reopenedBy", type: "publicKey", index: false },
      ],
    },
    {
      name: "CheckpointMarkedEvent",
      fields: [
        { name: "matcher", type: "publicKey", index: false },
        { name: "matchee", type: "publicKey", index: false },
        { name: "checkpointIndex", type: "u8", index: false },
        { name: "completedCount", type: "u8", index: false },
        { name: "totalCheckpoints", type: "u8", index: false },
      ],
    },
    {
      name: "AgreementCompletedEvent",
      fields: [
        { name: "matcher", type: "publicKey", index: false },
        { name: "matchee", type: "publicKey", index: false },
      ],
    },
  ],
  errors: [
    { code: 6000, name: "Unauthorized", msg: "Unauthorized action." },
    { code: 6001, name: "NotAccepted", msg: "Agreement not accepted yet." },
    { code: 6002, name: "InvalidCheckpoint", msg: "Invalid checkpoint index." },
    { code: 6003, name: "AlreadyAccepted", msg: "Agreement already accepted." },
    {
      code: 6004,
      name: "CheckpointAlreadyDone",
      msg: "Checkpoint already marked as done.",
    },
    {
      code: 6005,
      name: "AlreadyCompleted",
      msg: "Agreement already completed.",
    },
    { code: 6006, name: "AlreadyClosed", msg: "Agreement already closed." },
    { code: 6007, name: "NotClosed", msg: "Agreement is not closed." },
    {
      code: 6008,
      name: "InvalidCheckpointCount",
      msg: "Invalid checkpoint count. Must be greater than 0.",
    },
    {
      code: 6009,
      name: "TooManyCheckpoints",
      msg: "Too many checkpoints. Maximum allowed is 50.",
    },
    {
      code: 6010,
      name: "MetadataTooLong",
      msg: "Metadata CID too long. Maximum allowed is 200 characters.",
    },
    {
      code: 6011,
      name: "NotCompleted",
      msg: "Agreement is not completed yet.",
    },
  ],
};
