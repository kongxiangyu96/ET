import { useState } from "react";
import { LayoutDashboard, FolderKanban, ClipboardList, FileBarChart2, Plus, ChevronRight } from "lucide-react";
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
import { useGet } from "@/hooks/useApi";
import type { Project, WorkLog, Stats } from "@/types";

type NavItem = "dashboard" | "projects" | "worklogs" | "summary";

const NAV: Array<{ key: NavItem; label: string; sub: string; icon: typeof LayoutDashboard }> = [
  { key: "dashboard", label: "总览", sub: "工时投入总体概览", icon: LayoutDashboard },
  { key: "projects", label: "项目管理", sub: "管理业务项目与创新项目", icon: FolderKanban },
  { key: "worklogs", label: "工时记录", sub: "查看和管理工时记录", icon: ClipboardList },
  { key: "summary", label: "汇总报告", sub: "生成 Markdown 汇总报告", icon: FileBarChart2 },
];

export default function App() {
  const [nav, setNav] = useState<NavItem>("dashboard");
  const [showInput, setShowInput] = useState(false);

  const { data: projects, loading: pLoading, refetch: rProjects } = useGet<Project[]>("/projects");
  const { data: worklogs, loading: wLoading, refetch: rWorklogs } = useGet<WorkLog[]>("/worklogs");
  const { data: stats, loading: sLoading, refetch: rStats } = useGet<Stats>("/worklogs/stats");

  const onLogSuccess = () => { rWorklogs(); rStats(); setShowInput(false); };
  const onProjectRefresh = () => { rProjects(); rStats(); };

  const current = NAV.find(n => n.key === nav)!;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-56 border-r bg-card flex flex-col fixed h-full">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold">工时追踪</h1>
              <p className="text-[10px] text-muted-foreground">Effort Tracker</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(item => (
            <button key={item.key} onClick={() => setNav(item.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${nav === item.key ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}>
              <item.icon className="h-4 w-4" />
              {item.label}
              {nav === item.key && <ChevronRight className="h-3 w-3 ml-auto" />}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t">
          <Button size="sm" className="w-full gap-1.5 text-xs" onClick={() => { setShowInput(true); setNav("dashboard"); }}>
            <Plus className="h-3.5 w-3.5" />快速记录工时
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-56 flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">{current.label}</h2>
            <p className="text-sm text-muted-foreground">{current.sub}</p>
          </div>
          {nav !== "summary" && projects && (
            <div className="flex items-center gap-1.5">
              <Badge variant="info" className="text-xs">{projects.filter(p => p.type === "business").length} 业务</Badge>
              <Badge variant="purple" className="text-xs">{projects.filter(p => p.type === "innovation").length} 创新</Badge>
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
                    快速记录工时
                    <Button variant="ghost" size="sm" onClick={() => setShowInput(false)} className="h-7 text-xs">收起</Button>
                  </CardTitle>
                </CardHeader>
                <CardContent><NLPInput onSuccess={onLogSuccess} /></CardContent>
              </Card>
            )}

            <Charts stats={stats} loading={sLoading} />

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">最近工时记录</CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setNav("worklogs")}>
                    查看全部 <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {wLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}</div>
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
              {["business", "innovation"].map(type => {
                const list = projects?.filter(p => p.type === type) ?? [];
                return (
                  <Card key={type}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${type === "business" ? "bg-blue-500" : "bg-purple-500"}`} />
                        {type === "business" ? "业务项目" : "创新项目"}
                        <Badge variant={type === "business" ? "info" : "purple"} className="text-xs ml-auto">{list.length} 个</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {pLoading ? (
                        <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}</div>
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
                                  <div className={`h-1 rounded-full ${type === "business" ? "bg-blue-500" : "bg-purple-500"}`} style={{ width: `${p.completion}%` }} />
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
              <CardHeader className="pb-3"><CardTitle className="text-sm">记录工时</CardTitle></CardHeader>
              <CardContent><NLPInput onSuccess={() => { rWorklogs(); rStats(); }} /></CardContent>
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
