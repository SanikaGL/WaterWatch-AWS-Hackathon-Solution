// Environment-agnostic request/response shapes. The same handler runs under
// API Gateway (Lambda) and the local Express server.

export interface HttpRequest {
  method: string;
  path: string;
  pathParams: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  // Auth context populated by the JWT authorizer (Cognito) or local dev shim.
  auth?: {
    sub: string;
    email?: string;
    groups: string[]; // e.g. ["volunteer"] | ["cleaner"] | ["authority"]
  };
}

export interface HttpResponse {
  statusCode: number;
  body: unknown;
}

export type Handler = (req: HttpRequest) => Promise<HttpResponse>;

export const ok = (body: unknown): HttpResponse => ({ statusCode: 200, body });
export const created = (body: unknown): HttpResponse => ({ statusCode: 201, body });
export const badRequest = (message: string, extra?: unknown): HttpResponse => ({
  statusCode: 400,
  body: { error: message, ...(extra ? { details: extra } : {}) },
});
export const unauthorized = (message = "Unauthorized"): HttpResponse => ({
  statusCode: 401,
  body: { error: message },
});
export const forbidden = (message = "Forbidden"): HttpResponse => ({
  statusCode: 403,
  body: { error: message },
});
export const notFound = (message = "Not found"): HttpResponse => ({
  statusCode: 404,
  body: { error: message },
});
export const serverError = (message = "Internal error"): HttpResponse => ({
  statusCode: 500,
  body: { error: message },
});
