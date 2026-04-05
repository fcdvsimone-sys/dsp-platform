"use client";
import { useEffect, useState } from "react";
import { Upload, TrendingUp, AlertTriangle, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import ImportScorecardModal from "@/components/ImportScorecardModal";

type Scorecard = {
  id: string;
  weekOf: string;
  overallScore: string | null;
  fico: number | null;
  seatbelt: number | null;
  distraction: number | null;
  speeding: number | null;
  deliveryCompletion: number | null;
  photoOnDelivery: number | null;
  dnr: number | null;
  podOpportunities: number | null;
  driver: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    status: string;
  };
};

const scoreTier: Record<string, { bg: string; text: string; rank: number }> = {
  Fantastic: { bg: "bg-green-100", text: "text-green-700", rank: 4 },
  Great:     { bg: "bg-blue-100",  text: "text-blue-700",  rank: 3 },
  Fair:      { bg: "bg-yellow-100",text: "text-yellow-700",rank: 2 },
  Poor:      { bg: "bg-red-100",   text: "text-red-700",   rank: 1 },
};

function ScoreBadge({ score }: { score: string | null }) {
  if (!score) return <span className="text-gray-400 text-sm">—</span>;
  const tier = scoreTier[score];
  if (!tier) return <span className="text-sm text-gray-600">{score}</span>;
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${tier.bg} ${tier.text}`}>
      {score}
    </span>
  );
}

function MetricCell({ value, suffix = "%", warn, danger }: {
  value: number | null;
  suffix?: string;
  warn?: number;
  danger?: number;
}) {
  if (value === null) return <span className="text-gray-400 text-sm">—</span>;
  let color = "text-gray-700";
  if (danger !== undefined && value <= danger) color = "text-red-600 font-semibold";
  else if (warn !== undefined && value <= warn) color = "text-yellow-600 font-semibold";
  return <span className={`text-sm ${color}`}>{value}{suffix}</span>;
}

function avg(nums: (number | null)[]): number | null {
  const valid = nums.filter((n): n is number => n !== null);
  if (!valid.length) return null;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
}

export default function ScorecardPage() {
  const [weeks, setWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [loading, setLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [filter, setFilter] = useState<"all" | "at-risk">("all");

  async function loadWeeks() {
    const res = await fetch("/api/scorecards?weeks=1");
    const data: string[] = await res.json();
    setWeeks(data);
    if (data.length > 0) setSelectedWeek(data[0]);
  }

  async function loadScorecards(week: string) {
    if (!week) return;
    setLoading(true);
    const res = await fetch(`/api/scorecards?week=${encodeURIComponent(week)}`);
    const data = await res.json();
    setScorecards(data);
    setLoading(false);
  }

  useEffect(() => { loadWeeks(); }, []);
  useEffect(() => { if (selectedWeek) loadScorecards(selectedWeek); }, [selectedWeek]);

  function handleImported() {
    loadWeeks();
    if (selectedWeek) loadScorecards(selectedWeek);
  }

  const atRisk = scorecards.filter(
    (s) => s.overallScore === "Fair" || s.overallScore === "Poor"
  );

  const displayed = filter === "at-risk" ? atRisk : scorecards;

  const sorted = [...displayed].sort((a, b) => {
    const ra = scoreTier[a.overallScore ?? ""]?.rank ?? 99;
    const rb = scoreTier[b.overallScore ?? ""]?.rank ?? 99;
    return ra - rb;
  });

  // Summary stats
  const avgFico = avg(scorecards.map((s) => s.fico));
  const avgSeatbelt = avg(scorecards.map((s) => s.seatbelt));
  const avgDistraction = avg(scorecards.map((s) => s.distraction));
  const avgSpeeding = avg(scorecards.map((s) => s.speeding));

  const tierCounts = { Fantastic: 0, Great: 0, Fair: 0, Poor: 0 };
  for (const s of scorecards) {
    if (s.overallScore && s.overallScore in tierCounts) {
      tierCounts[s.overallScore as keyof typeof tierCounts]++;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Scorecard</h1>
            <p className="text-gray-500 mt-1">Amazon Cortex weekly performance metrics</p>
          </div>
          <div className="flex gap-3 items-center">
            {weeks.length > 0 && (
              <div className="relative">
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-9 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {weeks.map((w) => (
                    <option key={w} value={w}>
                      Week of {format(new Date(w), "MMM d, yyyy")}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            )}
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm"
            >
              <Upload size={16} /> Import from Cortex
            </button>
          </div>
        </div>

        {scorecards.length === 0 && !loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No scorecards yet</h3>
            <p className="text-gray-400 text-sm mb-6">Import your Cortex scorecard CSV to get started</p>
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium"
            >
              <Upload size={18} /> Import from Cortex
            </button>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Avg FICO</p>
                <p className={`text-3xl font-bold ${avgFico !== null && avgFico < 700 ? "text-red-600" : avgFico !== null && avgFico < 750 ? "text-yellow-600" : "text-gray-900"}`}>
                  {avgFico ?? "—"}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">At Risk</p>
                <p className={`text-3xl font-bold ${atRisk.length > 0 ? "text-red-600" : "text-gray-900"}`}>
                  {atRisk.length}
                  <span className="text-base font-normal text-gray-400 ml-1">/ {scorecards.length}</span>
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Avg Seatbelt</p>
                <p className={`text-3xl font-bold ${avgSeatbelt !== null && avgSeatbelt < 95 ? "text-red-600" : "text-gray-900"}`}>
                  {avgSeatbelt !== null ? `${avgSeatbelt}%` : "—"}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Avg Distraction</p>
                <p className={`text-3xl font-bold ${avgDistraction !== null && avgDistraction > 5 ? "text-red-600" : "text-gray-900"}`}>
                  {avgDistraction !== null ? `${avgDistraction}%` : "—"}
                </p>
              </div>
            </div>

            {/* Tier breakdown bar */}
            {scorecards.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-3">Score Distribution</p>
                <div className="flex gap-4 items-center">
                  {(["Fantastic", "Great", "Fair", "Poor"] as const).map((tier) => {
                    const count = tierCounts[tier];
                    const pct = scorecards.length ? Math.round((count / scorecards.length) * 100) : 0;
                    const t = scoreTier[tier];
                    return (
                      <div key={tier} className="flex items-center gap-2 flex-1">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span className={`font-medium ${t.text}`}>{tier}</span>
                            <span className="text-gray-500">{count} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${t.bg.replace("bg-", "bg-").replace("-100", "-400")}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filter tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === "all" ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"}`}
              >
                All Drivers ({scorecards.length})
              </button>
              <button
                onClick={() => setFilter("at-risk")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium ${filter === "at-risk" ? "bg-red-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"}`}
              >
                <AlertTriangle size={14} /> At Risk ({atRisk.length})
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
              {loading ? (
                <div className="p-12 text-center text-gray-400">Loading...</div>
              ) : sorted.length === 0 ? (
                <div className="p-12 text-center text-gray-400">No results</div>
              ) : (
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Driver</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">FICO</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Seatbelt</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Distraction</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Speeding</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">DCR</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">POD</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">DNR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sorted.map((s) => (
                      <tr key={s.id} className={`hover:bg-gray-50 ${(s.overallScore === "Poor" || s.overallScore === "Fair") ? "bg-red-50/30" : ""}`}>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs">
                              {s.driver.firstName[0]}{s.driver.lastName[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{s.driver.firstName} {s.driver.lastName}</p>
                              <p className="text-xs text-gray-400">{s.driver.employeeId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5"><ScoreBadge score={s.overallScore} /></td>
                        <td className="px-4 py-3.5 text-right">
                          <MetricCell value={s.fico} suffix="" warn={750} danger={700} />
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <MetricCell value={s.seatbelt} warn={97} danger={95} />
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {s.distraction === null ? <span className="text-gray-400 text-sm">—</span> : (
                            <span className={`text-sm ${s.distraction > 8 ? "text-red-600 font-semibold" : s.distraction > 5 ? "text-yellow-600 font-semibold" : "text-gray-700"}`}>
                              {s.distraction}%
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {s.speeding === null ? <span className="text-gray-400 text-sm">—</span> : (
                            <span className={`text-sm ${s.speeding > 8 ? "text-red-600 font-semibold" : s.speeding > 5 ? "text-yellow-600 font-semibold" : "text-gray-700"}`}>
                              {s.speeding}%
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <MetricCell value={s.deliveryCompletion} warn={98} danger={95} />
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <MetricCell value={s.photoOnDelivery} warn={95} danger={90} />
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          {s.dnr === null ? <span className="text-gray-400 text-sm">—</span> : (
                            <span className={`text-sm ${s.dnr > 0 ? "text-red-600 font-semibold" : "text-gray-700"}`}>
                              {s.dnr}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {showImport && (
        <ImportScorecardModal
          onClose={() => setShowImport(false)}
          onImported={handleImported}
        />
      )}
    </div>
  );
}
