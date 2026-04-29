import { useState } from "react";
import { FileText, Download, RefreshCw, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import type { SummaryData } from "@/types";
import { formatHours } from "@/lib/utils";

export function SummaryView() {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SummaryData | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (startDate) p.set("start_date", startDate);
      if (endDate) p.set("end_date", endDate);
      setSummary(await api.get<SummaryData>(`/summary?${p}`));
    } catch (e) {
      toast({ title: "生成失败", description: e instanceof Error ? e.message : "未知错误", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleDownload = () => {
    if (!summary) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([summary.markdown], { type: "text/markdown;charset=utf-8" }));
    a.download = `工时报告_${new Date().toLocaleDateString("zh-CN").replace(/\//g, "-")}.md`;
    a.click();
  };

  const { stats } = summary ?? {};

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" />生成统计报告</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1.5">
              <Label className="text-xs">开始日期</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 w-40" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">结束日期</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 w-40" />
            </div>
            <Button onClick={fetchSummary} disabled={loading} className="gap-2 h-9">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {loading ? "生成中..." : "生成报告"}
            </Button>
            {summary && <Button variant="outline" onClick={handleDownload} className="gap-2 h-9"><Download className="h-4 w-4" />下载 Markdown</Button>}
          </div>
        </CardContent>
      </Card>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "业务项目总工时", value: formatHours(stats.totalBusiness), sub: `${stats.businessProjects.length} 个项目`, color: "text-blue-600", border: "border-blue-200", bg: "bg-blue-50/30" },
            { label: "创新项目总工时", value: formatHours(stats.totalInnovation), sub: `${stats.innovationProjects.length} 个项目`, color: "text-purple-600", border: "border-purple-200", bg: "bg-purple-50/30" },
            { label: "合计工时", value: formatHours(stats.totalBusiness + stats.totalInnovation), sub: `${stats.colleagueStats.length} 人参与`, color: "text-slate-700", border: "border-slate-200", bg: "bg-slate-50/30" },
          ].map(c => (
            <Card key={c.label} className={`${c.border} ${c.bg}`}>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
                <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><FileText className="h-4 w-4" />Markdown 预览</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 rounded-lg p-4 max-h-[480px] overflow-y-auto">
                <MarkdownRenderer content={summary.markdown} />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">原始 Markdown</CardTitle></CardHeader>
            <CardContent>
              <pre className="bg-slate-950 text-slate-100 rounded-lg p-4 text-xs font-mono overflow-auto max-h-64 leading-relaxed">{summary.markdown}</pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none">
      {content.split("\n").map((line, i) => {
        if (line.startsWith("# ")) return <h1 key={i} className="text-xl font-bold mb-2">{line.slice(2)}</h1>;
        if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-semibold mt-4 mb-2 text-blue-700">{line.slice(3)}</h2>;
        if (line.startsWith("### ")) return <h3 key={i} className="text-base font-medium mt-3 mb-1">{line.slice(4)}</h3>;
        if (line.startsWith("---")) return <Separator key={i} className="my-3" />;
        if (line.startsWith("| ")) return <TableLine key={i} line={line} />;
        if (/^- \*\*(.+?)\*\*: (.+)/.test(line)) {
          const m = line.match(/- \*\*(.+?)\*\*: (.+)/);
          return m ? <div key={i} className="flex items-start gap-2 text-sm py-0.5"><span className="font-medium text-muted-foreground min-w-[80px]">{m[1]}:</span><span>{m[2]}</span></div> : null;
        }
        if (line.trim() === "") return <div key={i} className="h-1" />;
        if (line.startsWith("*") && line.endsWith("*")) return <p key={i} className="text-xs text-muted-foreground italic">{line.replace(/\*/g, "")}</p>;
        return <p key={i} className="text-sm">{line.replace(/\*\*/g, "")}</p>;
      })}
    </div>
  );
}

function TableLine({ line }: { line: string }) {
  if (/^\|[-| ]+\|$/.test(line)) return null;
  const cells = line.split("|").filter(c => c.trim() !== "");
  const isHeader = cells.some(c => ["项目类型","姓名","项目","工时","总工时"].includes(c.trim()));
  return (
    <div className={`flex text-xs gap-0 border-b last:border-0 ${isHeader ? "bg-muted/50 font-medium" : "hover:bg-muted/20"}`}>
      {cells.map((c, i) => <div key={i} className="px-2 py-1 flex-1 truncate">{c.trim().replace(/\*\*/g, "")}</div>)}
    </div>
  );
}
