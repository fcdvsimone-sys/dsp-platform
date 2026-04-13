"use client";
import { useEffect, useState } from "react";
import { Upload, Plus, Search, Car, AlertTriangle, CheckCircle2, Wrench } from "lucide-react";
import { format } from "date-fns";
import ImportVehiclesModal from "@/components/ImportVehiclesModal";
import AddVehicleModal from "@/components/AddVehicleModal";

type Vehicle = {
  id: string;
  vehicleId: string;
  vin: string | null;
  licensePlate: string | null;
  make: string | null;
  model: string | null;
  subModel: string | null;
  year: number | null;
  status: string;
  operationalStatus: string | null;
  serviceType: string | null;
  serviceTier: string | null;
  ownershipType: string | null;
  vehicleProvider: string | null;
  ownershipStartDate: string | null;
  ownershipEndDate: string | null;
  registrationExpiryDate: string | null;
  registeredState: string | null;
  stationCode: string | null;
  notes: string | null;
};

const opStatusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  OPERATIONAL: { label: "Operational", className: "bg-green-100 text-green-700", icon: <CheckCircle2 size={11} /> },
  GROUNDED:    { label: "Grounded",    className: "bg-red-100 text-red-700",     icon: <AlertTriangle size={11} /> },
};

const ownershipLabels: Record<string, string> = {
  AMAZON_OWNED:  "Amazon Owned",
  AMAZON_RENTAL: "Rental",
};

const STATUS_FILTERS = ["all", "OPERATIONAL", "GROUNDED", "inactive"];

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  async function loadVehicles() {
    setLoading(true);
    const res = await fetch("/api/vehicles");
    const data = await res.json();
    setVehicles(data);
    setLoading(false);
  }

  useEffect(() => { loadVehicles(); }, []);

  const filtered = vehicles.filter((v) => {
    const matchesSearch = [v.vehicleId, v.vin, v.licensePlate, v.make, v.model, v.registeredState]
      .filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase());

    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "inactive") return matchesSearch && v.status === "inactive";
    return matchesSearch && v.operationalStatus === statusFilter;
  });

  const operational = vehicles.filter((v) => v.operationalStatus === "OPERATIONAL").length;
  const grounded    = vehicles.filter((v) => v.operationalStatus === "GROUNDED").length;
  const rental      = vehicles.filter((v) => v.ownershipType === "AMAZON_RENTAL").length;

  // Vehicles with registration expiring within 30 days
  const soonExpiring = vehicles.filter((v) => {
    if (!v.registrationExpiryDate) return false;
    const diff = new Date(v.registrationExpiryDate).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vehicles</h1>
            <p className="text-gray-500 mt-1">{vehicles.length} vehicles · {operational} operational</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium text-sm"
            >
              <Upload size={16} /> Import Fleet
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm"
            >
              <Plus size={16} /> Add Vehicle
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Fleet</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{vehicles.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-sm text-gray-500">Operational</p>
            <p className="text-3xl font-bold text-green-700 mt-1">{operational}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-sm text-gray-500">Grounded</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{grounded}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-sm text-gray-500">Rentals</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{rental}</p>
            {soonExpiring > 0 && (
              <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                <AlertTriangle size={11} /> {soonExpiring} expiring soon
              </p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, VIN, plate, state…"
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 font-medium capitalize ${statusFilter === s ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
              >
                {s === "all" ? "All" : s === "OPERATIONAL" ? "Operational" : s === "GROUNDED" ? "Grounded" : "Inactive"}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Car size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 font-medium">No vehicles found</p>
              <p className="text-gray-400 text-sm mt-1">Import your Amazon fleet export or add vehicles manually</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehicle</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">VIN</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plate</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ownership</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reg. Expiry</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">State</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Op. Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((v) => {
                  const opCfg = v.operationalStatus ? opStatusConfig[v.operationalStatus] : null;
                  const expiry = v.registrationExpiryDate ? new Date(v.registrationExpiryDate) : null;
                  const expiryWarning = expiry && expiry.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000 && expiry.getTime() > Date.now();

                  return (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
                            <Car size={16} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{v.vehicleId}</p>
                            <p className="text-xs text-gray-500">
                              {[v.year, v.make, v.model, v.subModel].filter(Boolean).join(" ")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 font-mono">{v.vin ?? "—"}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{v.licensePlate ?? "—"}</td>
                      <td className="px-6 py-4">
                        {v.ownershipType ? (
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${v.ownershipType === "AMAZON_RENTAL" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>
                            {ownershipLabels[v.ownershipType] ?? v.ownershipType}
                          </span>
                        ) : <span className="text-gray-400 text-sm">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {expiry ? (
                          <span className={expiryWarning ? "text-orange-600 font-medium flex items-center gap-1" : "text-gray-600"}>
                            {expiryWarning && <AlertTriangle size={13} />}
                            {format(expiry, "MMM d, yyyy")}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{v.registeredState ?? "—"}</td>
                      <td className="px-6 py-4">
                        {opCfg ? (
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${opCfg.className}`}>
                            {opCfg.icon} {opCfg.label}
                          </span>
                        ) : v.status === "inactive" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                            <Wrench size={11} /> Inactive
                          </span>
                        ) : <span className="text-gray-400 text-sm">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showImport && <ImportVehiclesModal onClose={() => setShowImport(false)} onImported={loadVehicles} />}
      {showAdd && <AddVehicleModal onClose={() => setShowAdd(false)} onAdded={loadVehicles} />}
    </div>
  );
}
