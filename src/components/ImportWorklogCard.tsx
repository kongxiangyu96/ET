import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Upload, Download, Loader2, X, CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";

interface ImportRow {
  colleague_name: string;
  project_name: string;
  hours: number;
  log_date: string;
  description: string;
  _status?: "ok" | "fail";
}

const TEMPLATE_COLS = ["colleague_name", "project_name", "hours", "log_date(YYYY-MM-DD)", "description"];

function parseMdTable(content: string): ImportRow[] {
  const lines = content.split("\n").filter(l => l.trim().startsWith("|"));
  if (lines.length < 2) return [];

  const rows: ImportRow[] = [];
  let headerLine = -1;

  for (let i = 0; i < lines.length; i++) {
    if (/^\|[-| ]+\|$/.test(lines[i].trim())) {
      headerLine = i;
      break;
    }
  }

  const dataStart = headerLine >= 0 ? headerLine + 1 : 1;
  for (let i = dataStart; i < lines.length; i++) {
    const cells = lines[i].split("|").map(c => c.trim()).filter((_, idx) => idx > 0 && idx < lines[i].split("|").length - 1);
    if (cells.length >= 4) {
      rows.push({
        colleague_name: cells[0] ?? "",
        project_name: cells[1] ?? "",
        hours: parseFloat(cells[2]) || 0,
        log_date: cells[3] ?? "",
        description: cells[4] ?? "",
      });
    }
  }
  return rows;
}

function parseExcelFile(file: File): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
        const rows: ImportRow[] = json.map(r => ({
          colleague_name: String(r["colleague_name"] ?? r["同事姓名"] ?? ""),
          project_name: String(r["project_name"] ?? r["项目名称"] ?? ""),
          hours: parseFloat(String(r["hours"] ?? r["工时"] ?? "0")) || 0,
          log_date: String(r["log_date(YYYY-MM-DD)"] ?? r["log_date"] ?? r["日期"] ?? ""),
          description: String(r["description"] ?? r["描述"] ?? ""),
        }));
        resolve(rows.filter(r => r.colleague_name && r.project_name));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function ImportWorklogCard({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_COLS,
      ["张伟", "电商平台重构", 3, "2024-01-15", "联调测试"],
      ["李娜", "AI智能助手", 2.5, "2024-01-15", "Prompt优化"],
    ]);
    ws["!cols"] = TEMPLATE_COLS.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "工时记录");
    XLSX.writeFile(wb, "worklog_template.xlsx");
  };

  const processFile = async (file: File) => {
    try {
      let parsed: ImportRow[] = [];
      if (file.name.endsWith(".md") || file.name.endsWith(".markdown")) {
        const text = await file.text();
        parsed = parseMdTable(text);
      } else {
        parsed = await parseExcelFile(file);
      }
      if (parsed.length === 0) {
        toast({ title: t("import.parseError"), description: "No valid rows found", variant: "destructive" });
        return;
      }
      setRows(parsed.map(r => ({ ...r, _status: undefined })));
    } catch (e) {
      toast({ title: t("import.parseError"), description: e instanceof Error ? e.message : t("common.unknown"), variant: "destructive" });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (rows.length === 0) return;
    setSubmitting(true);
    try {
      const result = await api.post<{ inserted: number; failed: Array<{ row: ImportRow; reason: string }> }>(
        "/worklogs/batch",
        { rows }
      );

      const updatedRows = rows.map(r => {
        const didFail = result.failed.some(
          f => f.row.colleague_name === r.colleague_name && f.row.project_name === r.project_name && f.row.log_date === r.log_date
        );
        return { ...r, _status: didFail ? ("fail" as const) : ("ok" as const) };
      });
      setRows(updatedRows);

      if (result.inserted > 0) {
        toast({ title: t("import.submitSuccess"), description: t("import.submitSuccessDesc", { count: result.inserted }) });
        onSuccess();
      }
      if (result.failed.length > 0) {
        toast({ title: t("import.matchFailed"), description: result.failed.map(f => f.row.project_name).join(", "), variant: "destructive" });
      }
    } catch (e) {
      toast({ title: t("import.submitError"), description: e instanceof Error ? e.message : t("common.unknown"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-muted-foreground">{t("import.dropzoneHint")}</p>
        <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5 text-xs h-8">
          <Download className="h-3.5 w-3.5" />
          {t("import.downloadTemplate")}
        </Button>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/20"
        }`}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.md,.markdown" className="hidden" onChange={handleFileChange} />
        <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("import.dropzone")}</p>
        <p className="text-xs text-muted-foreground/60 mt-1">{t("import.dropzoneHint")}</p>
      </div>

      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{t("import.preview")}</p>
            <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground" onClick={() => setRows([])}>
              <X className="h-3.5 w-3.5 mr-1" />
              {t("common.cancel")}
            </Button>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40">
                    {[t("import.colleague"), t("import.project"), t("import.hours"), t("import.date"), t("import.description"), t("import.status"), ""].map((h, i) => (
                      <th key={i} className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx} className={`border-b last:border-0 transition-colors ${row._status === "fail" ? "bg-red-50/50" : row._status === "ok" ? "bg-green-50/50" : "hover:bg-muted/20"}`}>
                      <td className="px-3 py-2 font-medium">{row.colleague_name}</td>
                      <td className="px-3 py-2">{row.project_name}</td>
                      <td className="px-3 py-2">{row.hours}h</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.log_date}</td>
                      <td className="px-3 py-2 text-muted-foreground max-w-[120px] truncate">{row.description}</td>
                      <td className="px-3 py-2">
                        {row._status === "ok" && (
                          <Badge variant="success" className="text-[10px] px-1.5 gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" />{t("import.statusOk")}
                          </Badge>
                        )}
                        {row._status === "fail" && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 gap-1">
                            <AlertCircle className="h-2.5 w-2.5" />{t("import.statusFail")}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {!row._status && (
                          <button onClick={() => removeRow(idx)} className="text-muted-foreground hover:text-destructive transition-colors" title={t("import.removeRow")}>
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {rows.some(r => !r._status) && (
            <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {submitting ? t("import.submitting") : t("import.batchSubmit", { count: rows.filter(r => !r._status).length })}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
