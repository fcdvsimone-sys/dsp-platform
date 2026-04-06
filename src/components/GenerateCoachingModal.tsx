"use client";
import { useState, useEffect } from "react";
import { X, Sparkles, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";

type Driver = {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
};

type Scorecard = {
  id: string;
  weekOf: string;
  overallStanding: string | null;
  overallScore: number | null;
};

const typeLabels: Record<string, string> = {
  verbal: "Verbal Warning",
  written: "Written Warning",
  final: "Final Written Warning",
  termination: "Termination",
};

const standingColors: Record<string, string> = {
  Silver: "text-gray-600 bg-gray-100",
  Bronze: "text-orange-700 bg-orange-100",
  "Below Standard": "text-red-700 bg-red-100",
};

export default function GenerateCoachingModal({
  driver,
  scorecard,
  onClose,
  onCreated,
}: {
  driver: Driver;
  scorecard: Scorecard;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState<"generating" | "review" | "saving" | "done">("generating");
  const [description, setDescription] = useState("");
  const [actionPlan, setActionPlan] = useState("");
  const [type, setType] = useState("verbal");
  const [conductedBy, setConductedBy] = useState("");
  const [conductedAt, setConductedAt] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [error, setError] = useState("");

  // Auto-generate on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { generate(); }, []);

  async function generate() {
    setStep("generating");
    setError("");
    try {
      const res = await fetch("/api/coachings/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: driver.id, scorecardId: scorecard.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setDescription(data.description ?? "");
      setActionPlan(data.actionPlan ?? "");
      setType(data.suggestedType ?? "verbal");
      setStep("review");
    } catch (e) {
      setError(String(e));
      setStep("review");
    }
  }

  async function save() {
    if (!conductedBy.trim()) {
      setError("Please enter your name in the Conducted By field.");
      return;
    }
    setStep("saving");
    setError("");
    try {
      const res = await fetch("/api/coachings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: driver.id,
          type,
          category: "scorecard",
          description,
          actionPlan,
          conductedBy,
          conductedAt,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStep("done");
      setTimeout(() => {
        onCreated();
        onClose();
      }, 1200);
    } catch (e) {
      setError(String(e));
      setStep("review");
    }
  }

  const standingColor = standingColors[scorecard.overallStanding ?? ""] ?? "text-gray-600 bg-gray-100";
  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI-Generated Coaching Note</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {driver.firstName} {driver.lastName} &middot; Week of {format(new Date(scorecard.weekOf), "MMM d, yyyy")}
                {scorecard.overallStanding && (
                  <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${standingColor}`}>
                    {scorecard.overallStanding}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-1"><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {step === "generating" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 size={36} className="text-purple-500 animate-spin" />
              <p className="text-gray-600 font-medium">Analyzing scorecard data and generating coaching note...</p>
              <p className="text-xs text-gray-400">This usually takes 5–10 seconds</p>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <CheckCircle size={36} className="text-green-500" />
              <p className="text-gray-800 font-semibold text-lg">Coaching session created!</p>
            </div>
          )}

          {(step === "review" || step === "saving") && (
            <>
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 text-sm text-purple-700">
                <strong>Review before saving.</strong> The AI-generated content below is a starting point — edit freely before creating the coaching record.
              </div>

              {/* Coaching type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coaching Type *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className={inputClass}
                >
                  {Object.entries(typeLabels).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Description *</label>
                  <button
                    onClick={generate}
                    className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
                  >
                    <Sparkles size={12} /> Regenerate
                  </button>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={7}
                  className={`${inputClass} resize-y`}
                />
              </div>

              {/* Action Plan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action Plan</label>
                <textarea
                  value={actionPlan}
                  onChange={(e) => setActionPlan(e.target.value)}
                  rows={6}
                  className={`${inputClass} resize-y`}
                />
              </div>

              {/* Conducted by + Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conducted By *</label>
                  <input
                    type="text"
                    value={conductedBy}
                    onChange={(e) => setConductedBy(e.target.value)}
                    placeholder="Your name"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date &amp; Time *</label>
                  <input
                    type="datetime-local"
                    value={conductedAt}
                    onChange={(e) => setConductedAt(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={step === "saving" || !description.trim()}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {step === "saving" ? (
                    <><Loader2 size={16} className="animate-spin" /> Saving...</>
                  ) : (
                    "Create Coaching Record"
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
