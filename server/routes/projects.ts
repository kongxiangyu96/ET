import { db } from "../db";

export function projectRoutes(req: Request, url: URL): Response | null {
  const path = url.pathname;

  if (req.method === "GET" && path === "/api/projects") {
    const projects = db.query(`
      SELECT p.*, COALESCE(SUM(wl.hours), 0) as total_hours,
        COUNT(DISTINCT wl.colleague_name) as member_count
      FROM projects p
      LEFT JOIN work_logs wl ON p.id = wl.project_id
      GROUP BY p.id ORDER BY p.created_at DESC
    `).all();
    return Response.json({ data: projects });
  }

  const matchId = path.match(/^\/api\/projects\/(\d+)$/);

  if (req.method === "DELETE" && matchId) {
    db.query("DELETE FROM projects WHERE id = ?").run(parseInt(matchId[1]));
    return Response.json({ success: true });
  }

  return null;
}

export async function projectRoutesAsync(req: Request, url: URL): Promise<Response | null> {
  const path = url.pathname;
  const matchId = path.match(/^\/api\/projects\/(\d+)$/);

  if (req.method === "POST" && path === "/api/projects") {
    const body = await req.json() as {
      name: string; type: string; description?: string;
      deadline?: string; completion?: number; status?: string;
    };
    const result = db.prepare(
      "INSERT INTO projects (name, type, description, deadline, completion, status) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(body.name, body.type, body.description ?? "", body.deadline ?? null, body.completion ?? 0, body.status ?? "active");
    return Response.json({ data: db.query("SELECT * FROM projects WHERE id = ?").get(result.lastInsertRowid) }, { status: 201 });
  }

  if (req.method === "PATCH" && matchId) {
    const id = parseInt(matchId[1]);
    const body = await req.json() as Record<string, unknown>;
    const allowed = ["name", "type", "description", "deadline", "completion", "status"];
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [k, v] of Object.entries(body)) {
      if (allowed.includes(k)) { fields.push(`${k} = ?`); values.push(v); }
    }
    if (!fields.length) return Response.json({ error: "No fields" }, { status: 400 });
    values.push(id);
    db.query(`UPDATE projects SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    return Response.json({ data: db.query("SELECT * FROM projects WHERE id = ?").get(id) });
  }

  return null;
}
