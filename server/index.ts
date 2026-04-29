import { initDb } from "./db";
import { projectRoutes, projectRoutesAsync } from "./routes/projects";
import { worklogRoutes, worklogRoutesAsync } from "./routes/worklogs";
import { summaryRoutes } from "./routes/summary";

initDb();

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Bun.serve({
  port: 3001,
  async fetch(req) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    const url = new URL(req.url);

    const withCors = (res: Response) => {
      for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
      return res;
    };

    try {
      let res = projectRoutes(req, url) ?? worklogRoutes(req, url) ?? summaryRoutes(req, url);
      if (res) return withCors(res);

      res = (await projectRoutesAsync(req, url)) ?? (await worklogRoutesAsync(req, url));
      if (res) return withCors(res);

      return withCors(Response.json({ error: "Not found" }, { status: 404 }));
    } catch (err) {
      console.error(err);
      return withCors(Response.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 }));
    }
  },
});

console.log("🚀 Effort Tracker API running on http://localhost:3001");
