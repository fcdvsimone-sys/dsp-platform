import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

const AT_RISK = ["Silver", "Bronze", "Below Standard"];

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const latestWeekRow = await prisma.scorecard.findFirst({
    orderBy: { weekOf: "desc" },
    select: { weekOf: true },
  });
  const latestWeek = latestWeekRow?.weekOf ?? null;

  const weekRows = await prisma.scorecard.findMany({
    select: { weekOf: true },
    distinct: ["weekOf"],
    orderBy: { weekOf: "desc" },
    take: 12,
  });
  const weeks = weekRows.map((r) => r.weekOf).reverse();

  const [activeDrivers, unsignedCoachings] = await Promise.all([
    prisma.driver.count({ where: { status: "active" } }),
    prisma.coaching.count({ where: { signedAt: null } }),
  ]);

  const allScorecards = weeks.length
    ? await prisma.scorecard.findMany({
        where: { weekOf: { in: weeks } },
        select: {
          weekOf: true, overallStanding: true, overallScore: true,
          dcr: true, pod: true, speedingRate: true, seatbeltRate: true,
          distractionRate: true, signalViolationRate: true, followingDistanceRate: true,
          fico: true,
        },
      })
    : [];

  const latestWeekScores = latestWeek
    ? allScorecards.filter((s) => s.weekOf.getTime() === latestWeek.getTime())
    : [];

  const atRiskCount = latestWeekScores.filter(
    (s) => s.overallStanding && AT_RISK.includes(s.overallStanding)
  ).length;

  function avg(arr: (number | null)[]) {
    const v = arr.filter((n): n is number => n !== null);
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
  }

  // Avg Overall Score (numeric) as fleet health proxy
  const avgScore = avg(latestWeekScores.map((s) => s.overallScore));

  // Score trend per week
  const scoreTrend = weeks.map((week) => {
    const ws = allScorecards.filter((s) => s.weekOf.getTime() === week.getTime());
    return {
      week: format(week, "M/d"),
      avgScore: avg(ws.map((s) => s.overallScore)),
    };
  });

  // Tier breakdown per week
  const tiers = ["Platinum", "Gold", "Silver", "Bronze"];
  const tierBreakdown = weeks.map((week) => {
    const ws = allScorecards.filter((s) => s.weekOf.getTime() === week.getTime());
    const row: Record<string, unknown> = { week: format(week, "M/d") };
    for (const t of tiers) row[t] = ws.filter((s) => s.overallStanding === t).length;
    return row;
  });

  // At-risk drivers for latest week
  const atRiskDrivers = latestWeek
    ? await prisma.scorecard.findMany({
        where: { weekOf: latestWeek, overallStanding: { in: AT_RISK } },
        include: {
          driver: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
        },
        orderBy: { overallScore: "asc" },
      })
    : [];

  // Unsigned coachings
  const unsignedList = await prisma.coaching.findMany({
    where: { signedAt: null },
    include: {
      driver: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
    },
    orderBy: { conductedAt: "asc" },
    take: 10,
  });

  const coachingCounts = await prisma.coaching.groupBy({
    by: ["type"],
    _count: { id: true },
  });
  const coachingByType = Object.fromEntries(
    coachingCounts.map((c) => [c.type, c._count.id])
  );

  // Fleet averages latest week
  const fleetAvgs = {
    dcr: avg(latestWeekScores.map((s) => s.dcr)),
    pod: avg(latestWeekScores.map((s) => s.pod)),
    speedingRate: avg(latestWeekScores.map((s) => s.speedingRate)),
    seatbeltRate: avg(latestWeekScores.map((s) => s.seatbeltRate)),
    distractionRate: avg(latestWeekScores.map((s) => s.distractionRate)),
    signalViolationRate: avg(latestWeekScores.map((s) => s.signalViolationRate)),
  };

  return NextResponse.json({
    kpis: { activeDrivers, atRiskCount, unsignedCoachings, avgScore },
    scoreTrend,
    tierBreakdown,
    atRiskDrivers: atRiskDrivers.map((s) => ({
      driverId: s.driver.id,
      name: `${s.driver.firstName} ${s.driver.lastName}`,
      employeeId: s.driver.employeeId,
      overallStanding: s.overallStanding,
      overallScore: s.overallScore,
      dcr: s.dcr,
      pod: s.pod,
      speedingRate: s.speedingRate,
      seatbeltRate: s.seatbeltRate,
    })),
    unsignedList: unsignedList.map((c) => ({
      id: c.id,
      driverId: c.driver.id,
      name: `${c.driver.firstName} ${c.driver.lastName}`,
      employeeId: c.driver.employeeId,
      type: c.type,
      category: c.category,
      conductedAt: c.conductedAt,
    })),
    coachingByType,
    fleetAvgs,
    latestWeek,
  });
}
