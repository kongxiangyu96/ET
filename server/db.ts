import { Database } from "bun:sqlite";
import path from "path";
import { mkdirSync } from "fs";

const DB_PATH = path.join(import.meta.dir, "../data/effort.db");
mkdirSync(path.join(import.meta.dir, "../data"), { recursive: true });

export const db = new Database(DB_PATH, { create: true });

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('business', 'innovation')),
      description TEXT DEFAULT '',
      deadline TEXT,
      completion INTEGER DEFAULT 0 CHECK(completion >= 0 AND completion <= 100),
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'paused')),
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS work_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      colleague_name TEXT NOT NULL,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      hours REAL NOT NULL CHECK(hours > 0),
      log_date TEXT NOT NULL,
      description TEXT DEFAULT '',
      raw_input TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_work_logs_project ON work_logs(project_id);
    CREATE INDEX IF NOT EXISTS idx_work_logs_date ON work_logs(log_date);
    CREATE INDEX IF NOT EXISTS idx_work_logs_colleague ON work_logs(colleague_name);
  `);

  seedMockData();
}

function seedMockData() {
  const count = db.query("SELECT COUNT(*) as c FROM projects").get() as { c: number };
  if (count.c > 0) return;

  const projects = [
    { name: "电商平台重构", type: "business", description: "核心电商系统微服务化改造", deadline: "2025-03-31", completion: 65, status: "active" },
    { name: "CRM系统升级", type: "business", description: "客户关系管理系统功能增强", deadline: "2025-02-28", completion: 80, status: "active" },
    { name: "供应链管理系统", type: "business", description: "供应链数字化转型项目", deadline: "2025-04-30", completion: 40, status: "active" },
    { name: "数据中台建设", type: "business", description: "统一数据中台平台搭建", deadline: "2025-06-30", completion: 20, status: "active" },
    { name: "AI 智能助手", type: "innovation", description: "基于大模型的企业内部智能助手", deadline: "2025-05-31", completion: 55, status: "active" },
    { name: "推荐引擎优化", type: "innovation", description: "基于机器学习的个性化推荐系统", deadline: "2025-04-15", completion: 70, status: "active" },
    { name: "智能风控系统", type: "innovation", description: "实时风险控制与欺诈检测", deadline: "2025-07-31", completion: 30, status: "active" },
    { name: "低代码平台", type: "innovation", description: "面向业务人员的低代码开发平台", deadline: "2025-08-31", completion: 15, status: "active" },
  ];

  const insertProject = db.prepare(
    "INSERT INTO projects (name, type, description, deadline, completion, status) VALUES (?, ?, ?, ?, ?, ?)"
  );
  for (const p of projects) {
    insertProject.run(p.name, p.type, p.description, p.deadline, p.completion, p.status);
  }

  const logs = [
    { name: "张伟", pid: 1, hours: 4, date: "2025-01-06", desc: "完成商品模块微服务拆分" },
    { name: "李娜", pid: 1, hours: 3, date: "2025-01-06", desc: "编写 API 接口文档" },
    { name: "张伟", pid: 1, hours: 5, date: "2025-01-07", desc: "订单服务接口联调" },
    { name: "王芳", pid: 1, hours: 3.5, date: "2025-01-07", desc: "前端购物车组件重构" },
    { name: "陈强", pid: 1, hours: 4, date: "2025-01-08", desc: "支付服务集成测试" },
    { name: "张伟", pid: 1, hours: 3, date: "2025-01-09", desc: "性能优化与压测" },
    { name: "李娜", pid: 1, hours: 2.5, date: "2025-01-10", desc: "Bug 修复" },
    { name: "王芳", pid: 1, hours: 4, date: "2025-01-13", desc: "移动端适配" },
    { name: "刘洋", pid: 2, hours: 5, date: "2025-01-06", desc: "客户画像功能开发" },
    { name: "赵敏", pid: 2, hours: 3, date: "2025-01-06", desc: "销售漏斗数据分析" },
    { name: "刘洋", pid: 2, hours: 4, date: "2025-01-07", desc: "商机管理模块开发" },
    { name: "赵敏", pid: 2, hours: 3.5, date: "2025-01-08", desc: "报表导出功能" },
    { name: "周涛", pid: 2, hours: 4, date: "2025-01-09", desc: "权限系统改造" },
    { name: "刘洋", pid: 2, hours: 2, date: "2025-01-10", desc: "联调测试" },
    { name: "吴静", pid: 3, hours: 6, date: "2025-01-07", desc: "仓储管理模块需求分析" },
    { name: "陈强", pid: 3, hours: 4, date: "2025-01-08", desc: "采购流程建模" },
    { name: "吴静", pid: 3, hours: 5, date: "2025-01-09", desc: "库存预警功能开发" },
    { name: "陈强", pid: 3, hours: 3, date: "2025-01-13", desc: "供应商对接接口" },
    { name: "张伟", pid: 4, hours: 3, date: "2025-01-08", desc: "数据采集链路设计" },
    { name: "李娜", pid: 4, hours: 4, date: "2025-01-09", desc: "元数据管理开发" },
    { name: "王芳", pid: 5, hours: 6, date: "2025-01-06", desc: "Prompt 工程优化" },
    { name: "周涛", pid: 5, hours: 5, date: "2025-01-07", desc: "对话上下文管理" },
    { name: "王芳", pid: 5, hours: 4, date: "2025-01-08", desc: "知识库检索集成" },
    { name: "周涛", pid: 5, hours: 3, date: "2025-01-09", desc: "多轮对话测试" },
    { name: "刘洋", pid: 5, hours: 4, date: "2025-01-10", desc: "前端对话界面开发" },
    { name: "王芳", pid: 5, hours: 5, date: "2025-01-13", desc: "模型评估与调优" },
    { name: "赵敏", pid: 6, hours: 5, date: "2025-01-06", desc: "协同过滤算法改进" },
    { name: "吴静", pid: 6, hours: 4, date: "2025-01-07", desc: "特征工程优化" },
    { name: "赵敏", pid: 6, hours: 3, date: "2025-01-08", desc: "A/B 测试方案设计" },
    { name: "吴静", pid: 6, hours: 4.5, date: "2025-01-09", desc: "在线学习模块开发" },
    { name: "赵敏", pid: 6, hours: 3, date: "2025-01-13", desc: "效果指标监控" },
    { name: "陈强", pid: 7, hours: 5, date: "2025-01-10", desc: "规则引擎框架搭建" },
    { name: "周涛", pid: 7, hours: 4, date: "2025-01-13", desc: "实时流处理管道" },
    { name: "李娜", pid: 8, hours: 4, date: "2025-01-10", desc: "组件库设计规范" },
    { name: "吴静", pid: 8, hours: 3, date: "2025-01-13", desc: "拖拽编辑器原型" },
  ];

  const insertLog = db.prepare(
    "INSERT INTO work_logs (colleague_name, project_id, hours, log_date, description, raw_input) VALUES (?, ?, ?, ?, ?, ?)"
  );
  for (const l of logs) {
    insertLog.run(l.name, l.pid, l.hours, l.date, l.desc, "");
  }
}
