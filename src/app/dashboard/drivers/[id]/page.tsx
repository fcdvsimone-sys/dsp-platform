"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Phone, Mail, Briefcase, Calendar, Shield,
  TrendingUp, ClipboardList, Plus, AlertTriangle, CheckCircle, Clock,
  Pencil, Headphones, PhoneCall
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import EditDriverModal from "@/components/EditDriverModal";
import NewCoachingModal from "@/components/NewCoachingModal";
import CoachingDetailModal from "@/components/CoachingDetailModal";

type Scorecard = {
  id: string;
  weekOf: string;
  overallStanding: string | null;
  overallScore: number | null;
  speedingRate: number | null;
  seatbeltRate: number | null;
  distractionRate: number | null;
  signalViolationRate: number | null;
  followingDistanceRate: number | null;
  dcr: number | null;
  pod: number | null;
  cdfDpmo: number | null;
  packagesDelivered: number | null;
  fico: number | null;
};

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
  driver: { id: string; firstName: string; lastName: string; employeeId: string; status: string };
};

type SupportTicket = {
  id: string;
  contactDate: string;
  month: string;
  contactReason: string | null;
  driverIntent: string | null;
  totalContactTimeSecs: number;
  dnrInd: boolean;
  successfulDeliveryInd: string | null;
  successfulPackages: number;
  failedPackages: number;
};

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
  scorecards: Scorecard[];
  coachings: Omit<Coaching, "driver">[];
  _count: { coachings: number; scorecards: number };
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-yellow-100 text-yellow-700",
  terminated: "bg-red-100 text-red-700",
};

const standingColors: Record<string, string> = {
  Platinum:         "bg-violet-100 text-violet-700",
  Gold:             "bg-yellow-100 text-yellow-700",
  Silver:           "bg-gray-100 text-gray-600",
  Bronze:           "bg-orange-100 text-orange-700",
  "Below Standard": "bg-red-100 text-red-700",
};

const typeColors: Record<string, string> = {
  verbal: "bg-yellow-100 text-yellow-800",
  written: "bg-orange-100 text-orange-800",
  final: "bg-red-100 text-red-800",
  termination: "bg-gray-900 text-white",
};

const typeLabels: Record<string, string> = {
  verbal: "Verbal",
  written: "Written",
  final: "Final Warning",
  termination: "Termination",
};

const categoryLabels: Record<string, string> = {
  scorecard: "Scorecard",
  attendance: "Attendance",
  conduct: "Conduct",
  safety: "Safety",
  other: "Other",
};

function InfoCard({ icon: Icon, label, value, warn }: {
  icon: React.ElementType;
  label: string;
  value: string | null;
  warn?: boolean;
}) {
  if (!value) return null;
  return (
    <div className={`flex items-start gap-3 bg-white rounded-xl border p-4 ${warn ? "border-orange-300 bg-orange-50" : "border-gray-200"}`}>
      <Icon size={18} className={`mt-0.5 shrink-0 ${warn ? "text-orange-500" : "text-gray-400"}`} />
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className={`text-sm font-semibold mt-0.5 ${warn ? "text-orange-700" : "text-gray-800"}`}>{value}</p>
      </div>
    </div>
  );
}

export default function DriverProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showNewCoaching, setShowNewCoaching] = useState(false);
  const [selectedCoaching, setSelectedCoaching] = useState<Coaching | null>(null);
  const [tab, setTab] = useState<"scorecard" | "coaching" | "support">("scorecard");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoaded, setTicketsLoaded] = useState(false);

  async function load() {
    const res = await fetch(`/api/drivers/${id}`);
    if (!res.ok) { router.push("/dashboard/drivers"); return; }
    const data = await res.json();
    setDriver(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function loadTickets() {
    if (ticketsLoaded) return;
    const res = await fetch(`/api/support?driverId=${id}`);
    const data = await res.json();
    setTickets(data);
    setTicketsLoaded(true);
  }

  useEffect(() => {
    if (tab === "support") loadTickets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!driver) return null;

  const latestScore = driver.scorecards[0];
  const idExpDays = driver.idExpiration
    ? differenceInDays(new Date(driver.idExpiration), new Date())
    : null;
  const idExpWarn = idExpDays !== null && idExpDays <= 30;

  // Chart data — reverse so oldest is left
  const chartData = [...driver.scorecards]
    .reverse()
    .map((s) => ({
      week: format(new Date(s.weekOf), "M/d"),
      score: s.overallScore,
    }));

  // Coaching enriched with driver field for CoachingDetailModal
  function enrichCoaching(c: Omit<Coaching, "driver">): Coaching {
    return {
      ...c,
      driver: {
        id: driver!.id,
        firstName: driver!.firstName,
        lastName: driver!.lastName,
        employeeId: driver!.employeeId,
        status: driver!.status,
      },
    };
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Back */}
        <button
          onClick={() => router.push("/dashboard/drivers")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft size={16} /> Back to Drivers
        </button>

        {/* Profile header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl shrink-0">
                {driver.firstName[0]}{driver.lastName[0]}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {driver.firstName} {driver.lastName}
                  </h1>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColors[driver.status]}`}>
                    {driver.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{driver.employeeId}</p>
                {latestScore?.overallStanding && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${standingColors[latestScore.overallStanding] ?? "bg-gray-100 text-gray-600"}`}>
                      {latestScore.overallStanding}
                    </span>
                    {latestScore.overallScore && (
                      <span className="text-xs text-gray-500 font-medium">{latestScore.overallScore}</span>
                    )}
                    <span className="text-xs text-gray-400">
                      week of {format(new Date(latestScore.weekOf), "MMM d")}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEdit(true)}
                className="flex items-center gap-2 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                <Pencil size={15} /> Edit
              </button>
              <button
                onClick={() => setShowNewCoaching(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                <Plus size={15} /> New Coaching
              </button>
            </div>
          </div>

          {/* Info cards grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
            <InfoCard icon={Phone} label="Personal Phone" value={driver.phone} />
            <InfoCard icon={Phone} label="Work Phone" value={driver.workPhone} />
            <InfoCard icon={Mail} label="Email" value={driver.email} />
            <InfoCard icon={Calendar} label="Hire Date" value={driver.hireDate ? format(new Date(driver.hireDate), "MMMM d, yyyy") : null} />
            <InfoCard icon={Briefcase} label="Qualifications" value={driver.qualifications} />
            <InfoCard
              icon={Shield}
              label="ID Expiration"
              value={driver.idExpiration
                ? `${format(new Date(driver.idExpiration), "MMM d, yyyy")}${idExpDays !== null ? ` (${idExpDays < 0 ? "expired" : `${idExpDays}d`})` : ""}`
                : null}
              warn={idExpWarn}
            />
          </div>

          {/* Stats row */}
          <div className="flex gap-6 mt-6 pt-5 border-t border-gray-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{driver._count.scorecards}</p>
              <p className="text-xs text-gray-500 mt-0.5">Scorecards</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{driver._count.coachings}</p>
              <p className="text-xs text-gray-500 mt-0.5">Coachings</p>
            </div>
            {latestScore?.overallScore && (
              <div className="text-center">
                <p className={`text-2xl font-bold ${latestScore.overallScore < 85 ? "text-red-600" : latestScore.overallScore < 90 ? "text-yellow-600" : "text-green-600"}`}>
                  {latestScore.overallScore}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Latest Score</p>
              </div>
            )}
            {driver.coachings.filter((c) => !c.signedAt).length > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {driver.coachings.filter((c) => !c.signedAt).length}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Unsigned</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-white rounded-xl border border-gray-200 p-1 w-fit">
          <button
            onClick={() => setTab("scorecard")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "scorecard" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <TrendingUp size={15} /> Scorecard History
          </button>
          <button
            onClick={() => setTab("coaching")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "coaching" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <ClipboardList size={15} /> Coachings
            {driver.coachings.filter((c) => !c.signedAt).length > 0 && (
              <span className="bg-yellow-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {driver.coachings.filter((c) => !c.signedAt).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("support")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "support" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Headphones size={15} /> Support Tickets
          </button>
        </div>

        {/* Scorecard tab */}
        {tab === "scorecard" && (
          <div className="space-y-5">
            {driver.scorecards.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <TrendingUp size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">No scorecards imported yet</p>
              </div>
            ) : (
              <>
                {/* Score trend chart */}
                {chartData.some((d) => d.score !== null) && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-sm font-semibold text-gray-700 mb-4">Score Trend</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis domain={[70, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={35} />
                        <Tooltip
                          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                          formatter={(v: number) => [v, "Score"]}
                        />
                        <ReferenceLine y={90} stroke="#fbbf24" strokeDasharray="4 2" />
                        <ReferenceLine y={85} stroke="#f87171" strokeDasharray="4 2" />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="#7c3aed"
                          strokeWidth={2}
                          dot={{ r: 3, fill: "#7c3aed" }}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-2 justify-end">
                      <span className="flex items-center gap-1 text-xs text-yellow-600"><span className="w-4 border-t-2 border-dashed border-yellow-400 inline-block" />90</span>
                      <span className="flex items-center gap-1 text-xs text-red-400"><span className="w-4 border-t-2 border-dashed border-red-400 inline-block" />85</span>
                    </div>
                  </div>
                )}

                {/* Scorecard table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Week</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Standing</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Speeding</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Seatbelt</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Distraction</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">DCR</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">POD</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pkgs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {driver.scorecards.map((s, i) => (
                        <tr key={s.id} className={`${i === 0 ? "bg-violet-50/30" : "hover:bg-gray-50"}`}>
                          <td className="px-5 py-3 text-sm text-gray-700 font-medium">
                            {format(new Date(s.weekOf), "MMM d, yyyy")}
                            {i === 0 && <span className="ml-2 text-xs text-violet-500 font-normal">latest</span>}
                          </td>
                          <td className="px-4 py-3">
                            {s.overallStanding ? (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${standingColors[s.overallStanding] ?? "bg-gray-100 text-gray-600"}`}>
                                {s.overallStanding}
                              </span>
                            ) : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            {s.overallScore !== null ? (
                              <span className={s.overallScore < 85 ? "text-red-600 font-semibold" : s.overallScore < 90 ? "text-yellow-600 font-semibold" : "text-gray-700"}>
                                {s.overallScore}
                              </span>
                            ) : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700">{s.speedingRate !== null ? s.speedingRate.toFixed(2) : "—"}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700">{s.seatbeltRate !== null ? s.seatbeltRate.toFixed(2) : "—"}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700">{s.distractionRate !== null ? s.distractionRate.toFixed(2) : "—"}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700">{s.dcr !== null ? `${s.dcr}%` : "—"}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700">{s.pod !== null ? `${s.pod}%` : "—"}</td>
                          <td className="px-5 py-3 text-right text-sm text-gray-700">{s.packagesDelivered?.toLocaleString() ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Coaching tab */}
        {tab === "coaching" && (
          <div className="space-y-3">
            {driver.coachings.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <ClipboardList size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm mb-4">No coachings on record</p>
                <button
                  onClick={() => setShowNewCoaching(true)}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  <Plus size={15} /> New Coaching
                </button>
              </div>
            ) : (
              driver.coachings.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCoaching(enrichCoaching(c))}
                  className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 mt-0.5 ${typeColors[c.type] ?? "bg-gray-100 text-gray-600"}`}>
                        {typeLabels[c.type] ?? c.type}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-500">{categoryLabels[c.category] ?? c.category}</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-xs text-gray-500">{format(new Date(c.conductedAt), "MMM d, yyyy")}</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-xs text-gray-500">by {c.conductedBy}</span>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2">{c.description}</p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {c.signedAt ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                          <CheckCircle size={13} /> Signed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-yellow-600 font-medium">
                          <Clock size={13} /> Unsigned
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Support tab */}
        {tab === "support" && (
          <div className="space-y-4">
            {!ticketsLoaded ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">Loading...</div>
            ) : tickets.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Headphones size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">No driver support tickets on record</p>
                <p className="text-xs text-gray-400 mt-1">Import tickets from the Support page</p>
              </div>
            ) : (
              <>
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{tickets.length}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Total Contacts</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(tickets.reduce((a, t) => a + t.totalContactTimeSecs, 0) / 60)}m
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Total Call Time</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {tickets.reduce((a, t) => a + t.failedPackages, 0)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Failed Packages</p>
                  </div>
                </div>

                {/* Ticket list */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Time</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Intent</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Call Time</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Failed Pkgs</th>
                        <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">DNR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {tickets.map((t) => {
                        const mins = Math.floor(t.totalContactTimeSecs / 60);
                        const secs = t.totalContactTimeSecs % 60;
                        return (
                          <tr key={t.id} className="hover:bg-gray-50">
                            <td className="px-5 py-3">
                              <p className="text-sm font-medium text-gray-800">
                                {format(new Date(t.contactDate), "MMM d, yyyy")}
                              </p>
                              <p className="text-xs text-gray-400">
                                {format(new Date(t.contactDate), "h:mm a")}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              {t.contactReason ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                                  <PhoneCall size={11} /> {t.contactReason}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-sm">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{t.driverIntent || "—"}</td>
                            <td className="px-4 py-3 text-right text-sm text-gray-700">
                              {t.totalContactTimeSecs > 0
                                ? mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
                                : "—"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {t.failedPackages > 0 ? (
                                <span className="text-sm font-semibold text-red-600">{t.failedPackages}</span>
                              ) : (
                                <span className="text-sm text-gray-400">0</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-center">
                              {t.dnrInd ? (
                                <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Yes</span>
                              ) : (
                                <span className="text-xs text-gray-400">No</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {showEdit && (
        <EditDriverModal
          driver={driver}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => { setDriver((prev) => prev ? { ...prev, ...updated } : prev); }}
          onDeleted={() => router.push("/dashboard/drivers")}
        />
      )}

      {showNewCoaching && (
        <NewCoachingModal
          onClose={() => setShowNewCoaching(false)}
          onCreated={load}
          preselectedDriverId={driver.id}
        />
      )}

      {selectedCoaching && (
        <CoachingDetailModal
          coaching={selectedCoaching}
          onClose={() => setSelectedCoaching(null)}
          onUpdated={load}
        />
      )}
    </div>
  );
}
