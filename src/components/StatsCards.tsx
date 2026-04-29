import { useTranslation } from "react-i18next";
import { Clock, Briefcase, Lightbulb, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Stats } from "@/types";
import { formatHours } from "@/lib/utils";

interface StatsCardsProps {
  stats: Stats | null;
  loading: boolean;
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
  const { t } = useTranslation();
  const biz = stats?.byType.find(t => t.type === "business");
  const inn = stats?.byType.find(t => t.type === "innovation");
  const total = (biz?.total_hours ?? 0) + (inn?.total_hours ?? 0);
  const colleagues = stats ? new Set(stats.byColleague.map(c => c.colleague_name)).size : 0;

  const cards = [
    {
      title: t("stats.totalHours"),
      value: formatHours(total),
      icon: Clock,
      color: "text-slate-600",
      bg: "bg-slate-50",
      border: "border-slate-200",
    },
    {
      title: t("stats.businessHours"),
      value: formatHours(biz?.total_hours ?? 0),
      sub: total > 0 ? t("stats.ratio", { value: (((biz?.total_hours ?? 0) / total) * 100).toFixed(0) }) : "",
      icon: Briefcase,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
    },
    {
      title: t("stats.innovationHours"),
      value: formatHours(inn?.total_hours ?? 0),
      sub: total > 0 ? t("stats.ratio", { value: (((inn?.total_hours ?? 0) / total) * 100).toFixed(0) }) : "",
      icon: Lightbulb,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-200",
    },
    {
      title: t("stats.participants"),
      value: `${colleagues}${t("common.person")}`,
      sub: t("stats.projects", { count: stats?.byProject.length ?? 0 }),
      icon: Users,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(c => (
        <Card key={c.title} className={`border ${c.border}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{c.title}</p>
                {loading ? (
                  <div className="h-7 w-20 bg-muted animate-pulse rounded" />
                ) : (
                  <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                )}
                {c.sub && <p className="text-xs text-muted-foreground">{c.sub}</p>}
              </div>
              <div className={`p-2 rounded-lg ${c.bg}`}>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
