"use client";
import { useState } from "react";
import { X } from "lucide-react";

const OWNERSHIP_TYPES = ["AMAZON_OWNED", "AMAZON_RENTAL"];
const OP_STATUSES = ["OPERATIONAL", "GROUNDED"];

export default function AddVehicleModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    vehicleId: "",
    vin: "",
    licensePlate: "",
    make: "",
    model: "",
    subModel: "",
    year: "",
    status: "active",
    operationalStatus: "OPERATIONAL",
    ownershipType: "",
    vehicleProvider: "",
    ownershipStartDate: "",
    ownershipEndDate: "",
    registrationExpiryDate: "",
    registeredState: "",
    stationCode: "",
    notes: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        year: form.year ? parseInt(form.year, 10) : null,
        vin: form.vin || null,
        licensePlate: form.licensePlate || null,
        make: form.make || null,
        model: form.model || null,
        subModel: form.subModel || null,
        ownershipType: form.ownershipType || null,
        vehicleProvider: form.vehicleProvider || null,
        ownershipStartDate: form.ownershipStartDate || null,
        ownershipEndDate: form.ownershipEndDate || null,
        registrationExpiryDate: form.registrationExpiryDate || null,
        registeredState: form.registeredState || null,
        stationCode: form.stationCode || null,
        notes: form.notes || null,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error?.fieldErrors ? "Please check the required fields." : "Something went wrong.");
      return;
    }

    onAdded();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Add Vehicle</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Identifiers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Name *</label>
              <input
                required
                value={form.vehicleId}
                onChange={(e) => set("vehicleId", e.target.value)}
                placeholder="e.g. EDV-28"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
              <input
                value={form.licensePlate}
                onChange={(e) => set("licensePlate", e.target.value)}
                placeholder="86685NF"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
            <input
              value={form.vin}
              onChange={(e) => set("vin", e.target.value)}
              placeholder="17-character VIN"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Make / Model / Year */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
              <input
                value={form.make}
                onChange={(e) => set("make", e.target.value)}
                placeholder="Rivian"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <input
                value={form.model}
                onChange={(e) => set("model", e.target.value)}
                placeholder="EDV 700"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => set("year", e.target.value)}
                placeholder="2024"
                min="1990"
                max="2099"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Model</label>
            <input
              value={form.subModel}
              onChange={(e) => set("subModel", e.target.value)}
              placeholder="2dr Step Van"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Operational Status</label>
              <select
                value={form.operationalStatus}
                onChange={(e) => set("operationalStatus", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {OP_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ownership Type</label>
              <select
                value={form.ownershipType}
                onChange={(e) => set("ownershipType", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select…</option>
                {OWNERSHIP_TYPES.map((t) => (
                  <option key={t} value={t}>{t === "AMAZON_OWNED" ? "Amazon Owned" : "Rental"}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ownership Start</label>
              <input
                type="date"
                value={form.ownershipStartDate}
                onChange={(e) => set("ownershipStartDate", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ownership End</label>
              <input
                type="date"
                value={form.ownershipEndDate}
                onChange={(e) => set("ownershipEndDate", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registration Expiry</label>
              <input
                type="date"
                value={form.registrationExpiryDate}
                onChange={(e) => set("registrationExpiryDate", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registered State</label>
              <input
                value={form.registeredState}
                onChange={(e) => set("registeredState", e.target.value)}
                placeholder="NY - New York"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Provider</label>
              <input
                value={form.vehicleProvider}
                onChange={(e) => set("vehicleProvider", e.target.value)}
                placeholder="LP / ELEMENT"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Station Code</label>
              <input
                value={form.stationCode}
                onChange={(e) => set("stationCode", e.target.value)}
                placeholder="DYY6"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Vehicle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
