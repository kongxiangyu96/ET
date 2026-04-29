import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import type { WorkLog } from "@/types";

export function WorkLogTable({ logs, loading, onRefresh }: { logs: WorkLog[] | null; loading: boolean; onRefresh: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "business" | "innovation">("all");

  const filtered = logs?.filter(l => {
    const ok = !search || l.colleague_name.includes(search) || (l.project_name ?? "").includes(search) || l.description.includes(search);
    return ok && (filterType === "all" || l.project_type === filterType);
  });

  const handleDelete = async (log: WorkLog) => {
    if (!confirm(t("worklog.deleteConfirm", { colleague: log.colleague_name, project: log.project_name }))) return;
    try {
      await api.delete(`/worklogs/${log.id}`);
      toast({ title: t("worklog.deleteSuccess") });
      onRefresh();
    } catch (e) {
      toast({ title: t("worklog.deleteError"), description: e instanceof Error ? e.message : t("common.unknown"), variant: "destructive" });
    }
  };

  const headers = [
    t("worklog.date"),
    t("worklog.colleague"),
    t("worklog.project"),
    t("worklog.hours"),
    t("worklog.description"),
    t("worklog.action"),
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base">{t("worklog.title")}</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t("common.search")}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 pl-8 w-48 text-sm"
              />
            </div>
            <div className="flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              {(["all", "business", "innovation"] as const).map(f => (
                <Button key={f} variant={filterType === f ? "secondary" : "ghost"} size="sm" className="h-8 text-xs px-2" onClick={() => setFilterType(f)}>
                  {f === "all" ? t("common.all") : f === "business" ? t("common.business") : t("common.innovation")}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {loading ? (
          <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {headers.map((h, i) => (
                    <th
                      key={h}
                      className={`text-left px-3 py-2.5 font-medium text-muted-foreground text-xs ${i === 4 ? "hidden md:table-cell" : ""} ${i === 5 ? "text-right" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!filtered?.length ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground text-sm">
                      {t("common.noRecords")}
                    </td>
                  </tr>
                ) : (
                  filtered.map(log => (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{formatDate(log.log_date)}</td>
                      <td className="px-3 py-2.5 font-medium">{log.colleague_name}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${log.project_type === "business" ? "bg-blue-500" : "bg-purple-500"}`} />
                          <span className="truncate max-w-[140px]">{log.project_name}</span>
                          <Badge variant={log.project_type === "business" ? "info" : "purple"} className="text-[10px] px-1.5 py-0 hidden sm:inline-flex">
                            {log.project_type === "business" ? t("common.business") : t("common.innovation")}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-semibold text-primary">{log.hours}h</span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[200px] truncate hidden md:table-cell">
                        {log.description}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(log)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {(filtered?.length ?? 0) > 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/20 border-t">
                {t("worklog.totalRecords", { count: filtered?.length, hours: filtered?.reduce((s, l) => s + l.hours, 0).toFixed(1) })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
