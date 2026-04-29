import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, FolderKanban, ClipboardList, FileBarChart2,
  Plus, ChevronRight, ClipboardEdit, Sparkles, FileSpreadsheet, ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/toaster";
import { StatsCards } from "@/components/StatsCards";
import { Charts } from "@/components/Charts";
import { ProjectList } from "@/components/ProjectList";
import { WorkLogTable } from "@/components/WorkLogTable";
import { SummaryView } from "@/components/SummaryView";
import { NLPInput } from "@/components/NLPInput";
import { FormInput } from "@/components/FormInput";
import { ImportWorklogCard } from "@/components/ImportWorklogCard";
import { useGet } from "@/hooks/useApi";
import { setLanguage } from "@/i18n";
import type { Project, WorkLog, Stats } from "@/types";

type NavItem = "dashboard" | "projects" | "worklogs" | "summary";
type InputMode = "form" | "nlp" | "import" | null;

const LANGUAGES = [
  { code: "zh", label: "中" },
  { code: "en", label: "EN" },
  { code: "de", label: "DE" },
];

function InputModeAccordion({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useTranslation();
  const [openMode, setOpenMode] = useState<InputMode>("form");

  const toggle = (mode: InputMode) => setOpenMode(prev => prev === mode ? null : mode);

  const modes: Array<{ key: InputMode; icon: typeof ClipboardEdit; labelKey: string; color: string }> = [
    { key: "form", icon: ClipboardEdit, labelKey: "inputMode.form", color: "text-emerald-600" },
    { key: "nlp", icon: Sparkles, labelKey: "inputMode.nlp", color: "text-violet-600" },
    { key: "import", icon: FileSpreadsheet, labelKey: "inputMode.import", color: "text-blue-600" },
  ];

  return (
    <div className="space-y-2">
      {modes.map(({ key, icon: Icon, labelKey, color }) => (
        <div key={key} className="border rounded-lg overflow-hidden">
          <button
            onClick={() => toggle(key)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Icon className={`h-4 w-4 ${color}`} />
              {t(labelKey)}
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openMode === key ? "rotate-180" : ""}`} />
          </button>
          {openMode === key && (
            <div className="px-4 pb-4 pt-1 border-t bg-muted/10">
              {key === "form" && <FormInput onSuccess={onSuccess} />}
              {key === "nlp" && <NLPInput onSuccess={onSuccess} />}
              {key === "import" && <ImportWorklogCard onSuccess={onSuccess} />}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const { t, i18n } = useTranslation();
  const [nav, setNav] = useState<NavItem>("dashboard");
  const [showInput, setShowInput] = useState(false);

  const { data: projects, loading: pLoading, refetch: rProjects } = useGet<Project[]>("/projects");
  const { data: worklogs, loading: wLoading, refetch: rWorklogs } = useGet<WorkLog[]>("/worklogs");
  const { data: stats, loading: sLoading, refetch: rStats } = useGet<Stats>("/worklogs/stats");

  const onLogSuccess = () => { rWorklogs(); rStats(); setShowInput(false); };
  const onProjectRefresh = () => { rProjects(); rStats(); };

  const NAV: Array<{ key: NavItem; labelKey: string; subKey: string; icon: typeof LayoutDashboard }> = [
    { key: "dashboard", labelKey: "nav.dashboard", subKey: "nav.dashboardSub", icon: LayoutDashboard },
    { key: "projects", labelKey: "nav.projects", subKey: "nav.projectsSub", icon: FolderKanban },
    { key: "worklogs", labelKey: "nav.worklogs", subKey: "nav.worklogsSub", icon: ClipboardList },
    { key: "summary", labelKey: "nav.summary", subKey: "nav.summarySub", icon: FileBarChart2 },
  ];

  const current = NAV.find(n => n.key === nav)!;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-56 border-r bg-card flex flex-col fixed h-full">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold">{t("app.title")}</h1>
              <p className="text-[10px] text-muted-foreground">{t("app.subtitle")}</p>
            </div>
          </div>
          <div className="flex gap-1">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`flex-1 text-[11px] font-medium py-1 rounded transition-colors ${
                  i18n.language === lang.code
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(item => (
            <button
              key={item.key}
              onClick={() => setNav(item.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                nav === item.key
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {t(item.labelKey)}
              {nav === item.key && <ChevronRight className="h-3 w-3 ml-auto" />}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t">
          <Button size="sm" className="w-full gap-1.5 text-xs" onClick={() => { setShowInput(true); setNav("dashboard"); }}>
            <Plus className="h-3.5 w-3.5" />{t("nav.quickRecord")}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-56 flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">{t(current.labelKey)}</h2>
            <p className="text-sm text-muted-foreground">{t(current.subKey)}</p>
          </div>
          {nav !== "summary" && projects && (
            <div className="flex items-center gap-1.5">
              <Badge variant="info" className="text-xs">
                {projects.filter(p => p.type === "business").length} {t("common.businessProject")}
              </Badge>
              <Badge variant="purple" className="text-xs">
                {projects.filter(p => p.type === "innovation").length} {t("common.innovationProject")}
              </Badge>
            </div>
          )}
        </div>

        {/* Dashboard */}
        {nav === "dashboard" && (
          <div className="space-y-6">
            <StatsCards stats={stats} loading={sLoading} />

            {showInput && (
              <Card className="border-violet-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    {t("nav.quickRecord")}
                    <Button variant="ghost" size="sm" onClick={() => setShowInput(false)} className="h-7 text-xs">
                      {t("common.collapse")}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <InputModeAccordion onSuccess={onLogSuccess} />
                </CardContent>
              </Card>
            )}

            <Charts stats={stats} loading={sLoading} />

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{t("worklog.recentTitle")}</CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setNav("worklogs")}>
                    {t("common.viewAll")} <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {wLoading ? (
                  <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}</div>
                ) : (
                  <div className="space-y-1">
                    {worklogs?.slice(0, 5).map(log => (
                      <div key={log.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-muted/30 text-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${log.project_type === "business" ? "bg-blue-500" : "bg-purple-500"}`} />
                          <span className="font-medium">{log.colleague_name}</span>
                          <span className="text-muted-foreground truncate">{log.project_name}</span>
                          {log.description && <span className="text-muted-foreground text-xs hidden md:block truncate max-w-40">{log.description}</span>}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                          <span className="font-semibold text-primary">{log.hours}h</span>
                          <span className="text-xs text-muted-foreground">{log.log_date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(["business", "innovation"] as const).map(type => {
                const list = projects?.filter(p => p.type === type) ?? [];
                return (
                  <Card key={type}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${type === "business" ? "bg-blue-500" : "bg-purple-500"}`} />
                        {type === "business" ? t("common.businessProject") : t("common.innovationProject")}
                        <Badge variant={type === "business" ? "info" : "purple"} className="text-xs ml-auto">{list.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {pLoading ? (
                        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}</div>
                      ) : (
                        <div className="space-y-2">
                          {list.slice(0, 4).map(p => (
                            <div key={p.id} className="flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-xs font-medium truncate">{p.name}</span>
                                  <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{p.completion}%</span>
                                </div>
                                <div className="w-full bg-secondary rounded-full h-1">
                                  <div
                                    className={`h-1 rounded-full ${type === "business" ? "bg-blue-500" : "bg-purple-500"}`}
                                    style={{ width: `${p.completion}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {nav === "projects" && <ProjectList projects={projects} loading={pLoading} onRefresh={onProjectRefresh} />}

        {nav === "worklogs" && (
          <div className="space-y-4">
            <Card className="border-violet-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{t("worklog.recordTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <InputModeAccordion onSuccess={() => { rWorklogs(); rStats(); }} />
              </CardContent>
            </Card>
            <WorkLogTable logs={worklogs} loading={wLoading} onRefresh={() => { rWorklogs(); rStats(); }} />
          </div>
        )}

        {nav === "summary" && <SummaryView />}
      </main>

      <Toaster />
    </div>
  );
}
