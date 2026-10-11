// Tiny path router shared by Lambda and local Express. Supports {param} segments.
import type { Handler, HttpRequest, HttpResponse } from "./types.js";
import { notFound } from "./types.js";

interface Route {
  method: string;
  segments: string[];
  handler: Handler;
}

export class Router {
  private routes: Route[] = [];

  add(method: string, pattern: string, handler: Handler) {
    this.routes.push({
      method: method.toUpperCase(),
      segments: pattern.split("/").filter(Boolean),
      handler,
    });
    return this;
  }

  get(p: string, h: Handler) { return this.add("GET", p, h); }
  post(p: string, h: Handler) { return this.add("POST", p, h); }
  patch(p: string, h: Handler) { return this.add("PATCH", p, h); }
  delete(p: string, h: Handler) { return this.add("DELETE", p, h); }

  private match(method: string, path: string): { handler: Handler; pathParams: Record<string, string> } | null {
    const parts = path.split("/").filter(Boolean);
    for (const r of this.routes) {
      if (r.method !== method.toUpperCase()) continue;
      if (r.segments.length !== parts.length) continue;
      const pathParams: Record<string, string> = {};
      let okMatch = true;
      for (let i = 0; i < r.segments.length; i++) {
        const seg = r.segments[i];
        if (seg.startsWith("{") && seg.endsWith("}")) {
          pathParams[seg.slice(1, -1)] = decodeURIComponent(parts[i]);
        } else if (seg !== parts[i]) {
          okMatch = false;
          break;
        }
      }
      if (okMatch) return { handler: r.handler, pathParams };
    }
    return null;
  }

  async handle(req: Omit<HttpRequest, "pathParams">): Promise<HttpResponse> {
    const m = this.match(req.method, req.path);
    if (!m) return notFound(`No route for ${req.method} ${req.path}`);
    return m.handler({ ...req, pathParams: m.pathParams });
  }
}
