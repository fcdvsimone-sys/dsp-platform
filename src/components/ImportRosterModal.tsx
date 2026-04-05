"use client";
import { useState, useRef } from "react";
import { X, Upload, CheckCircle, AlertCircle } from "lucide-react";

type Result = { created: number; updated: number; errors: string[] };

export default function ImportRosterModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/import/roster", { method: "POST", body: formData });
    const data = await res.json();
    setResult(data);
    setLoading(false);
    if (data.created > 0 || data.updated > 0) onImported();
  }

  function handleFile(files: FileList | null) {
    const file = files?.[0];
    if (file && file.name.endsWith(".csv")) upload(file);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Import Roster from Cortex</h2>
            <p className="text-sm text-gray-500 mt-0.5">Upload the Cortex workforce CSV export</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {!result ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files); }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
            }`}
          >
            <Upload size={32} className="mx-auto text-gray-400 mb-3" />
            {loading ? (
              <p className="text-sm text-gray-600">Importing...</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">Drop CSV here or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">Cortex workforce export format</p>
              </>
            )}
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleFile(e.target.files)} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 bg-green-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{result.created}</p>
                <p className="text-sm text-green-600">New drivers added</p>
              </div>
              <div className="flex-1 bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{result.updated}</p>
                <p className="text-sm text-blue-600">Existing updated</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="bg-red-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={16} className="text-red-500" />
                  <p className="text-sm font-medium text-red-700">{result.errors.length} errors</p>
                </div>
                <ul className="text-xs text-red-600 space-y-1">
                  {result.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
            {result.errors.length === 0 && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle size={18} />
                <p className="text-sm font-medium">Import completed successfully</p>
              </div>
            )}
            <button onClick={onClose} className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
