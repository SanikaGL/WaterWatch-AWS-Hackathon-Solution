// Minimal in-memory stand-in for DynamoDBDocumentClient, implementing just the
// command shapes repo.ts uses (Put/Get/Query/Update). Lets local dev + demos run
// with zero Docker/AWS. NOT for production — real DynamoDB is used when deployed.
import { PutCommand, GetCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

type Item = Record<string, any>;

export class MemoryDocClient {
  // keyed by `${PK}\u0000${SK}`
  private store = new Map<string, Item>();
  private file?: string;

  constructor(persistFile?: string) {
    this.file = persistFile;
    if (this.file && existsSync(this.file)) {
      try {
        const data = JSON.parse(readFileSync(this.file, "utf8")) as Item[];
        for (const it of data) this.store.set(this.key(it.PK, it.SK), it);
      } catch {
        // ignore corrupt file; start empty
      }
    }
  }

  private persist() {
    if (!this.file) return;
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify([...this.store.values()], null, 0));
  }

  private key(pk: string, sk: string) {
    return `${pk}\u0000${sk}`;
  }

  async send(command: any): Promise<any> {
    if (command instanceof PutCommand) return this.put(command.input);
    if (command instanceof GetCommand) return this.get(command.input);
    if (command instanceof QueryCommand) return this.query(command.input);
    if (command instanceof UpdateCommand) return this.update(command.input);
    throw new Error(`MemoryDocClient: unsupported command ${command?.constructor?.name}`);
  }

  private put(input: any) {
    const item = input.Item as Item;
    this.store.set(this.key(item.PK, item.SK), { ...item });
    this.persist();
    return {};
  }

  private get(input: any) {
    const { PK, SK } = input.Key;
    const item = this.store.get(this.key(PK, SK));
    return { Item: item ? { ...item } : undefined };
  }

  private update(input: any) {
    const { PK, SK } = input.Key;
    const k = this.key(PK, SK);
    const existing = this.store.get(k) ?? { PK, SK };
    // Support only "SET #a = :v" expressions used by repo (status updates).
    const expr: string = input.UpdateExpression ?? "";
    const names: Record<string, string> = input.ExpressionAttributeNames ?? {};
    const values: Record<string, any> = input.ExpressionAttributeValues ?? {};
    const setPart = expr.replace(/^SET\s+/i, "");
    for (const assignment of setPart.split(",")) {
      const [lhs, rhs] = assignment.split("=").map((s) => s.trim());
      const attr = lhs.startsWith("#") ? names[lhs] : lhs;
      existing[attr] = values[rhs];
    }
    this.store.set(k, existing);
    this.persist();
    return { Attributes: { ...existing } };
  }

  private query(input: any) {
    const useGsi = input.IndexName === "GSI1";
    const pkAttr = useGsi ? "GSI1PK" : "PK";
    const skAttr = useGsi ? "GSI1SK" : "SK";
    const values: Record<string, any> = input.ExpressionAttributeValues ?? {};

    // Expect "PK = :pk AND begins_with(SK, :sk)" (sk optional).
    const pkVal = values[":pk"];
    const skPrefix = values[":sk"] as string | undefined;

    let items = [...this.store.values()].filter((it) => it[pkAttr] === pkVal);
    if (skPrefix !== undefined) {
      items = items.filter((it) => String(it[skAttr] ?? "").startsWith(skPrefix));
    }

    items.sort((a, b) => String(a[skAttr]).localeCompare(String(b[skAttr])));
    if (input.ScanIndexForward === false) items.reverse();
    if (input.Limit) items = items.slice(0, input.Limit);

    return { Items: items.map((i) => ({ ...i })), Count: items.length };
  }
}
