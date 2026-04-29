import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Send, Loader2, ClipboardEdit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import { useGet } from "@/hooks/useApi";
import type { Project } from "@/types";

export function FormInput({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: projects } = useGet<Project[]>("/projects");

  const today = new Date().toISOString().split("T")[0];

  const [colleague, setColleague] = useState("");
  const [projectId, setProjectId] = useState("");
  const [hours, setHours] = useState("");
  const [date, setDate] = useState(today);
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!colleague.trim() || !projectId || !hours || !date) {
      toast({ title: t("form.validationError"), description: t("form.validationDesc"), variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/worklogs", {
        colleague_name: colleague.trim(),
        project_id: parseInt(projectId),
        hours: parseFloat(hours),
        log_date: date,
        description: desc,
        raw_input: "",
      });
      toast({ title: t("form.submitSuccess"), description: t("form.submitSuccessDesc", { colleague: colleague.trim(), hours }) });
      setColleague("");
      setProjectId("");
      setHours("");
      setDate(today);
      setDesc("");
      onSuccess();
    } catch (e) {
      toast({ title: t("form.submitError"), description: e instanceof Error ? e.message : t("common.unknown"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <ClipboardEdit className="h-3.5 w-3.5 text-muted-foreground" />
            {t("form.colleague")}
          </Label>
          <Input
            value={colleague}
            onChange={e => setColleague(e.target.value)}
            placeholder={t("form.colleaguePlaceholder")}
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">{t("form.hours")}</Label>
          <Input
            type="number"
            value={hours}
            onChange={e => setHours(e.target.value)}
            min="0.5"
            step="0.5"
            placeholder="0.5"
            className="h-9"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">{t("form.project")}</Label>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder={t("form.selectProject")} />
          </SelectTrigger>
          <SelectContent>
            {projects?.map(p => (
              <SelectItem key={p.id} value={String(p.id)}>
                <span className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${p.type === "business" ? "bg-blue-500" : "bg-purple-500"}`} />
                  {p.name}
                  <span className="text-xs text-muted-foreground">
                    ({p.type === "business" ? t("common.businessProject") : t("common.innovationProject")})
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">{t("form.date")}</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">{t("form.description")}</Label>
          <Input
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder={t("form.descriptionPlaceholder")}
            className="h-9"
          />
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {submitting ? t("common.submitting") : t("common.submit")}
      </Button>
    </div>
  );
}
