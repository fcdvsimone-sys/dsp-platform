"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

const schema = z.object({
  driverId: z.string().min(1, "Select a driver"),
  type: z.enum(["verbal", "written", "final", "termination"]),
  category: z.enum(["scorecard", "attendance", "conduct", "safety", "other"]),
  description: z.string().min(10, "Description must be at least 10 characters"),
  actionPlan: z.string().optional(),
  conductedBy: z.string().min(2, "Required"),
  conductedAt: z.string().min(1, "Required"),
});

type FormData = z.infer<typeof schema>;

type Driver = { id: string; firstName: string; lastName: string; employeeId: string; status: string };

const typeLabels: Record<string, string> = {
  verbal: "Verbal Warning",
  written: "Written Warning",
  final: "Final Written Warning",
  termination: "Termination",
};

const categoryLabels: Record<string, string> = {
  scorecard: "Scorecard / Performance",
  attendance: "Attendance",
  conduct: "Conduct",
  safety: "Safety",
  other: "Other",
};

export default function NewCoachingModal({
  onClose,
  onCreated,
  preselectedDriverId,
}: {
  onClose: () => void;
  onCreated: () => void;
  preselectedDriverId?: string;
}) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      driverId: preselectedDriverId ?? "",
      type: "verbal",
      category: "scorecard",
      conductedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    },
  });

  useEffect(() => {
    fetch("/api/drivers")
      .then((r) => r.json())
      .then((data: Driver[]) => setDrivers(data.filter((d) => d.status === "active")));
  }, []);

  async function onSubmit(data: FormData) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/coachings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      onCreated();
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const errorClass = "text-xs text-red-500 mt-1";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">New Coaching Session</h2>
            <p className="text-sm text-gray-500 mt-0.5">Document the coaching and action plan</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Driver */}
          <div>
            <label className={labelClass}>Driver *</label>
            <select {...register("driverId")} className={inputClass}>
              <option value="">Select a driver...</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.firstName} {d.lastName} — {d.employeeId}
                </option>
              ))}
            </select>
            {errors.driverId && <p className={errorClass}>{errors.driverId.message}</p>}
          </div>

          {/* Type + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Type *</label>
              <select {...register("type")} className={inputClass}>
                {Object.entries(typeLabels).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              {errors.type && <p className={errorClass}>{errors.type.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Category *</label>
              <select {...register("category")} className={inputClass}>
                {Object.entries(categoryLabels).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              {errors.category && <p className={errorClass}>{errors.category.message}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description *</label>
            <textarea
              {...register("description")}
              rows={4}
              placeholder="Describe the performance issue, incident, or behavior being addressed..."
              className={`${inputClass} resize-none`}
            />
            {errors.description && <p className={errorClass}>{errors.description.message}</p>}
          </div>

          {/* Action Plan */}
          <div>
            <label className={labelClass}>Action Plan <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              {...register("actionPlan")}
              rows={3}
              placeholder="Steps the driver must take to improve, timeline, expectations..."
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Conducted by + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Conducted By *</label>
              <input
                {...register("conductedBy")}
                type="text"
                placeholder="Your name"
                className={inputClass}
              />
              {errors.conductedBy && <p className={errorClass}>{errors.conductedBy.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Date &amp; Time *</label>
              <input
                {...register("conductedAt")}
                type="datetime-local"
                className={inputClass}
              />
              {errors.conductedAt && <p className={errorClass}>{errors.conductedAt.message}</p>}
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Create Coaching"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
