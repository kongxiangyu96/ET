import { useState } from "react";
import { Sparkles, Send, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import type { ParsedWorkLog, Project } from "@/types";

const EXAMPLES = [
  "张伟今天在电商平台重构上花了3小时做联调测试",
  "李娜昨天参与AI智能助手项目，投入了2.5小时做Prompt优化",
  "王芳 推荐引擎优化 4小时 特征工程开发",
  "陈强今天在供应链管理系统做接口开发，用了5h",
];

interface ParseResult {
  parsed: ParsedWorkLog;
  matched_project: Project | null;
  projects: Project[];
}

export function NLPInput({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [colleague, setColleague] = useState("");
  const [projectId, setProjectId] = useState("");
  const [hours, setHours] = useState("");
  const [date, setDate] = useState("");
  const [desc, setDesc] = useState("");

  const handleParse = async () => {
    if (!text.trim()) return;
    setParsing(true);
    setResult(null);
    try {
      const r = await api.post<ParseResult>("/worklogs/parse", { text });
      setResult(r);
      setColleague(r.parsed.colleague_name);
      setProjectId(r.matched_project ? String(r.matched_project.id) : "");
      setHours(String(r.parsed.hours || ""));
      setDate(r.parsed.log_date);
      setDesc(r.parsed.description);
    } catch (e) {
      toast({ title: "解析失败", description: e instanceof Error ? e.message : "未知错误", variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async () => {
    if (!colleague || !projectId || !hours || !date) {
      toast({ title: "请填写完整信息", description: "姓名、项目、工时、日期均为必填", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/worklogs", { colleague_name: colleague, project_id: parseInt(projectId), hours: parseFloat(hours), log_date: date, description: desc, raw_input: text });
      toast({ title: "工时已记录", description: `${colleague} ${hours}h 已成功提交` });
      setText(""); setResult(null);
      onSuccess();
    } catch (e) {
      toast({ title: "提交失败", description: e instanceof Error ? e.message : "未知错误", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const confVariant = (c: number) => c >= 80 ? "success" : c >= 50 ? "warning" : "destructive";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-violet-500" />自然语言输入
        </Label>
        <Textarea
          placeholder="例如：张伟今天在电商平台重构上花了3小时做联调..."
          value={text} onChange={e => setText(e.target.value)}
          className="min-h-[80px] resize-none"
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleParse(); }}
        />
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex, i) => (
            <button key={i} onClick={() => setText(ex)} className="text-xs text-muted-foreground hover:text-foreground border border-dashed rounded px-2 py-0.5 transition-colors hover:border-primary">
              {ex.slice(0, 16)}…
            </button>
          ))}
        </div>
        <Button onClick={handleParse} disabled={!text.trim() || parsing} className="w-full gap-2" variant="secondary">
          {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {parsing ? "解析中..." : "智能解析 (⌘Enter)"}
        </Button>
      </div>

      {result && (
        <Card className="border-violet-200 bg-violet-50/50">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-violet-500" />解析结果</span>
              <Badge variant={confVariant(result.parsed.confidence) as "success" | "warning" | "destructive"}>置信度 {result.parsed.confidence}%</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">同事姓名</Label>
                <Input value={colleague} onChange={e => setColleague(e.target.value)} placeholder="请输入姓名" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">工时（小时）</Label>
                <Input type="number" value={hours} onChange={e => setHours(e.target.value)} min="0.5" step="0.5" className="h-8 text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                项目{result.matched_project && <span className="ml-1 text-violet-600">(已匹配: {result.matched_project.name})</span>}
              </Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="选择项目" /></SelectTrigger>
                <SelectContent>
                  {result.projects.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      <span className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${p.type === "business" ? "bg-blue-500" : "bg-purple-500"}`} />
                        {p.name} <span className="text-xs text-muted-foreground">({p.type === "business" ? "业务" : "创新"})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">日期</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">备注</Label>
                <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="工作内容" className="h-8 text-sm" />
              </div>
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {submitting ? "提交中..." : "确认提交"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
