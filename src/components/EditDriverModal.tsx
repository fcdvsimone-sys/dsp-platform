"use client";
import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  employeeId: z.string().min(1, "Required"),
  phone: z.string().optional(),
  workPhone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  status: z.enum(["active", "inactive", "terminated"]),
  hireDate: z.string().optional(),
  qualifications: z.string().optional(),
  idExpiration: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type Driver = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  workPhone: string | null;
  email: string | null;
  status: string;
  hireDate: string | null;
  qualifications: string | null;
  idExpiration: string | null;
};

export default function EditDriverModal({
  driver,
  onClose,
  onSaved,
  onDeleted,
}: {
  driver: Driver;
  onClose: () => void;
  onSaved: (updated: Driver) => void;
  onDeleted: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: driver.firstName,
      lastName: driver.lastName,
      employeeId: driver.employeeId,
      phone: driver.phone ?? "",
      workPhone: driver.workPhone ?? "",
      email: driver.email ?? "",
      status: driver.status as "active" | "inactive" | "terminated",
      hireDate: driver.hireDate ? format(new Date(driver.hireDate), "yyyy-MM-dd") : "",
      qualifications: driver.qualifications ?? "",
      idExpiration: driver.idExpiration ? format(new Date(driver.idExpiration), "yyyy-MM-dd") : "",
    },
  });

  async function onSubmit(data: FormData) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/drivers/${driver.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          phone: data.phone || null,
          workPhone: data.workPhone || null,
          email: data.email || null,
          hireDate: data.hireDate || null,
          qualifications: data.qualifications || null,
          idExpiration: data.idExpiration || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      onSaved(updated);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteDriver() {
    setSaving(true);
    try {
      await fetch(`/api/drivers/${driver.id}`, { method: "DELETE" });
      onDeleted();
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const errClass = "text-xs text-red-500 mt-1";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-900">Edit Driver</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>First Name *</label>
              <input {...register("firstName")} className={inputClass} />
              {errors.firstName && <p className={errClass}>{errors.firstName.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Last Name *</label>
              <input {...register("lastName")} className={inputClass} />
              {errors.lastName && <p className={errClass}>{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Employee ID *</label>
              <input {...register("employeeId")} className={inputClass} readOnly />
            </div>
            <div>
              <label className={labelClass}>Status *</label>
              <select {...register("status")} className={inputClass}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Personal Phone</label>
              <input {...register("phone")} type="tel" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Work Phone</label>
              <input {...register("workPhone")} type="tel" className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input {...register("email")} type="email" className={inputClass} />
            {errors.email && <p className={errClass}>{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Hire Date</label>
              <input {...register("hireDate")} type="date" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>ID Expiration</label>
              <input {...register("idExpiration")} type="date" className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Qualifications</label>
            <input {...register("qualifications")} placeholder="e.g. CDV, EDV, Step Van" className={inputClass} />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="p-2.5 border border-red-200 text-red-400 rounded-lg hover:bg-red-50 hover:text-red-600"
              title="Delete driver"
            >
              <Trash2 size={16} />
            </button>
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {confirming && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete driver?</h3>
            <p className="text-sm text-gray-600 mb-6">
              This will permanently delete <strong>{driver.firstName} {driver.lastName}</strong> and all their scorecards and coachings. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirming(false)} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={deleteDriver} disabled={saving} className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {saving ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
