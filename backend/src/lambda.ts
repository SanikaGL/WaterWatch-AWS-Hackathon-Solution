// Lambda entry for API Gateway HTTP API (payload format v2).
// Translates the event to our HttpRequest, runs the shared router, returns v2 response.
import { buildRouter } from "./http/routes.js";
import type { HttpRequest } from "./http/types.js";
import { runMonthlyPollutionAnalysis } from "./domain/monthlyAlerts.js";

const router = buildRouter();

// EventBridge monthly schedule -> run the pollution analysis for all regions.
// Separate entry from the HTTP handler; wired to a cron in template.yaml.
export const scheduledMonthly = async () => {
  const result = await runMonthlyPollutionAnalysis();
  console.log("[monthly-alerts]", JSON.stringify(result));
  return result;
};

interface ApiGwV2Event {
  requestContext: {
    http: { method: string; path: string };
    authorizer?: { jwt?: { claims?: Record<string, string> } };
  };
  headers?: Record<string, string | undefined>;
  rawPath: string;
  rawQueryString?: string;
  body?: string;
  isBase64Encoded?: boolean;
  pathParameters?: Record<string, string>;
}

// Decode (without verifying) the claims of a Cognito ID token. Routes are public
// by default; when the SPA sends "Authorization: Bearer <idToken>", we read the
// identity from it. API Gateway terminated TLS and the token came from our own
// Cognito sign-in. (Signature verification can be layered on later.)
function claimsFromBearer(headers?: Record<string, string | undefined>): Record<string, string> | undefined {
  if (!headers) return undefined;
  // Header names are lower-cased by API Gateway v2.
  const auth = headers["authorization"] || headers["Authorization"];
  if (!auth) return undefined;
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  if (!m) return undefined;
  const parts = m[1].split(".");
  if (parts.length < 2) return undefined;
  try {
    const json = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return JSON.parse(json) as Record<string, string>;
  } catch {
    return undefined;
  }
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
};

function parseGroups(claims?: Record<string, unknown>): string[] {
  if (!claims) return [];
  const raw = claims["cognito:groups"];
  if (!raw) return [];
  // From a decoded ID token it's a real array; from the API GW authorizer it's a
  // bracketed string like "[volunteer cleaner]". Handle both.
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  return String(raw).replace(/[[\]]/g, "").split(/[,\s]+/).filter(Boolean);
}

export const handler = async (event: ApiGwV2Event) => {
  const method = event.requestContext.http.method;
  let path = event.rawPath || event.requestContext.http.path;
  // HTTP API with a named stage prefixes the path with "/{stage}" (e.g. /dev/health).
  // Strip it so the shared router (which knows "/health") matches.
  const stage = process.env.STAGE_NAME;
  if (stage && path.startsWith(`/${stage}/`)) path = path.slice(stage.length + 1);
  else if (stage && path === `/${stage}`) path = "/";

  if (method === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  const query: Record<string, string | undefined> = {};
  if (event.rawQueryString) {
    for (const [k, v] of new URLSearchParams(event.rawQueryString)) query[k] = v;
  }

  let body: unknown = undefined;
  if (event.body) {
    const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
    try { body = JSON.parse(raw); } catch { body = raw; }
  }

  // Prefer authorizer claims; otherwise decode the bearer token the SPA sent.
  const claims: Record<string, unknown> | undefined =
    event.requestContext.authorizer?.jwt?.claims ?? claimsFromBearer(event.headers);
  const auth: HttpRequest["auth"] | undefined = claims && claims.sub
    ? { sub: String(claims.sub), email: claims.email ? String(claims.email) : undefined, groups: parseGroups(claims) }
    : undefined;

  const res = await router.handle({ method, path, query, body, auth });
  return {
    statusCode: res.statusCode,
    headers: { "Content-Type": "application/json", ...CORS },
    body: JSON.stringify(res.body),
  };
};
