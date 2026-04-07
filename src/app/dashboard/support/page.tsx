"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Headphones, Upload, Clock, PhoneCall, AlertTriangle, ChevronRight, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import ImportSupportModal from "@/components/ImportSupportModal";

type SupportSummary = {
  total: number;
  totalTimeSecs: number;
  byReason: { reason: string; count: number }[];
  byDriver: { driverId: string | null; name: string; count: number; totalSecs: number }[];
  recentTickets: {
    id: string;
    transporterId: string;
    contactDate: string;
    contactReason: string | null;
    totalContactTimeSecs: number;
    dnrInd: boolean;
    driver: { id: string; firstName: string; lastName: string; employeeId: string } | null;
  }[];
};

function fmtTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function SupportPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<SupportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);

  async function load() {
    const res = await fetch("/api/support?summary=1");
    const data = await res.json();
    setSummary(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Driver Support</h1>
            <p className="text-gray-500 mt-1">Cortex Driver Support ticket history</p>
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Upload size={16} /> Import CSV
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">Loading...</div>
        ) : !summary || summary.total === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <Headphones size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No support tickets yet</h3>
            <p className="text-gray-400 text-sm mb-6">Import your Cortex Driver Support report CSV to get started</p>
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              <Upload size={16} /> Import CSV
            </button>
          </div>
        ) : (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Total Contacts</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{summary.total.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50"><PhoneCall size={20} className="text-blue-600" /></div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Total Contact Time</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{fmtTime(summary.totalTimeSecs)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50"><Clock size={20} className="text-purple-600" /></div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Unique Drivers</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{summary.byDriver.length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-green-50"><Headphones size={20} className="text-green-600" /></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Top contact reasons */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="font-semibold text-gray-800 mb-4">Top Contact Reasons</p>
                <div className="space-y-3">
                  {summary.byReason.map((r, i) => {
                    const pct = Math.round((r.count / summary.total) * 100);
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700 truncate max-w-[75%]">{r.reason}</span>
                          <span className="text-gray-500 font-medium shrink-0">{r.count} <span className="text-gray-400">({pct}%)</span></span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top drivers by contact count */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="font-semibold text-gray-800 mb-4">Most Contacted Drivers</p>
                <div className="space-y-2">
                  {summary.byDriver.slice(0, 8).map((d, i) => (
                    <div
                      key={i}
                      onClick={() => d.driverId && router.push(`/dashboard/drivers/${d.driverId}`)}
                      className={`flex items-center gap-3 p-2.5 rounded-lg ${d.driverId ? "cursor-pointer hover:bg-gray-50 group" : ""}`}
                    >
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{d.name ?? "Unknown"}</p>
                        <p className="text-xs text-gray-400">{fmtTime(d.totalSecs)} total</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-gray-700">{d.count}</p>
                        <p className="text-xs text-gray-400">contacts</p>
                      </div>
                      {d.driverId && <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent tickets */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <p className="font-semibold text-gray-800">Recent Tickets</p>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Driver</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">DNR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {summary.recentTickets.map((t) => {
                    const mins = Math.floor(t.totalContactTimeSecs / 60);
                    const secs = t.totalContactTimeSecs % 60;
                    return (
                      <tr
                        key={t.id}
                        onClick={() => t.driver && router.push(`/dashboard/drivers/${t.driver.id}`)}
                        className={t.driver ? "cursor-pointer hover:bg-gray-50" : ""}
                      >
                        <td className="px-6 py-3">
                          {t.driver ? (
                            <div>
                              <p className="text-sm font-medium text-gray-800">{t.driver.firstName} {t.driver.lastName}</p>
                              <p className="text-xs text-gray-400">{t.transporterId}</p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-gray-500">{t.transporterId}</p>
                              <p className="text-xs text-orange-500">No match</p>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {format(new Date(t.contactDate), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{t.contactReason ?? "—"}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-700">
                          {t.totalContactTimeSecs > 0
                            ? mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
                            : "—"}
                        </td>
                        <td className="px-6 py-3 text-center">
                          {t.dnrInd ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                              <AlertTriangle size={10} /> Yes
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">No</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showImport && (
        <ImportSupportModal
          onClose={() => setShowImport(false)}
          onImported={() => { load(); }}
        />
      )}
    </div>
  );
}
