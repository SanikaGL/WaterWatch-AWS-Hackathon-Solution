// Local dev API: same router as Lambda, over Express. DynamoDB Local backs it.
// Dev-auth shim: send header `x-dev-groups: authority` (or cleaner/volunteer) to
// simulate a Cognito JWT locally. Real Cognito is used in deployed environments.
import express from "express";
import cors from "cors";
import { buildRouter } from "../http/routes.js";
import type { HttpRequest } from "../http/types.js";

process.env.IS_LOCAL = "true";
process.env.DDB_ENDPOINT = process.env.DDB_ENDPOINT || "http://localhost:8000";
process.env.TABLE_NAME = process.env.TABLE_NAME || "waterwatch-local";

const router = buildRouter();
const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Stubbed S3 for local presigned uploads: actually store + serve bytes in memory
// so previews survive a reload and the demo looks real without AWS.
const localObjects = new Map<string, { contentType: string; body: Buffer }>();
app.put("/__local_s3__/:key", express.raw({ type: "*/*", limit: "10mb" }), (req, res) => {
  localObjects.set(req.params.key, {
    contentType: req.header("content-type") || "application/octet-stream",
    body: req.body as Buffer,
  });
  res.status(200).end();
});
app.get("/__local_s3__/:key", (req, res) => {
  const obj = localObjects.get(req.params.key);
  if (!obj) return res.status(404).end();
  res.setHeader("Content-Type", obj.contentType);
  return res.status(200).send(obj.body);
});

app.all(/.*/, async (req, res) => {
  const groups = (req.header("x-dev-groups") || "").split(/[,\s]+/).filter(Boolean);
  // Optional x-dev-sub lets local tests simulate DISTINCT users (real Cognito gives
  // each user a unique sub). Defaults to "dev-user" so existing flows are unchanged.
  const devSub = req.header("x-dev-sub") || "dev-user";
  const auth: HttpRequest["auth"] | undefined = groups.length
    ? { sub: devSub, email: `${devSub}@local`, groups }
    : undefined;

  const query: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(req.query)) query[k] = Array.isArray(v) ? String(v[0]) : (v as string);

  try {
    const result = await router.handle({
      method: req.method,
      path: req.path,
      query,
      body: req.body,
      auth,
    });
    res.status(result.statusCode).json(result.body);
  } catch (err) {
    console.error("Handler error:", err);
    res.status(500).json({ error: "Internal error", detail: String(err) });
  }
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`WaterWatch local API on http://localhost:${PORT}`);
  console.log(`DynamoDB endpoint: ${process.env.DDB_ENDPOINT}`);
});
