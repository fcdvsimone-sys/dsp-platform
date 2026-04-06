"use client";
import { useEffect, useState } from "react";
import { Upload, TrendingUp, AlertTriangle, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import ImportScorecardModal from "@/components/ImportScorecardModal";

type Scorecard = {
  id: string;
  weekOf: string;
  overallStanding: string | null;
  overallScore: number | null;
  speedingRate: number | null;
  seatbeltRate: number | null;
  distractionRate: number | null;
  signalViolationRate: number | null;
  followingDistanceRate: number | null;
  cdfDpmo: number | null;
  ced: number | null;
  dcr: number | null;
  dsb: number | null;
  pod: number | null;
  psb: number | null;
  packagesDelivered: number | null;
  fico: number | null;
  driver: { id: string; firstName: string; lastName: string; employeeId: string; status: string };
};

const standingConfig: Record<string, { bg: string; text: string; rank: number }> = {
  Platinum:        { bg: "bg-violet-100", text: "text-violet-700", rank: 5 },
  Gold:            { bg: "bg-yellow-100", text: "text-yellow-700", rank: 4 },
  Silver:          { bg: "bg-gray-100",   text: "text-gray-600",   rank: 3 },
  Bronze:          { bg: "bg-orange-100", text: "text-orange-700", rank: 2 },
  "Below Standard":{ bg: "bg-red-100",    text: "text-red-700",    rank: 1 },
};

const AT_RISK = ["Silver", "Bronze", "Below Standard"];

function StandingBadge({ standing }: { standing: string | null }) {
  if (!standing) return <span className="text-gray-400 text-sm">—</span>;
  const cfg = standingConfig[standing];
  if (!cfg) return <span className="text-sm text-gray-600">{standing}</span>;
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
      {standing}
    </span>
  );
}

// Rate metrics: lower is better — color red if elevated
function RateCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-400 text-sm">—</span>;
  const color = value > 0.3 ? "text-red-600 font-semibold" : value > 0.1 ? "text-yellow-600 font-semibold" : "text-gray-700";
  return <span className={`text-sm ${color}`}>{value.toFixed(2)}</span>;
}

// Percentage metrics: higher is better
function PctCell({ value, warn = 98, danger = 95 }: { value: number | null; warn?: number; danger?: number }) {
  if (value === null) return <span className="text-gray-400 text-sm">—</span>;
  const color = value < danger ? "text-red-600 font-semibold" : value < warn ? "text-yellow-600 font-semibold" : "text-gray-700";
  return <span className={`text-sm ${color}`}>{value}%</span>;
}

function avg(nums: (number | null)[]): number | null {
  const v = nums.filter((n): n is number => n !== null);
  if (!v.length) return null;
  return Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100;
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

  const atRisk = scorecards.filter((s) => s.overallStanding && AT_RISK.includes(s.overallStanding));
  const displayed = filter === "at-risk" ? atRisk : scorecards;
  const sorted = [...displayed].sort((a, b) => {
    const ra = standingConfig[a.overallStanding ?? ""]?.rank ?? 99;
    const rb = standingConfig[b.overallStanding ?? ""]?.rank ?? 99;
    return ra - rb;
  });

  // Summary stats
  const tierCounts = { Platinum: 0, Gold: 0, Silver: 0, Bronze: 0, "Below Standard": 0 };
  for (const s of scorecards) {
    if (s.overallStanding && s.overallStanding in tierCounts) {
      tierCounts[s.overallStanding as keyof typeof tierCounts]++;
    }
  }
  const avgScore = avg(scorecards.map((s) => s.overallScore));
  const avgDcr = avg(scorecards.map((s) => s.dcr));
  const avgPod = avg(scorecards.map((s) => s.pod));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Scorecard</h1>
            <p className="text-gray-500 mt-1">Amazon Cortex weekly driver performance</p>
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
            <p className="text-gray-400 text-sm mb-6">Export the driver scorecard from Cortex and import the CSV</p>
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium"
            >
              <Upload size={18} /> Import from Cortex
            </button>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Avg Score</p>
                <p className={`text-3xl font-bold ${avgScore !== null && avgScore < 85 ? "text-red-600" : avgScore !== null && avgScore < 90 ? "text-yellow-600" : "text-gray-900"}`}>
                  {avgScore ?? "—"}
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
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Avg DCR</p>
                <p className={`text-3xl font-bold ${avgDcr !== null && avgDcr < 95 ? "text-red-600" : avgDcr !== null && avgDcr < 98 ? "text-yellow-600" : "text-gray-900"}`}>
                  {avgDcr !== null ? `${avgDcr}%` : "—"}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Avg POD</p>
                <p className={`text-3xl font-bold ${avgPod !== null && avgPod < 90 ? "text-red-600" : avgPod !== null && avgPod < 95 ? "text-yellow-600" : "text-gray-900"}`}>
                  {avgPod !== null ? `${avgPod}%` : "—"}
                </p>
              </div>
            </div>

            {/* Tier distribution */}
            {scorecards.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-3">Standing Distribution</p>
                <div className="flex gap-4">
                  {(["Platinum", "Gold", "Silver", "Bronze", "Below Standard"] as const).map((tier) => {
                    const count = tierCounts[tier];
                    const pct = scorecards.length ? Math.round((count / scorecards.length) * 100) : 0;
                    const cfg = standingConfig[tier];
                    return (
                      <div key={tier} className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className={`font-medium ${cfg.text}`}>{tier}</span>
                          <span className="text-gray-400">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${cfg.bg}`} style={{ width: `${pct}%`, filter: "brightness(0.85)" }} />
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
                <table className="w-full" style={{ minWidth: 1100 }}>
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">Driver</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Standing</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Speeding</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Seatbelt</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Distraction</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Signal Viol.</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Following Dist.</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">DCR</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">POD</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">CDF DPMO</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pkgs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sorted.map((s) => (
                      <tr key={s.id} className={`hover:bg-gray-50 ${s.overallStanding && AT_RISK.includes(s.overallStanding) ? "bg-red-50/30" : ""}`}>
                        <td className="px-5 py-3.5 sticky left-0 bg-white">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs shrink-0">
                              {s.driver.firstName[0]}{s.driver.lastName[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{s.driver.firstName} {s.driver.lastName}</p>
                              <p className="text-xs text-gray-400">{s.driver.employeeId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5"><StandingBadge standing={s.overallStanding} /></td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={`text-sm font-semibold ${(s.overallScore ?? 100) < 85 ? "text-red-600" : (s.overallScore ?? 100) < 90 ? "text-yellow-600" : "text-gray-700"}`}>
                            {s.overallScore ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right"><RateCell value={s.speedingRate} /></td>
                        <td className="px-4 py-3.5 text-right"><RateCell value={s.seatbeltRate} /></td>
                        <td className="px-4 py-3.5 text-right"><RateCell value={s.distractionRate} /></td>
                        <td className="px-4 py-3.5 text-right"><RateCell value={s.signalViolationRate} /></td>
                        <td className="px-4 py-3.5 text-right"><RateCell value={s.followingDistanceRate} /></td>
                        <td className="px-4 py-3.5 text-right"><PctCell value={s.dcr} warn={98} danger={95} /></td>
                        <td className="px-4 py-3.5 text-right"><PctCell value={s.pod} warn={95} danger={90} /></td>
                        <td className="px-4 py-3.5 text-right">
                          {s.cdfDpmo !== null ? (
                            <span className={`text-sm ${s.cdfDpmo > 1500 ? "text-red-600 font-semibold" : s.cdfDpmo > 1000 ? "text-yellow-600 font-semibold" : "text-gray-700"}`}>
                              {s.cdfDpmo.toLocaleString()}
                            </span>
                          ) : <span className="text-gray-400 text-sm">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-right text-sm text-gray-600">
                          {s.packagesDelivered?.toLocaleString() ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <p className="text-xs text-gray-400 mt-3">
              Safety rates are per trip — lower is better. Rate &gt; 0.1 = caution, &gt; 0.3 = alert.
            </p>
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
