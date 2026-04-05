"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users, AlertTriangle, ClipboardList, TrendingUp,
  Clock, ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

type DashboardData = {
  kpis: {
    activeDrivers: number;
    atRiskCount: number;
    unsignedCoachings: number;
    avgFico: number | null;
  };
  ficoTrend: { week: string; avgFico: number | null }[];
  tierBreakdown: { week: string; Fantastic: number; Great: number; Fair: number; Poor: number }[];
  atRiskDrivers: {
    driverId: string;
    name: string;
    employeeId: string;
    overallScore: string | null;
    fico: number | null;
    seatbelt: number | null;
    distraction: number | null;
    speeding: number | null;
  }[];
  unsignedList: {
    id: string;
    driverId: string;
    name: string;
    employeeId: string;
    type: string;
    category: string;
    conductedAt: string;
  }[];
  coachingByType: Record<string, number>;
  fleetAvgs: {
    fico: number | null;
    seatbelt: number | null;
    distraction: number | null;
    speeding: number | null;
    deliveryCompletion: number | null;
    photoOnDelivery: number | null;
  };
  latestWeek: string | null;
  totalDrivers: number;
};

const tierColors: Record<string, string> = {
  Fantastic: "#22c55e",
  Great:     "#3b82f6",
  Fair:      "#f59e0b",
  Poor:      "#ef4444",
};

const typeColors: Record<string, string> = {
  verbal:      "bg-yellow-100 text-yellow-800",
  written:     "bg-orange-100 text-orange-800",
  final:       "bg-red-100 text-red-800",
  termination: "bg-gray-900 text-white",
};

const typeLabels: Record<string, string> = {
  verbal: "Verbal", written: "Written", final: "Final", termination: "Termination",
};

const categoryLabels: Record<string, string> = {
  scorecard: "Scorecard", attendance: "Attendance", conduct: "Conduct",
  safety: "Safety", other: "Other",
};

function KpiCard({
  label, value, icon: Icon, bg, text, sub, subWarn,
}: {
  label: string; value: string; icon: React.ElementType;
  bg: string; text: string; sub?: string; subWarn?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && (
            <p className={`text-xs mt-1 ${subWarn ? "text-red-500 font-medium" : "text-gray-400"}`}>{sub}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${bg}`}>
          <Icon size={20} className={text} />
        </div>
      </div>
    </div>
  );
}

// Normalize metric for radar (higher = better, scale 0-100)
function normalizeMetric(key: string, val: number | null): number {
  if (val === null) return 0;
  switch (key) {
    case "fico":              return Math.max(0, Math.min(100, ((val - 600) / 300) * 100));
    case "seatbelt":          return Math.max(0, Math.min(100, val));
    case "distraction":       return Math.max(0, Math.min(100, 100 - val * 5));
    case "speeding":          return Math.max(0, Math.min(100, 100 - val * 5));
    case "deliveryCompletion":return Math.max(0, Math.min(100, val));
    case "photoOnDelivery":   return Math.max(0, Math.min(100, val));
    default: return 0;
  }
}

const radarLabels: Record<string, string> = {
  fico: "FICO", seatbelt: "Seatbelt", distraction: "Distraction",
  speeding: "Speeding", deliveryCompletion: "DCR", photoOnDelivery: "POD",
};

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

  const { kpis, ficoTrend, tierBreakdown, atRiskDrivers, unsignedList, coachingByType, fleetAvgs, latestWeek } = data;

  const hasScoreData = ficoTrend.some((d) => d.avgFico !== null);
  const hasTierData = tierBreakdown.some((d) => d.Fantastic + d.Great + d.Fair + d.Poor > 0);

  // Radar data
  const radarData = Object.entries(radarLabels).map(([key, label]) => ({
    metric: label,
    score: normalizeMetric(key, fleetAvgs[key as keyof typeof fleetAvgs]),
  }));

  // Coaching type bar data
  const coachingBarData = ["verbal", "written", "final", "termination"].map((t) => ({
    type: typeLabels[t],
    count: coachingByType[t] ?? 0,
    fill: t === "verbal" ? "#fbbf24" : t === "written" ? "#f97316" : t === "final" ? "#ef4444" : "#1f2937",
  }));

  const noData = !hasScoreData;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Header */}
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
            label="Active Drivers"
            value={kpis.activeDrivers.toString()}
            icon={Users}
            bg="bg-blue-50" text="text-blue-600"
          />
          <KpiCard
            label="At-Risk This Week"
            value={kpis.atRiskCount.toString()}
            icon={AlertTriangle}
            bg={kpis.atRiskCount > 0 ? "bg-red-50" : "bg-gray-50"}
            text={kpis.atRiskCount > 0 ? "text-red-600" : "text-gray-400"}
            sub={kpis.atRiskCount > 0 ? "Fair or Poor scorecard" : "All passing"}
            subWarn={kpis.atRiskCount > 0}
          />
          <KpiCard
            label="Unsigned Coachings"
            value={kpis.unsignedCoachings.toString()}
            icon={ClipboardList}
            bg={kpis.unsignedCoachings > 0 ? "bg-yellow-50" : "bg-gray-50"}
            text={kpis.unsignedCoachings > 0 ? "text-yellow-600" : "text-gray-400"}
            sub={kpis.unsignedCoachings > 0 ? "Awaiting driver signature" : undefined}
            subWarn={kpis.unsignedCoachings > 0}
          />
          <KpiCard
            label="Fleet Avg FICO"
            value={kpis.avgFico ? kpis.avgFico.toString() : "—"}
            icon={TrendingUp}
            bg={kpis.avgFico && kpis.avgFico < 700 ? "bg-red-50" : kpis.avgFico && kpis.avgFico < 750 ? "bg-yellow-50" : "bg-green-50"}
            text={kpis.avgFico && kpis.avgFico < 700 ? "text-red-600" : kpis.avgFico && kpis.avgFico < 750 ? "text-yellow-600" : "text-green-600"}
            sub={kpis.avgFico ? (kpis.avgFico >= 750 ? "Good standing" : kpis.avgFico >= 700 ? "Needs attention" : "Below threshold") : undefined}
          />
        </div>

        {noData ? (
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
            {/* Charts row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* FICO Trend */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="font-semibold text-gray-800">Fleet FICO Trend</p>
                    <p className="text-xs text-gray-400 mt-0.5">Weekly average across all active drivers</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={ficoTrend} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[650, 850]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={38} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                      formatter={(v: number) => [v, "Avg FICO"]}
                    />
                    <ReferenceLine y={750} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: "750", position: "right", fontSize: 10, fill: "#f59e0b" }} />
                    <ReferenceLine y={700} stroke="#ef4444" strokeDasharray="4 2" label={{ value: "700", position: "right", fontSize: 10, fill: "#ef4444" }} />
                    <Line
                      type="monotone"
                      dataKey="avgFico"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Tier Breakdown stacked bar */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="mb-4">
                  <p className="font-semibold text-gray-800">Score Distribution by Week</p>
                  <p className="text-xs text-gray-400 mt-0.5">Driver count per performance tier</p>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={tierBreakdown} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                    />
                    <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Fantastic" stackId="a" fill={tierColors.Fantastic} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Great"     stackId="a" fill={tierColors.Great} />
                    <Bar dataKey="Fair"      stackId="a" fill={tierColors.Fair} />
                    <Bar dataKey="Poor"      stackId="a" fill={tierColors.Poor} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Charts row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Fleet compliance radar */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="font-semibold text-gray-800 mb-1">Fleet Compliance</p>
                <p className="text-xs text-gray-400 mb-2">Latest week averages (normalized)</p>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      dataKey="score"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                      formatter={(v: number) => [`${Math.round(v)}`, "Score"]}
                    />
                  </RadarChart>
                </ResponsiveContainer>
                {/* Raw avg values */}
                <div className="grid grid-cols-3 gap-2 mt-1 border-t border-gray-100 pt-3">
                  {[
                    { label: "FICO", val: fleetAvgs.fico, suffix: "" },
                    { label: "Seatbelt", val: fleetAvgs.seatbelt, suffix: "%" },
                    { label: "Distraction", val: fleetAvgs.distraction, suffix: "%" },
                    { label: "Speeding", val: fleetAvgs.speeding, suffix: "%" },
                    { label: "DCR", val: fleetAvgs.deliveryCompletion, suffix: "%" },
                    { label: "POD", val: fleetAvgs.photoOnDelivery, suffix: "%" },
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
                    <YAxis type="category" dataKey="type" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={65} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                      formatter={(v: number) => [v, "Coachings"]}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {coachingBarData.map((entry, i) => (
                        <rect key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Totals */}
                <div className="space-y-2 mt-4 border-t border-gray-100 pt-3">
                  {coachingBarData.map((entry) => (
                    entry.count > 0 && (
                      <div key={entry.type} className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">{entry.type}</span>
                        <span className="text-xs font-semibold text-gray-700">{entry.count}</span>
                      </div>
                    )
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
                    <button
                      onClick={() => router.push("/dashboard/coaching")}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View all
                    </button>
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
                      <div
                        key={c.id}
                        onClick={() => router.push(`/dashboard/drivers/${c.driverId}`)}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                          <Clock size={14} className="text-yellow-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                          <p className="text-xs text-gray-400">
                            {typeLabels[c.type] ?? c.type} · {categoryLabels[c.category] ?? c.category}
                          </p>
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
                      <AlertTriangle size={16} className="text-red-500" />
                      At-Risk Drivers
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {atRiskDrivers.length} driver{atRiskDrivers.length !== 1 ? "s" : ""} with Fair or Poor scorecard this week
                    </p>
                  </div>
                  <button
                    onClick={() => router.push("/dashboard/scorecard")}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View scorecards
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Driver</th>
                        <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                        <th className="text-right pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">FICO</th>
                        <th className="text-right pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Seatbelt</th>
                        <th className="text-right pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Distraction</th>
                        <th className="text-right pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Speeding</th>
                        <th className="pb-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {atRiskDrivers.map((d) => (
                        <tr
                          key={d.driverId}
                          onClick={() => router.push(`/dashboard/drivers/${d.driverId}`)}
                          className="cursor-pointer hover:bg-gray-50 group"
                        >
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
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              d.overallScore === "Poor" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                            }`}>
                              {d.overallScore}
                            </span>
                          </td>
                          <td className="py-3 text-right text-sm">
                            {d.fico !== null ? (
                              <span className={d.fico < 700 ? "text-red-600 font-semibold" : "text-yellow-600 font-semibold"}>
                                {d.fico}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="py-3 text-right text-sm text-gray-600">
                            {d.seatbelt !== null ? `${d.seatbelt}%` : "—"}
                          </td>
                          <td className="py-3 text-right text-sm text-gray-600">
                            {d.distraction !== null ? `${d.distraction}%` : "—"}
                          </td>
                          <td className="py-3 text-right text-sm text-gray-600">
                            {d.speeding !== null ? `${d.speeding}%` : "—"}
                          </td>
                          <td className="py-3 text-right">
                            <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
