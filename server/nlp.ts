/**
 * 自然语言工时解析器
 * 支持中文自然语言，提取：同事名、项目名、工时、日期、描述
 *
 * 示例：
 *   "张伟今天在电商平台重构上花了3小时做联调"
 *   "李娜昨天参与AI智能助手项目，投入了2.5h"
 *   "王芳 推荐引擎优化 4小时 特征工程"
 */

export interface ParsedWorkLog {
  colleague_name: string;
  project_hint: string;
  hours: number;
  log_date: string;
  description: string;
  confidence: number;
  raw_input: string;
}

const HOUR_PATTERNS = [
  /(\d+(?:\.\d+)?)\s*(?:小时|h|hr|hours?)/i,
  /(\d+(?:\.\d+)?)\s*个小时/,
  /花了?\s*(\d+(?:\.\d+)?)\s*(?:小时|h)/,
  /投入了?\s*(\d+(?:\.\d+)?)\s*(?:小时|h)/,
  /用了?\s*(\d+(?:\.\d+)?)\s*(?:小时|h)/,
];

const DATE_PATTERNS: Array<{ pattern: RegExp; resolver: (m: RegExpMatchArray) => string }> = [
  { pattern: /今天/, resolver: () => formatDate(new Date()) },
  {
    pattern: /昨天/,
    resolver: () => { const d = new Date(); d.setDate(d.getDate() - 1); return formatDate(d); },
  },
  {
    pattern: /前天/,
    resolver: () => { const d = new Date(); d.setDate(d.getDate() - 2); return formatDate(d); },
  },
  {
    pattern: /(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})[日号]?/,
    resolver: (m) => `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`,
  },
  {
    pattern: /(\d{1,2})[月\-\/](\d{1,2})[日号]?/,
    resolver: (m) => `${new Date().getFullYear()}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`,
  },
];

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function extractHours(text: string): number | null {
  for (const p of HOUR_PATTERNS) {
    const m = text.match(p);
    if (m) return parseFloat(m[1]);
  }
  if (/半天/.test(text)) return 4;
  if (/一天|全天/.test(text)) return 8;
  return null;
}

function extractDate(text: string): string {
  for (const { pattern, resolver } of DATE_PATTERNS) {
    const m = text.match(pattern);
    if (m) return resolver(m);
  }
  return formatDate(new Date());
}

function extractColleague(text: string): string {
  const m = text.match(/^([^\s，,。！？在参做用花投了今昨前]{2,4})\s*(?:今天|昨天|前天|在|参与|负责)/);
  if (m) return m[1];
  const start = text.match(/^([\u4e00-\u9fa5]{2,4})/);
  if (start && start[1].length <= 4) return start[1];
  return "";
}

function extractProjectHint(text: string, colleague: string, hoursText: string): string {
  let s = text
    .replace(colleague, "")
    .replace(/今天|昨天|前天|\d{4}[年\-\/]\d{1,2}[月\-\/]\d{1,2}[日号]?|\d{1,2}[月\-\/]\d{1,2}[日号]?/g, "")
    .replace(hoursText || "", "")
    .replace(/[，,。！？]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  s = s.replace(/^(?:在|参与了?|负责了?|投入了?|花了?|用了?|完成了?|参加了?|做了?)\s*/, "");
  s = s.replace(/\s*(?:上|下|中|里|做了?|进行了?|开发了?|测试了?|完成了?|联调了?|优化了?|修复了?|设计了?|研究了?).*$/, "");
  return s.trim();
}

export function parseWorkLog(input: string): ParsedWorkLog {
  const text = input.trim();
  let confidence = 0;

  const hours = extractHours(text);
  const hoursMatch = text.match(/\d+(?:\.\d+)?\s*(?:小时|h|hr|hours?)/i)?.[0] || "";
  const log_date = extractDate(text);
  const colleague_name = extractColleague(text);
  if (colleague_name) confidence += 30;

  const project_hint = extractProjectHint(text, colleague_name, hoursMatch);
  if (project_hint) confidence += 30;
  if (hours) confidence += 30;
  if (log_date) confidence += 10;

  const description = text
    .replace(colleague_name, "")
    .replace(project_hint, "")
    .replace(/今天|昨天|前天/g, "")
    .replace(/\d+(?:\.\d+)?\s*(?:小时|h|hr)/gi, "")
    .replace(/[，,。！？]/g, " ")
    .replace(/(?:在|参与了?|负责了?|投入了?|花了?|用了?|完成了?)\s*/g, "")
    .replace(/\s+/g, " ")
    .trim() || text.slice(0, 50);

  return { colleague_name, project_hint, hours: hours ?? 0, log_date, description, confidence, raw_input: text };
}
