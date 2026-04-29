import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Stats } from "@/types";

const BIZ = "#3b82f6";
const INN = "#a855f7";

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map(e => (
        <div key={e.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: e.color }} />
          <span className="text-muted-foreground">{e.name}:</span>
          <span className="font-medium">{e.value.toFixed(1)}h</span>
        </div>
      ))}
    </div>
  );
};

export function Charts({ stats, loading }: { stats: Stats | null; loading: boolean }) {
  if (loading) return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[1,2,3,4].map(i => <Card key={i}><CardContent className="p-4"><div className="h-48 bg-muted animate-pulse rounded" /></CardContent></Card>)}
    </div>
  );
  if (!stats) return null;

  const pieData = [
    { name: "业务项目", value: stats.byType.find(t => t.type === "business")?.total_hours ?? 0 },
    { name: "创新项目", value: stats.byType.find(t => t.type === "innovation")?.total_hours ?? 0 },
  ].filter(d => d.value > 0);

  const projectData = stats.byProject.slice(0, 8).map(p => ({
    name: p.name.length > 8 ? p.name.slice(0, 8) + "…" : p.name,
    工时: p.total_hours,
    type: p.type,
  }));

  const colleagueData = stats.byColleague.slice(0, 6).map(c => ({ name: c.colleague_name, 业务: c.business_hours, 创新: c.innovation_hours }));
  const dateData = stats.byDate.map(d => ({ date: d.log_date.slice(5), 业务: d.business_hours, 创新: d.innovation_hours }));

  const RADIAN = Math.PI / 180;
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: { cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number; name: string }) => {
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>{`${name} ${(percent * 100).toFixed(0)}%`}</text>;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">项目类型工时占比</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={renderLabel} outerRadius={90} dataKey="value">
                <Cell fill={BIZ} /><Cell fill={INN} />
              </Pie>
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)}h`, ""]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">各项目工时投入</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={projectData} layout="vertical" margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} unit="h" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={72} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="工时" radius={[0, 4, 4, 0]}>
                {projectData.map((e, i) => <Cell key={i} fill={e.type === "business" ? BIZ : INN} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">人员工时分布</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={colleagueData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="h" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="业务" stackId="a" fill={BIZ} />
              <Bar dataKey="创新" stackId="a" fill={INN} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">工时趋势</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dateData}>
              <defs>
                <linearGradient id="bizGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BIZ} stopOpacity={0.3} /><stop offset="95%" stopColor={BIZ} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="innGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={INN} stopOpacity={0.3} /><stop offset="95%" stopColor={INN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} unit="h" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="业务" stroke={BIZ} fill="url(#bizGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="创新" stroke={INN} fill="url(#innGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
