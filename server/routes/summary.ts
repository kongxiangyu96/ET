import { db } from "../db";

export function summaryRoutes(req: Request, url: URL): Response | null {
  if (req.method !== "GET" || url.pathname !== "/api/summary") return null;

  const start = url.searchParams.get("start_date") ?? "";
  const end = url.searchParams.get("end_date") ?? "";
  const df = start && end ? `AND wl.log_date BETWEEN '${start}' AND '${end}'` : "";

  const businessProjects = db.query(`
    SELECT p.name, p.completion, p.deadline, p.status,
      COALESCE(SUM(wl.hours), 0) as total_hours,
      GROUP_CONCAT(DISTINCT wl.colleague_name) as members
    FROM projects p LEFT JOIN work_logs wl ON p.id = wl.project_id ${df}
    WHERE p.type = 'business' GROUP BY p.id ORDER BY total_hours DESC
  `).all() as Array<{ name: string; completion: number; deadline: string; status: string; total_hours: number; members: string }>;

  const innovationProjects = db.query(`
    SELECT p.name, p.completion, p.deadline, p.status,
      COALESCE(SUM(wl.hours), 0) as total_hours,
      GROUP_CONCAT(DISTINCT wl.colleague_name) as members
    FROM projects p LEFT JOIN work_logs wl ON p.id = wl.project_id ${df}
    WHERE p.type = 'innovation' GROUP BY p.id ORDER BY total_hours DESC
  `).all() as Array<{ name: string; completion: number; deadline: string; status: string; total_hours: number; members: string }>;

  const colleagueStats = db.query(`
    SELECT wl.colleague_name, SUM(wl.hours) as total_hours,
      SUM(CASE WHEN p.type = 'business' THEN wl.hours ELSE 0 END) as business_hours,
      SUM(CASE WHEN p.type = 'innovation' THEN wl.hours ELSE 0 END) as innovation_hours
    FROM work_logs wl JOIN projects p ON wl.project_id = p.id
    ${df ? `WHERE ${df.replace("AND ", "")}` : ""}
    GROUP BY wl.colleague_name ORDER BY total_hours DESC
  `).all() as Array<{ colleague_name: string; total_hours: number; business_hours: number; innovation_hours: number }>;

  const totalBusiness = businessProjects.reduce((s, p) => s + p.total_hours, 0);
  const totalInnovation = innovationProjects.reduce((s, p) => s + p.total_hours, 0);
  const total = totalBusiness + totalInnovation;

  const now = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
  const period = start && end ? `${start} 至 ${end}` : "全部周期";
  const sm: Record<string, string> = { active: "进行中", completed: "已完成", paused: "已暂停" };

  const markdown = `# 工时投入汇总报告

**生成时间**: ${now}  
**统计周期**: ${period}

---

## 总体概览

| 项目类型 | 总工时 | 占比 |
|---------|--------|------|
| 业务项目 | ${totalBusiness.toFixed(1)} 小时 | ${total > 0 ? ((totalBusiness / total) * 100).toFixed(1) : 0}% |
| 创新项目 | ${totalInnovation.toFixed(1)} 小时 | ${total > 0 ? ((totalInnovation / total) * 100).toFixed(1) : 0}% |
| **合计** | **${total.toFixed(1)} 小时** | **100%** |

---

## 业务项目明细

${businessProjects.map(p => `### ${p.name}

- **完成度**: ${p.completion}%
- **截止日期**: ${p.deadline ?? "未设置"}
- **项目状态**: ${sm[p.status] ?? p.status}
- **投入工时**: ${p.total_hours.toFixed(1)} 小时
- **参与成员**: ${p.members ?? "暂无"}
`).join("\n")}

---

## 创新项目明细

${innovationProjects.map(p => `### ${p.name}

- **完成度**: ${p.completion}%
- **截止日期**: ${p.deadline ?? "未设置"}
- **项目状态**: ${sm[p.status] ?? p.status}
- **投入工时**: ${p.total_hours.toFixed(1)} 小时
- **参与成员**: ${p.members ?? "暂无"}
`).join("\n")}

---

## 人员工时分布

| 姓名 | 业务项目工时 | 创新项目工时 | 总工时 |
|------|------------|------------|--------|
${colleagueStats.map(c => `| ${c.colleague_name} | ${c.business_hours.toFixed(1)}h | ${c.innovation_hours.toFixed(1)}h | ${c.total_hours.toFixed(1)}h |`).join("\n")}

---

*本报告由工时追踪系统自动生成*
`;

  return Response.json({ data: { markdown, stats: { totalBusiness, totalInnovation, businessProjects, innovationProjects, colleagueStats } } });
}
