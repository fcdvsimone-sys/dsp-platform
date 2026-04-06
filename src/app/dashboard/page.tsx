"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, AlertTriangle, ClipboardList, TrendingUp, Clock, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

type DashboardData = {
  kpis: { activeDrivers: number; atRiskCount: number; unsignedCoachings: number; avgScore: number | null };
  scoreTrend: { week: string; avgScore: number | null }[];
  tierBreakdown: { week: string; Platinum: number; Gold: number; Silver: number; Bronze: number }[];
  atRiskDrivers: {
    driverId: string; name: string; employeeId: string;
    overallStanding: string | null; overallScore: number | null;
    dcr: number | null; pod: number | null;
    speedingRate: number | null; seatbeltRate: number | null;
  }[];
  unsignedList: {
    id: string; driverId: string; name: string; employeeId: string;
    type: string; category: string; conductedAt: string;
  }[];
  coachingByType: Record<string, number>;
  fleetAvgs: {
    dcr: number | null; pod: number | null;
    speedingRate: number | null; seatbeltRate: number | null;
    distractionRate: number | null; signalViolationRate: number | null;
  };
  latestWeek: string | null;
};

const tierColors: Record<string, string> = {
  Platinum: "#7c3aed",
  Gold:     "#f59e0b",
  Silver:   "#9ca3af",
  Bronze:   "#f97316",
};

const standingConfig: Record<string, { bg: string; text: string }> = {
  Platinum:         { bg: "bg-violet-100", text: "text-violet-700" },
  Gold:             { bg: "bg-yellow-100", text: "text-yellow-700" },
  Silver:           { bg: "bg-gray-100",   text: "text-gray-600" },
  Bronze:           { bg: "bg-orange-100", text: "text-orange-700" },
  "Below Standard": { bg: "bg-red-100",    text: "text-red-700" },
};

const typeLabels: Record<string, string> = {
  verbal: "Verbal", written: "Written", final: "Final", termination: "Termination",
};

const categoryLabels: Record<string, string> = {
  scorecard: "Scorecard", attendance: "Attendance", conduct: "Conduct",
  safety: "Safety", other: "Other",
};

// Normalize metric for radar: higher = better, 0–100
function normalize(key: string, val: number | null): number {
  if (val === null) return 0;
  switch (key) {
    case "dcr":                return Math.min(100, val);
    case "pod":                return Math.min(100, val);
    case "speedingRate":       return Math.max(0, 100 - val * 200);
    case "seatbeltRate":       return Math.max(0, 100 - val * 200);
    case "distractionRate":    return Math.max(0, 100 - val * 200);
    case "signalViolationRate":return Math.max(0, 100 - val * 200);
    default: return 0;
  }
}

function KpiCard({ label, value, icon: Icon, bg, text, sub, subWarn }: {
  label: string; value: string; icon: React.ElementType;
  bg: string; text: string; sub?: string; subWarn?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className={`text-xs mt-1 ${subWarn ? "text-red-500 font-medium" : "text-gray-400"}`}>{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ${bg}`}><Icon size={20} className={text} /></div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading dashboard...</div>
      </div>
    );
  }

  const { kpis, scoreTrend, tierBreakdown, atRiskDrivers, unsignedList, coachingByType, fleetAvgs, latestWeek } = data;
  const hasData = scoreTrend.some((d) => d.avgScore !== null);

  const radarData = [
    { metric: "DCR",         score: normalize("dcr", fleetAvgs.dcr) },
    { metric: "POD",         score: normalize("pod", fleetAvgs.pod) },
    { metric: "Speeding",    score: normalize("speedingRate", fleetAvgs.speedingRate) },
    { metric: "Seatbelt",    score: normalize("seatbeltRate", fleetAvgs.seatbeltRate) },
    { metric: "Distraction", score: normalize("distractionRate", fleetAvgs.distractionRate) },
    { metric: "Signal Viol.",score: normalize("signalViolationRate", fleetAvgs.signalViolationRate) },
  ];

  const coachingBarData = ["verbal", "written", "final", "termination"].map((t) => ({
    type: typeLabels[t],
    count: coachingByType[t] ?? 0,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            {latestWeek
              ? `Latest data: week of ${format(new Date(latestWeek), "MMMM d, yyyy")}`
              : "No scorecard data imported yet"}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <KpiCard
            label="Active Drivers" value={kpis.activeDrivers.toString()}
            icon={Users} bg="bg-blue-50" text="text-blue-600"
          />
          <KpiCard
            label="At-Risk This Week" value={kpis.atRiskCount.toString()}
            icon={AlertTriangle}
            bg={kpis.atRiskCount > 0 ? "bg-red-50" : "bg-gray-50"}
            text={kpis.atRiskCount > 0 ? "text-red-600" : "text-gray-400"}
            sub={kpis.atRiskCount > 0 ? "Silver, Bronze, or Below Standard" : "All Platinum or Gold"}
            subWarn={kpis.atRiskCount > 0}
          />
          <KpiCard
            label="Unsigned Coachings" value={kpis.unsignedCoachings.toString()}
            icon={ClipboardList}
            bg={kpis.unsignedCoachings > 0 ? "bg-yellow-50" : "bg-gray-50"}
            text={kpis.unsignedCoachings > 0 ? "text-yellow-600" : "text-gray-400"}
            sub={kpis.unsignedCoachings > 0 ? "Awaiting driver signature" : undefined}
            subWarn={kpis.unsignedCoachings > 0}
          />
          <KpiCard
            label="Fleet Avg Score" value={kpis.avgScore ? kpis.avgScore.toString() : "—"}
            icon={TrendingUp}
            bg={kpis.avgScore && kpis.avgScore < 85 ? "bg-red-50" : kpis.avgScore && kpis.avgScore < 90 ? "bg-yellow-50" : "bg-green-50"}
            text={kpis.avgScore && kpis.avgScore < 85 ? "text-red-600" : kpis.avgScore && kpis.avgScore < 90 ? "text-yellow-600" : "text-green-600"}
            sub={kpis.avgScore ? (kpis.avgScore >= 90 ? "Good standing" : kpis.avgScore >= 85 ? "Needs attention" : "Below threshold") : undefined}
          />
        </div>

        {!hasData ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No scorecard data yet</h3>
            <p className="text-gray-400 text-sm mb-6">Import your Cortex scorecard CSV to populate charts and metrics</p>
            <button
              onClick={() => router.push("/dashboard/scorecard")}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Go to Scorecard Import
            </button>
          </div>
        ) : (
          <>
            {/* Row 1: Trend + Tier breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="font-semibold text-gray-800 mb-1">Fleet Avg Score Trend</p>
                <p className="text-xs text-gray-400 mb-4">Weekly composite score average</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={scoreTrend} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[75, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={35} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} formatter={(v: number) => [v, "Avg Score"]} />
                    <Line type="monotone" dataKey="avgScore" stroke="#7c3aed" strokeWidth={2.5}
                      dot={{ r: 4, fill: "#7c3aed", strokeWidth: 0 }} activeDot={{ r: 6 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="font-semibold text-gray-800 mb-1">Standing Distribution by Week</p>
                <p className="text-xs text-gray-400 mb-4">Driver count per tier</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={tierBreakdown} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                    <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Platinum" stackId="a" fill={tierColors.Platinum} />
                    <Bar dataKey="Gold"     stackId="a" fill={tierColors.Gold} />
                    <Bar dataKey="Silver"   stackId="a" fill={tierColors.Silver} />
                    <Bar dataKey="Bronze"   stackId="a" fill={tierColors.Bronze} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Row 2: Radar + Coaching breakdown + Unsigned */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Fleet compliance radar */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="font-semibold text-gray-800 mb-1">Fleet Compliance</p>
                <p className="text-xs text-gray-400 mb-1">Latest week (normalized, higher = better)</p>
                <ResponsiveContainer width="100%" height={210}>
                  <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "#6b7280" }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar dataKey="score" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.2} strokeWidth={2} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} formatter={(v: number) => [`${Math.round(v)}`, "Score"]} />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-3 gap-2 mt-1 border-t border-gray-100 pt-3">
                  {[
                    { label: "DCR",      val: fleetAvgs.dcr,                suffix: "%" },
                    { label: "POD",      val: fleetAvgs.pod,                suffix: "%" },
                    { label: "Speeding", val: fleetAvgs.speedingRate,       suffix: "/trip" },
                    { label: "Seatbelt", val: fleetAvgs.seatbeltRate,       suffix: "/trip" },
                    { label: "Distract", val: fleetAvgs.distractionRate,    suffix: "/trip" },
                    { label: "Signal",   val: fleetAvgs.signalViolationRate, suffix: "/trip" },
                  ].map(({ label, val, suffix }) => (
                    <div key={label} className="text-center">
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="text-sm font-semibold text-gray-700">{val !== null ? `${val}${suffix}` : "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coaching by type */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="font-semibold text-gray-800 mb-1">Coachings by Type</p>
                <p className="text-xs text-gray-400 mb-4">All time</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={coachingBarData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="type" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} formatter={(v: number) => [v, "Coachings"]} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-4 border-t border-gray-100 pt-3">
                  {coachingBarData.map((e) => e.count > 0 && (
                    <div key={e.type} className="flex justify-between text-xs">
                      <span className="text-gray-500">{e.type}</span>
                      <span className="font-semibold text-gray-700">{e.count}</span>
                    </div>
                  ))}
                  {coachingBarData.every((e) => e.count === 0) && (
                    <p className="text-xs text-gray-400 text-center py-2">No coachings recorded</p>
                  )}
                </div>
              </div>

              {/* Unsigned coachings */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="font-semibold text-gray-800">Unsigned Coachings</p>
                    <p className="text-xs text-gray-400 mt-0.5">Awaiting driver signature</p>
                  </div>
                  {unsignedList.length > 0 && (
                    <button onClick={() => router.push("/dashboard/coaching")} className="text-xs text-blue-600 hover:underline">View all</button>
                  )}
                </div>
                {unsignedList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-2">
                      <ClipboardList size={18} className="text-green-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">All signed</p>
                    <p className="text-xs text-gray-400 mt-0.5">No pending signatures</p>
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto max-h-52">
                    {unsignedList.map((c) => (
                      <div key={c.id} onClick={() => router.push(`/dashboard/drivers/${c.driverId}`)}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer group">
                        <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                          <Clock size={14} className="text-yellow-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                          <p className="text-xs text-gray-400">{typeLabels[c.type] ?? c.type} · {categoryLabels[c.category] ?? c.category}</p>
                        </div>
                        <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* At-risk drivers */}
            {atRiskDrivers.length > 0 && (
              <div className="bg-white rounded-xl border border-red-200 p-5">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="font-semibold text-gray-800 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-red-500" /> At-Risk Drivers
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {atRiskDrivers.length} driver{atRiskDrivers.length !== 1 ? "s" : ""} with Silver, Bronze, or Below Standard standing this week
                    </p>
                  </div>
                  <button onClick={() => router.push("/dashboard/scorecard")} className="text-xs text-blue-600 hover:underline">
                    View scorecards
                  </button>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["Driver", "Standing", "Score", "DCR", "POD", "Speeding", "Seatbelt", ""].map((h) => (
                        <th key={h} className={`pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider ${h === "Driver" ? "text-left" : h === "" ? "" : "text-right"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {atRiskDrivers.map((d) => (
                      <tr key={d.driverId} onClick={() => router.push(`/dashboard/drivers/${d.driverId}`)}
                        className="cursor-pointer hover:bg-gray-50 group">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-semibold text-xs shrink-0">
                              {d.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{d.name}</p>
                              <p className="text-xs text-gray-400">{d.employeeId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          {d.overallStanding && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${standingConfig[d.overallStanding]?.bg} ${standingConfig[d.overallStanding]?.text}`}>
                              {d.overallStanding}
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right text-sm font-semibold text-gray-700">{d.overallScore ?? "—"}</td>
                        <td className="py-3 text-right text-sm text-gray-600">{d.dcr !== null ? `${d.dcr}%` : "—"}</td>
                        <td className="py-3 text-right text-sm text-gray-600">{d.pod !== null ? `${d.pod}%` : "—"}</td>
                        <td className="py-3 text-right text-sm text-gray-600">{d.speedingRate ?? "—"}</td>
                        <td className="py-3 text-right text-sm text-gray-600">{d.seatbeltRate ?? "—"}</td>
                        <td className="py-3 text-right"><ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
