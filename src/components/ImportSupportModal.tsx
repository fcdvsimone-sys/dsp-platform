"use client";
import { useState, useRef } from "react";
import { X, Upload, CheckCircle, AlertTriangle, Headphones } from "lucide-react";

export default function ImportSupportModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; unmatched: number } | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/import/support", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setResult(data);
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <Headphones size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Import Driver Support Tickets</h2>
              <p className="text-xs text-gray-500 mt-0.5">Export from Cortex → Driver Support Report</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              file ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
            }`}
          >
            <Upload size={28} className={`mx-auto mb-2 ${file ? "text-blue-500" : "text-gray-400"}`} />
            {file ? (
              <div>
                <p className="font-medium text-blue-700 text-sm">{file.name}</p>
                <p className="text-xs text-blue-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-600">Click to select CSV file</p>
                <p className="text-xs text-gray-400 mt-1">Driver Support export from Cortex</p>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); setError(""); }}
            />
          </div>

          {/* Result */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={16} className="text-green-600" />
                <p className="text-sm font-semibold text-green-800">Import complete</p>
              </div>
              <p className="text-sm text-green-700">{result.imported} tickets imported</p>
              {result.unmatched > 0 && (
                <p className="text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-1 mt-1">
                  {result.unmatched} ticket{result.unmatched !== 1 ? "s" : ""} could not be matched to a driver in the roster — Transporter ID not found.
                </p>
              )}
              {result.skipped > 0 && (
                <p className="text-xs text-gray-500">{result.skipped} rows skipped (duplicates or invalid data)</p>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50">
              {result ? "Close" : "Cancel"}
            </button>
            {!result && (
              <button
                onClick={handleImport}
                disabled={!file || loading}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Importing..." : "Import"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
