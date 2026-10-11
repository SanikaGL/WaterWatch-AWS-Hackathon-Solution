// DynamoDB document client. Works against DynamoDB Local (dev) or real AWS.
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { config } from "../domain/config.js";
import { MemoryDocClient } from "./memoryDb.js";

// Pick the backing client:
// - USE_MEMORY_DB=true -> in-memory (file-persisted) store; no Docker/AWS needed.
// - DDB_ENDPOINT set    -> DynamoDB Local (Docker).
// - otherwise           -> real AWS DynamoDB.
function makeClient() {
  if (process.env.USE_MEMORY_DB === "true") {
    const file = process.env.MEMORY_DB_FILE || "./.local-db.json";
    console.log(`[data] Using in-memory DB (persisted to ${file})`);
    return new MemoryDocClient(file) as unknown as DynamoDBDocumentClient;
  }

  const clientConfig: Record<string, unknown> = { region: config.AWS_REGION };
  if (config.DDB_ENDPOINT) {
    clientConfig.endpoint = config.DDB_ENDPOINT;
    clientConfig.credentials = { accessKeyId: "local", secretAccessKey: "local" };
  }
  const base = new DynamoDBClient(clientConfig);
  return DynamoDBDocumentClient.from(base, {
    marshallOptions: { removeUndefinedValues: true },
  });
}

export const ddb = makeClient();

export const TABLE = config.TABLE_NAME;

// Key helpers (single-table design)
export const keys = {
  regionMeta: (talukId: string) => ({ PK: `REGION#${talukId}`, SK: "META" }),
  report: (talukId: string, ts: string, reportId: string) => ({
    PK: `REGION#${talukId}`,
    SK: `REPORT#${ts}#${reportId}`,
  }),
  comment: (reportId: string, ts: string, commentId: string) => ({
    PK: `REPORT#${reportId}`,
    SK: `COMMENT#${ts}#${commentId}`,
  }),
  floodAll: (ts: string, floodId: string) => ({
    PK: "FLOOD#ALL",
    SK: `FLOOD#${ts}#${floodId}`,
  }),
  floodUpdate: (floodId: string, ts: string, updateId: string) => ({
    PK: `FLOOD#${floodId}`,
    SK: `UPDATE#${ts}#${updateId}`,
  }),
  waterBody: (talukId: string, waterBodyId: string) => ({
    PK: `REGION#${talukId}`,
    SK: `WB#${waterBodyId}`,
  }),
  event: (talukId: string, date: string, eventId: string) => ({
    PK: `REGION#${talukId}`,
    SK: `EVENT#${date}#${eventId}`,
  }),
  eventUpdate: (eventId: string, ts: string, updateId: string) => ({
    PK: `EVENT#${eventId}`,
    SK: `UPDATE#${ts}#${updateId}`,
  }),
  eventMessage: (eventId: string, ts: string, messageId: string) => ({
    PK: `EVENT#${eventId}`,
    SK: `MSG#${ts}#${messageId}`,
  }),
  recurring: (talukId: string, waterBodyId: string) => ({
    PK: `REGION#${talukId}`,
    SK: `RECUR#${waterBodyId}`,
  }),
  socialPost: (ts: string, postId: string) => ({
    PK: "POST#ALL",
    SK: `POST#${ts}#${postId}`,
  }),
  volunteer: (volunteerId: string) => ({
    PK: `VOL#${volunteerId}`,
    SK: "PROFILE",
  }),
  volunteerPost: (ts: string, postId: string) => ({
    PK: "VPOST#ALL",
    SK: `VPOST#${ts}#${postId}`,
  }),
  authority: (authorityId: string) => ({
    PK: `AUTH#${authorityId}`,
    SK: "PROFILE",
  }),
  // A thread is stored once; both participants read it via the GSI (THREADS#<userId>).
  thread: (threadId: string) => ({
    PK: `THREAD#${threadId}`,
    SK: "META",
  }),
  message: (threadId: string, ts: string, messageId: string) => ({
    PK: `THREAD#${threadId}`,
    SK: `MSG#${ts}#${messageId}`,
  }),
};
