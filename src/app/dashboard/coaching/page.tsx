"use client";
import { useEffect, useState } from "react";
import { Plus, CheckCircle, Clock, AlertTriangle, Filter } from "lucide-react";
import { format } from "date-fns";
import NewCoachingModal from "@/components/NewCoachingModal";
import CoachingDetailModal from "@/components/CoachingDetailModal";

type Coaching = {
  id: string;
  type: string;
  category: string;
  description: string;
  actionPlan: string | null;
  conductedBy: string;
  conductedAt: string;
  signedAt: string | null;
  signatureUrl: string | null;
  driver: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    status: string;
  };
};

const typeLabels: Record<string, string> = {
  verbal: "Verbal",
  written: "Written",
  final: "Final Warning",
  termination: "Termination",
};

const typeColors: Record<string, string> = {
  verbal: "bg-yellow-100 text-yellow-800",
  written: "bg-orange-100 text-orange-800",
  final: "bg-red-100 text-red-800",
  termination: "bg-gray-900 text-white",
};

const categoryLabels: Record<string, string> = {
  scorecard: "Scorecard",
  attendance: "Attendance",
  conduct: "Conduct",
  safety: "Safety",
  other: "Other",
};

export default function CoachingPage() {
  const [coachings, setCoachings] = useState<Coaching[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<Coaching | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [signedFilter, setSignedFilter] = useState("all");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/coachings");
    const data = await res.json();
    setCoachings(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = coachings.filter((c) => {
    const matchesType = typeFilter === "all" || c.type === typeFilter;
    const matchesSigned =
      signedFilter === "all" ||
      (signedFilter === "signed" && !!c.signedAt) ||
      (signedFilter === "unsigned" && !c.signedAt);
    const matchesSearch =
      search === "" ||
      `${c.driver.firstName} ${c.driver.lastName} ${c.driver.employeeId}`
        .toLowerCase()
        .includes(search.toLowerCase());
    return matchesType && matchesSigned && matchesSearch;
  });

  const unsignedCount = coachings.filter((c) => !c.signedAt).length;

  function openDetail(c: Coaching) {
    setSelected(c);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Coaching</h1>
            <p className="text-gray-500 mt-1">
              {coachings.length} total
              {unsignedCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-yellow-600 font-medium">
                  <Clock size={14} /> {unsignedCount} awaiting signature
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            <Plus size={18} /> New Coaching
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search driver..."
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
          />

          <div className="flex rounded-lg border border-gray-300 overflow-hidden bg-white">
            {["all", "verbal", "written", "final", "termination"].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-2 text-xs font-medium capitalize ${typeFilter === t ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                {t === "all" ? "All Types" : typeLabels[t]}
              </button>
            ))}
          </div>

          <div className="flex rounded-lg border border-gray-300 overflow-hidden bg-white">
            {[
              { val: "all", label: "All" },
              { val: "unsigned", label: "Unsigned" },
              { val: "signed", label: "Signed" },
            ].map(({ val, label }) => (
              <button
                key={val}
                onClick={() => setSignedFilter(val)}
                className={`px-3 py-2 text-xs font-medium ${signedFilter === val ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : coachings.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <AlertTriangle size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No coachings yet</h3>
            <p className="text-gray-400 text-sm mb-6">Document coaching sessions and track driver accountability</p>
            <button
              onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium"
            >
              <Plus size={18} /> New Coaching
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-gray-400">No results match your filters</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Driver</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Conducted By</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => openDetail(c)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
                            {c.driver.firstName[0]}{c.driver.lastName[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{c.driver.firstName} {c.driver.lastName}</p>
                            <p className="text-xs text-gray-400">{c.driver.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeColors[c.type] ?? "bg-gray-100 text-gray-600"}`}>
                          {typeLabels[c.type] ?? c.type}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {categoryLabels[c.category] ?? c.category}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{c.conductedBy}</td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {format(new Date(c.conductedAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4">
                        {c.signedAt ? (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-green-700">
                            <CheckCircle size={14} />
                            Signed {format(new Date(c.signedAt), "MMM d")}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-yellow-600">
                            <Clock size={14} />
                            Awaiting signature
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {showNew && (
        <NewCoachingModal
          onClose={() => setShowNew(false)}
          onCreated={load}
        />
      )}

      {selected && (
        <CoachingDetailModal
          coaching={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => {
            load();
            // Refresh the selected coaching to reflect signed state
            fetch(`/api/coachings/${selected.id}`)
              .then((r) => r.json())
              .then(setSelected);
          }}
        />
      )}
    </div>
  );
}
