import { useState } from "react";
import { useTranslation } from "react-i18next";
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

interface Form { name: string; type: ProjectType; description: string; deadline: string; completion: number; status: ProjectStatus; }
const defaultForm: Form = { name: "", type: "business", description: "", deadline: "", completion: 0, status: "active" };

export function ProjectList({ projects, loading, onRefresh }: { projects: Project[] | null; loading: boolean; onRefresh: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [form, setForm] = useState<Form>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | ProjectType>("all");

  const STATUS_LABELS: Record<ProjectStatus, string> = {
    active: t("project.statusActive"),
    completed: t("project.statusCompleted"),
    paused: t("project.statusPaused"),
  };
  const STATUS_VARIANTS: Record<ProjectStatus, "success" | "info" | "warning"> = {
    active: "info",
    completed: "success",
    paused: "warning",
  };

  const filtered = projects?.filter(p => filter === "all" || p.type === filter);

  const openCreate = () => { setEditTarget(null); setForm(defaultForm); setOpen(true); };
  const openEdit = (p: Project) => {
    setEditTarget(p);
    setForm({ name: p.name, type: p.type, description: p.description, deadline: p.deadline ?? "", completion: p.completion, status: p.status });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: t("project.nameRequired"), variant: "destructive" }); return; }
    setSaving(true);
    try {
      if (editTarget) {
        await api.patch(`/projects/${editTarget.id}`, form);
        toast({ title: t("project.updateSuccess") });
      } else {
        await api.post("/projects", form);
        toast({ title: t("project.createSuccess") });
      }
      setOpen(false);
      onRefresh();
    } catch (e) {
      toast({ title: t("project.operationError"), description: e instanceof Error ? e.message : t("common.unknown"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Project) => {
    if (!confirm(t("project.deleteConfirm", { name: p.name }))) return;
    try {
      await api.delete(`/projects/${p.id}`);
      toast({ title: t("project.deleteSuccess") });
      onRefresh();
    } catch (e) {
      toast({ title: t("project.deleteError"), description: e instanceof Error ? e.message : t("common.unknown"), variant: "destructive" });
    }
  };

  const deadlineBadge = (dl: string | null) => {
    if (!dl) return null;
    const days = getDaysUntilDeadline(dl);
    if (days === null) return null;
    if (days < 0) return <Badge variant="destructive">{t("project.overdue", { days: Math.abs(days) })}</Badge>;
    if (days <= 7) return <Badge variant="warning">{t("project.daysLeft", { days })}</Badge>;
    return <Badge variant="outline">{formatDate(dl)}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["all", "business", "innovation"] as const).map(f => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
              {f === "all" ? t("project.filterAll") : f === "business" ? t("project.filterBusiness") : t("project.filterInnovation")}
            </Button>
          ))}
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" />{t("project.addNew")}
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="p-4"><div className="h-24 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
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
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(p)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={p.type === "business" ? "info" : "purple"}>
                    {p.type === "business" ? t("project.filterBusiness") : t("project.filterInnovation")}
                  </Badge>
                  <Badge variant={STATUS_VARIANTS[p.status]}>{STATUS_LABELS[p.status]}</Badge>
                  {deadlineBadge(p.deadline)}
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />{t("project.progressLabel")}
                    </span>
                    <span className="font-medium text-foreground">{p.completion}%</span>
                  </div>
                  <Progress
                    value={p.completion}
                    className={`h-1.5 ${p.type === "business" ? "[&>div]:bg-blue-500" : "[&>div]:bg-purple-500"}`}
                  />
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />{t("project.totalHours", { value: formatHours(p.total_hours ?? 0) })}
                  </span>
                  {(p.member_count ?? 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />{t("project.members", { count: p.member_count })}
                    </span>
                  )}
                  {p.deadline && (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />{formatDate(p.deadline)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? t("project.editTitle") : t("project.createTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("project.name")}</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t("project.namePlaceholder")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("project.type")}</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as ProjectType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">{t("project.filterBusiness")}</SelectItem>
                    <SelectItem value="innovation">{t("project.filterInnovation")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("project.status")}</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as ProjectStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t("project.statusActive")}</SelectItem>
                    <SelectItem value="completed">{t("project.statusCompleted")}</SelectItem>
                    <SelectItem value="paused">{t("project.statusPaused")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("project.description")}</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="min-h-[60px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("project.deadline")}</Label>
                <Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("project.completion", { value: form.completion })}</Label>
                <Input
                  type="range" min={0} max={100} step={5}
                  value={form.completion}
                  onChange={e => setForm({ ...form, completion: parseInt(e.target.value) })}
                  className="h-10"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
