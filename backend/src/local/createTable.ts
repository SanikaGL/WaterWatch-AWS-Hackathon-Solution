// Creates the single-table schema (with GSI1) in DynamoDB Local.
import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";

const endpoint = process.env.DDB_ENDPOINT || "http://localhost:8000";
const TableName = process.env.TABLE_NAME || "waterwatch-local";

const client = new DynamoDBClient({
  region: "us-east-1",
  endpoint,
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
});

async function main() {
  try {
    await client.send(new DescribeTableCommand({ TableName }));
    console.log(`Table ${TableName} already exists.`);
    return;
  } catch {
    // not found -> create
  }

  await client.send(new CreateTableCommand({
    TableName,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      { AttributeName: "PK", AttributeType: "S" },
      { AttributeName: "SK", AttributeType: "S" },
      { AttributeName: "GSI1PK", AttributeType: "S" },
      { AttributeName: "GSI1SK", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "PK", KeyType: "HASH" },
      { AttributeName: "SK", KeyType: "RANGE" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "GSI1",
        KeySchema: [
          { AttributeName: "GSI1PK", KeyType: "HASH" },
          { AttributeName: "GSI1SK", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
  }));
  console.log(`Created table ${TableName} with GSI1 at ${endpoint}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
