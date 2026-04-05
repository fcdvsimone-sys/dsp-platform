"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Upload, Search, Phone, Mail, AlertCircle } from "lucide-react";
import AddDriverModal from "@/components/AddDriverModal";
import ImportRosterModal from "@/components/ImportRosterModal";
import { format } from "date-fns";

type Driver = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  status: string;
  hireDate: string | null;
  _count: { coachings: number };
  scorecards: { overallScore: string | null; weekOf: string }[];
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-yellow-100 text-yellow-700",
  terminated: "bg-red-100 text-red-700",
};

const scoreColors: Record<string, string> = {
  Fantastic: "bg-green-100 text-green-700",
  Great: "bg-blue-100 text-blue-700",
  Fair: "bg-yellow-100 text-yellow-700",
  Poor: "bg-red-100 text-red-700",
};

export default function DriversPage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [statusFilter, setStatusFilter] = useState("active");

  async function loadDrivers() {
    setLoading(true);
    const res = await fetch("/api/drivers");
    const data = await res.json();
    setDrivers(data);
    setLoading(false);
  }

  useEffect(() => { loadDrivers(); }, []);

  const filtered = drivers.filter((d) => {
    const matchesSearch =
      `${d.firstName} ${d.lastName} ${d.employeeId}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Drivers</h1>
            <p className="text-gray-500 mt-1">{drivers.filter(d => d.status === "active").length} active drivers</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium"
            >
              <Upload size={18} /> Import from Cortex
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              <UserPlus size={18} /> Add Driver
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or ID..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {["active", "inactive", "terminated", "all"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 text-sm font-medium capitalize ${statusFilter === s ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No drivers found</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Driver</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee ID</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hire Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Score</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Coachings</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((driver) => {
                  const lastScore = driver.scorecards[0];
                  return (
                    <tr key={driver.id} onClick={() => router.push(`/dashboard/drivers/${driver.id}`)} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                            {driver.firstName[0]}{driver.lastName[0]}
                          </div>
                          <span className="font-medium text-gray-900">{driver.firstName} {driver.lastName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{driver.employeeId}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          {driver.phone && <span className="flex items-center gap-1 text-xs text-gray-500"><Phone size={12} />{driver.phone}</span>}
                          {driver.email && <span className="flex items-center gap-1 text-xs text-gray-500"><Mail size={12} />{driver.email}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {driver.hireDate ? format(new Date(driver.hireDate), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="px-6 py-4">
                        {lastScore?.overallScore ? (
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${scoreColors[lastScore.overallScore] ?? "bg-gray-100 text-gray-600"}`}>
                            {lastScore.overallScore}
                          </span>
                        ) : <span className="text-gray-400 text-sm">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        {driver._count.coachings > 0 ? (
                          <span className="flex items-center gap-1 text-sm text-orange-600 font-medium">
                            <AlertCircle size={14} />{driver._count.coachings}
                          </span>
                        ) : <span className="text-gray-400 text-sm">0</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${statusColors[driver.status]}`}>
                          {driver.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {showAdd && <AddDriverModal onClose={() => setShowAdd(false)} onAdded={loadDrivers} />}
      {showImport && <ImportRosterModal onClose={() => setShowImport(false)} onImported={loadDrivers} />}
    </div>
  );
}
