"use client";
import { useState } from "react";
import { X, CheckCircle, Clock, Printer, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import SignaturePad from "./SignaturePad";

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
  };
};

const typeLabels: Record<string, string> = {
  verbal: "Verbal Warning",
  written: "Written Warning",
  final: "Final Written Warning",
  termination: "Termination",
};

const typeColors: Record<string, string> = {
  verbal: "bg-yellow-100 text-yellow-800",
  written: "bg-orange-100 text-orange-800",
  final: "bg-red-100 text-red-800",
  termination: "bg-gray-900 text-white",
};

const categoryLabels: Record<string, string> = {
  scorecard: "Scorecard / Performance",
  attendance: "Attendance",
  conduct: "Conduct",
  safety: "Safety",
  other: "Other",
};

export default function CoachingDetailModal({
  coaching,
  onClose,
  onUpdated,
}: {
  coaching: Coaching;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [signed, setSigned] = useState(!!coaching.signedAt);
  const [signedAt, setSignedAt] = useState(coaching.signedAt);
  const [sigUrl, setSigUrl] = useState(coaching.signatureUrl);
  const [showSignPad, setShowSignPad] = useState(false);

  async function submitSignature() {
    if (!signatureData) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/coachings/${coaching.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureUrl: signatureData }),
      });
      const data = await res.json();
      setSigned(true);
      setSignedAt(data.signedAt);
      setSigUrl(data.signatureUrl);
      setShowSignPad(false);
      onUpdated();
    } finally {
      setSaving(false);
    }
  }

  function print() {
    window.print();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" id="coaching-print">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200 sticky top-0 bg-white z-10 print:static">
          <div className="flex items-start gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeColors[coaching.type] ?? "bg-gray-100 text-gray-700"}`}>
                  {typeLabels[coaching.type] ?? coaching.type}
                </span>
                <span className="text-xs text-gray-500">{categoryLabels[coaching.category] ?? coaching.category}</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                {coaching.driver.firstName} {coaching.driver.lastName}
              </h2>
              <p className="text-sm text-gray-500">
                {coaching.driver.employeeId} · {format(new Date(coaching.conductedAt), "MMMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={print}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 print:hidden"
              title="Print"
            >
              <Printer size={18} />
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 print:hidden"><X size={20} /></button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Status banner */}
          {signed ? (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <CheckCircle size={18} className="text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">Signed by driver</p>
                {signedAt && (
                  <p className="text-xs text-green-600">
                    {format(new Date(signedAt), "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
              <Clock size={18} className="text-yellow-600 shrink-0" />
              <p className="text-sm font-medium text-yellow-800">Awaiting driver signature</p>
            </div>
          )}

          {/* Incident description */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h3>
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg p-4">
              {coaching.description}
            </p>
          </div>

          {/* Action plan */}
          {coaching.actionPlan && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Action Plan</h3>
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed bg-blue-50 rounded-lg p-4">
                {coaching.actionPlan}
              </p>
            </div>
          )}

          {/* Consequences notice */}
          {(coaching.type === "written" || coaching.type === "final" || coaching.type === "termination") && (
            <div className="flex gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">
                {coaching.type === "final"
                  ? "This is a final written warning. Further violations may result in termination."
                  : coaching.type === "termination"
                  ? "This document constitutes a formal notice of employment termination."
                  : "Failure to improve may result in further disciplinary action up to and including termination."}
              </p>
            </div>
          )}

          {/* Conducted by */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500">Conducted by <span className="font-medium text-gray-700">{coaching.conductedBy}</span></p>
          </div>

          {/* Signature area */}
          <div className="border-t border-gray-200 pt-5">
            {signed && sigUrl ? (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Driver Signature</p>
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sigUrl} alt="Driver signature" className="max-h-24 max-w-xs" />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Signed {signedAt ? format(new Date(signedAt), "MMM d, yyyy 'at' h:mm a") : ""}
                </p>
              </div>
            ) : showSignPad ? (
              <div className="space-y-4">
                <SignaturePad
                  onSign={(dataUrl) => setSignatureData(dataUrl)}
                  onClear={() => setSignatureData(null)}
                />
                <p className="text-xs text-gray-500">
                  By signing, the driver acknowledges they have read and understood this coaching document.
                  Signature does not necessarily indicate agreement.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowSignPad(false); setSignatureData(null); }}
                    className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitSignature}
                    disabled={!signatureData || saving}
                    className="flex-1 bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-40"
                  >
                    {saving ? "Saving..." : "Save Signature"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowSignPad(true)}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg py-4 text-sm font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                Click to capture driver signature
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
