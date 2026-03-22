import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">DSP Operations</h1>
        <p className="text-gray-500 mb-8">Welcome back. Here's your compliance overview.</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: "Active Drivers", value: "—", color: "blue" },
            { label: "At-Risk This Week", value: "—", color: "red" },
            { label: "Pending Coachings", value: "—", color: "yellow" },
            { label: "Avg FICO Score", value: "—", color: "green" },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
