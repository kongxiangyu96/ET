import { initDb } from "./db";
import { projectRoutes, projectRoutesAsync } from "./routes/projects";
import { worklogRoutes, worklogRoutesAsync } from "./routes/worklogs";
import { summaryRoutes } from "./routes/summary";
import { join } from "path";
import { existsSync } from "fs";

initDb();

const PORT = Number(process.env.PORT ?? 3001);
const IS_PROD = process.env.NODE_ENV === "production";
const DIST_DIR = join(import.meta.dir, "../dist");

const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";
const CORS = {
  "Access-Control-Allow-Origin": CORS_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function serveStatic(url: URL): Promise<Response | null> {
  if (!IS_PROD) return null;

  let filePath = join(DIST_DIR, url.pathname);

  if (existsSync(filePath) && (await Bun.file(filePath).exists())) {
    const file = Bun.file(filePath);
    if (file.size > 0) return new Response(file);
  }

  // SPA fallback: 所有非文件路径返回 index.html
  const index = Bun.file(join(DIST_DIR, "index.html"));
  if (await index.exists()) return new Response(index, { headers: { "Content-Type": "text/html" } });

  return null;
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    const url = new URL(req.url);

    const withCors = (res: Response) => {
      for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
      return res;
    };

    try {
      // API 路由优先
      if (url.pathname.startsWith("/api/")) {
        let res = projectRoutes(req, url) ?? worklogRoutes(req, url) ?? summaryRoutes(req, url);
        if (res) return withCors(res);

        res = (await projectRoutesAsync(req, url)) ?? (await worklogRoutesAsync(req, url));
        if (res) return withCors(res);

        return withCors(Response.json({ error: "Not found" }, { status: 404 }));
      }

      // 生产环境托管静态前端
      const staticRes = await serveStatic(url);
      if (staticRes) return staticRes;

      return withCors(Response.json({ error: "Not found" }, { status: 404 }));
    } catch (err) {
      console.error(err);
      return withCors(Response.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 }));
    }
  },
});

console.log(`Effort Tracker running on http://0.0.0.0:${PORT} [${IS_PROD ? "production" : "development"}]`);
