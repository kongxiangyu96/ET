import { useState } from "react";
import { Plus, CalendarDays, Clock, Users, TrendingUp, Edit2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatHours, getDaysUntilDeadline } from "@/lib/utils";
import type { Project, ProjectType, ProjectStatus } from "@/types";

const STATUS_LABELS: Record<ProjectStatus, string> = { active: "进行中", completed: "已完成", paused: "已暂停" };
const STATUS_VARIANTS: Record<ProjectStatus, "success" | "info" | "warning"> = { active: "info", completed: "success", paused: "warning" };

interface Form { name: string; type: ProjectType; description: string; deadline: string; completion: number; status: ProjectStatus; }
const defaultForm: Form = { name: "", type: "business", description: "", deadline: "", completion: 0, status: "active" };

export function ProjectList({ projects, loading, onRefresh }: { projects: Project[] | null; loading: boolean; onRefresh: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [form, setForm] = useState<Form>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | ProjectType>("all");

  const filtered = projects?.filter(p => filter === "all" || p.type === filter);

  const openCreate = () => { setEditTarget(null); setForm(defaultForm); setOpen(true); };
  const openEdit = (p: Project) => {
    setEditTarget(p);
    setForm({ name: p.name, type: p.type, description: p.description, deadline: p.deadline ?? "", completion: p.completion, status: p.status });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "请输入项目名称", variant: "destructive" }); return; }
    setSaving(true);
    try {
      if (editTarget) { await api.patch(`/projects/${editTarget.id}`, form); toast({ title: "项目已更新" }); }
      else { await api.post("/projects", form); toast({ title: "项目已创建" }); }
      setOpen(false); onRefresh();
    } catch (e) { toast({ title: "操作失败", description: e instanceof Error ? e.message : "未知错误", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (p: Project) => {
    if (!confirm(`确认删除项目「${p.name}」？关联工时记录也会被删除。`)) return;
    try { await api.delete(`/projects/${p.id}`); toast({ title: "项目已删除" }); onRefresh(); }
    catch (e) { toast({ title: "删除失败", description: e instanceof Error ? e.message : "未知错误", variant: "destructive" }); }
  };

  const deadlineBadge = (dl: string | null) => {
    if (!dl) return null;
    const days = getDaysUntilDeadline(dl);
    if (days === null) return null;
    if (days < 0) return <Badge variant="destructive">已逾期 {Math.abs(days)}天</Badge>;
    if (days <= 7) return <Badge variant="warning">剩余 {days}天</Badge>;
    return <Badge variant="outline">{formatDate(dl)}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["all", "business", "innovation"] as const).map(f => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
              {f === "all" ? "全部" : f === "business" ? "业务项目" : "创新项目"}
            </Button>
          ))}
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" />新增项目</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <Card key={i}><CardContent className="p-4"><div className="h-24 bg-muted animate-pulse rounded" /></CardContent></Card>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered?.map(p => (
            <Card key={p.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${p.type === "business" ? "bg-blue-500" : "bg-purple-500"}`} />
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{p.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={p.type === "business" ? "info" : "purple"}>{p.type === "business" ? "业务项目" : "创新项目"}</Badge>
                  <Badge variant={STATUS_VARIANTS[p.status]}>{STATUS_LABELS[p.status]}</Badge>
                  {deadlineBadge(p.deadline)}
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />完成度</span>
                    <span className="font-medium text-foreground">{p.completion}%</span>
                  </div>
                  <Progress value={p.completion} className={`h-1.5 ${p.type === "business" ? "[&>div]:bg-blue-500" : "[&>div]:bg-purple-500"}`} />
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatHours(p.total_hours ?? 0)} 工时</span>
                  {(p.member_count ?? 0) > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{p.member_count} 人参与</span>}
                  {p.deadline && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{formatDate(p.deadline)}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editTarget ? "编辑项目" : "新增项目"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>项目名称 *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="请输入项目名称" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>项目类型 *</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as ProjectType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="business">业务项目</SelectItem><SelectItem value="innovation">创新项目</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>状态</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as ProjectStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">进行中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="paused">已暂停</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>项目描述</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="min-h-[60px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>截止日期</Label>
                <Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>完成度 ({form.completion}%)</Label>
                <Input type="range" min={0} max={100} step={5} value={form.completion} onChange={e => setForm({ ...form, completion: parseInt(e.target.value) })} className="h-10" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "保存中..." : "保存"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
