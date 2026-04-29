import { db } from "../db";
import { parseWorkLog } from "../nlp";

export function worklogRoutes(req: Request, url: URL): Response | null {
  const path = url.pathname;

  if (req.method === "GET" && path === "/api/worklogs") {
    const { searchParams } = url;
    let q = `SELECT wl.*, p.name as project_name, p.type as project_type
      FROM work_logs wl JOIN projects p ON wl.project_id = p.id WHERE 1=1`;
    const params: unknown[] = [];
    if (searchParams.get("project_id")) { q += " AND wl.project_id = ?"; params.push(parseInt(searchParams.get("project_id")!)); }
    if (searchParams.get("colleague")) { q += " AND wl.colleague_name LIKE ?"; params.push(`%${searchParams.get("colleague")}%`); }
    if (searchParams.get("start_date")) { q += " AND wl.log_date >= ?"; params.push(searchParams.get("start_date")); }
    if (searchParams.get("end_date")) { q += " AND wl.log_date <= ?"; params.push(searchParams.get("end_date")); }
    q += " ORDER BY wl.log_date DESC, wl.created_at DESC";
    return Response.json({ data: db.query(q).all(...params) });
  }

  if (req.method === "GET" && path === "/api/worklogs/stats") {
    const byType = db.query(`
      SELECT p.type, SUM(wl.hours) as total_hours,
        COUNT(DISTINCT wl.colleague_name) as unique_colleagues, COUNT(*) as log_count
      FROM work_logs wl JOIN projects p ON wl.project_id = p.id GROUP BY p.type
    `).all();

    const byProject = db.query(`
      SELECT p.id, p.name, p.type, p.completion, p.deadline, p.status,
        COALESCE(SUM(wl.hours), 0) as total_hours, COUNT(DISTINCT wl.colleague_name) as members
      FROM projects p LEFT JOIN work_logs wl ON p.id = wl.project_id
      GROUP BY p.id ORDER BY total_hours DESC
    `).all();

    const byColleague = db.query(`
      SELECT wl.colleague_name, SUM(wl.hours) as total_hours,
        COUNT(DISTINCT wl.project_id) as project_count,
        SUM(CASE WHEN p.type = 'business' THEN wl.hours ELSE 0 END) as business_hours,
        SUM(CASE WHEN p.type = 'innovation' THEN wl.hours ELSE 0 END) as innovation_hours
      FROM work_logs wl JOIN projects p ON wl.project_id = p.id
      GROUP BY wl.colleague_name ORDER BY total_hours DESC
    `).all();

    const byDate = db.query(`
      SELECT wl.log_date,
        SUM(CASE WHEN p.type = 'business' THEN wl.hours ELSE 0 END) as business_hours,
        SUM(CASE WHEN p.type = 'innovation' THEN wl.hours ELSE 0 END) as innovation_hours,
        SUM(wl.hours) as total_hours
      FROM work_logs wl JOIN projects p ON wl.project_id = p.id
      GROUP BY wl.log_date ORDER BY wl.log_date ASC
    `).all();

    return Response.json({ data: { byType, byProject, byColleague, byDate } });
  }

  const matchId = path.match(/^\/api\/worklogs\/(\d+)$/);
  if (req.method === "DELETE" && matchId) {
    db.query("DELETE FROM work_logs WHERE id = ?").run(parseInt(matchId[1]));
    return Response.json({ success: true });
  }

  return null;
}

export async function worklogRoutesAsync(req: Request, url: URL): Promise<Response | null> {
  const path = url.pathname;

  if (req.method === "POST" && path === "/api/worklogs") {
    const body = await req.json() as {
      colleague_name: string; project_id: number; hours: number;
      log_date: string; description?: string; raw_input?: string;
    };
    const result = db.prepare(
      "INSERT INTO work_logs (colleague_name, project_id, hours, log_date, description, raw_input) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(body.colleague_name, body.project_id, body.hours, body.log_date, body.description ?? "", body.raw_input ?? "");
    const newLog = db.query(`
      SELECT wl.*, p.name as project_name, p.type as project_type
      FROM work_logs wl JOIN projects p ON wl.project_id = p.id WHERE wl.id = ?
    `).get(result.lastInsertRowid);
    return Response.json({ data: newLog }, { status: 201 });
  }

  if (req.method === "POST" && path === "/api/worklogs/parse") {
    const body = await req.json() as { text: string };
    const parsed = parseWorkLog(body.text);
    const projects = db.query("SELECT id, name, type FROM projects").all() as Array<{ id: number; name: string; type: string }>;

    let matched_project = null;
    let bestScore = 0;
    for (const p of projects) {
      const hint = parsed.project_hint.toLowerCase();
      const name = p.name.toLowerCase();
      let score = 0;
      if (name.includes(hint) || hint.includes(name)) score = 100;
      else for (const ch of hint) if (name.includes(ch)) score += 10;
      if (score > bestScore) { bestScore = score; matched_project = p; }
    }

    return Response.json({ data: { parsed, matched_project: bestScore > 20 ? matched_project : null, projects } });
  }

  return null;
}
