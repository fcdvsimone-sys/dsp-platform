import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfWeek, subWeeks, format } from "date-fns";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Latest scorecard week in DB
  const latestWeekRow = await prisma.scorecard.findFirst({
    orderBy: { weekOf: "desc" },
    select: { weekOf: true },
  });
  const latestWeek = latestWeekRow?.weekOf ?? new Date();

  // 12 most recent distinct weeks
  const weekRows = await prisma.scorecard.findMany({
    select: { weekOf: true },
    distinct: ["weekOf"],
    orderBy: { weekOf: "desc" },
    take: 12,
  });
  const weeks = weekRows.map((r) => r.weekOf).reverse(); // oldest → newest

  // KPIs
  const [activeDrivers, unsignedCoachings, latestWeekScores] = await Promise.all([
    prisma.driver.count({ where: { status: "active" } }),
    prisma.coaching.count({ where: { signedAt: null } }),
    prisma.scorecard.findMany({
      where: { weekOf: latestWeek },
      select: { overallScore: true, fico: true, driverId: true },
    }),
  ]);

  const atRiskCount = latestWeekScores.filter(
    (s) => s.overallScore === "Fair" || s.overallScore === "Poor"
  ).length;

  const ficoScores = latestWeekScores.map((s) => s.fico).filter((f): f is number => f !== null);
  const avgFico = ficoScores.length
    ? Math.round(ficoScores.reduce((a, b) => a + b, 0) / ficoScores.length)
    : null;

  // FICO trend per week
  const allScorecards = await prisma.scorecard.findMany({
    where: { weekOf: { in: weeks } },
    select: { weekOf: true, fico: true, overallScore: true },
  });

  const ficoTrend = weeks.map((week) => {
    const ws = allScorecards.filter(
      (s) => s.weekOf.getTime() === week.getTime()
    );
    const ficos = ws.map((s) => s.fico).filter((f): f is number => f !== null);
    return {
      week: format(week, "M/d"),
      avgFico: ficos.length
        ? Math.round(ficos.reduce((a, b) => a + b, 0) / ficos.length)
        : null,
    };
  });

  // Score tier breakdown per week (stacked bar)
  const tierBreakdown = weeks.map((week) => {
    const ws = allScorecards.filter(
      (s) => s.weekOf.getTime() === week.getTime()
    );
    return {
      week: format(week, "M/d"),
      Fantastic: ws.filter((s) => s.overallScore === "Fantastic").length,
      Great: ws.filter((s) => s.overallScore === "Great").length,
      Fair: ws.filter((s) => s.overallScore === "Fair").length,
      Poor: ws.filter((s) => s.overallScore === "Poor").length,
    };
  });

  // At-risk drivers (Fair/Poor latest week) with driver info
  const atRiskDrivers = await prisma.scorecard.findMany({
    where: {
      weekOf: latestWeek,
      overallScore: { in: ["Fair", "Poor"] },
    },
    include: {
      driver: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
    },
    orderBy: { overallScore: "asc" }, // Poor first
  });

  // Unsigned coachings with driver
  const unsignedList = await prisma.coaching.findMany({
    where: { signedAt: null },
    include: {
      driver: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
    },
    orderBy: { conductedAt: "asc" },
    take: 10,
  });

  // Coaching counts by type (all time)
  const coachingCounts = await prisma.coaching.groupBy({
    by: ["type"],
    _count: { id: true },
  });
  const coachingByType = Object.fromEntries(
    coachingCounts.map((c) => [c.type, c._count.id])
  );

  // Fleet avg metrics for latest week
  const metricAvgs = (() => {
    const valid = (arr: (number | null)[]) => arr.filter((n): n is number => n !== null);
    const mean = (arr: number[]) =>
      arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

    const all = latestWeekScores as unknown as {
      fico: number | null;
    }[];

    // Need full metrics — re-fetch
    return null; // handled separately below
  })();

  const fullLatest = await prisma.scorecard.findMany({
    where: { weekOf: latestWeek },
    select: {
      fico: true, seatbelt: true, distraction: true, speeding: true,
      deliveryCompletion: true, photoOnDelivery: true,
    },
  });

  function avg(arr: (number | null)[]) {
    const v = arr.filter((n): n is number => n !== null);
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
  }

  const fleetAvgs = {
    fico: avg(fullLatest.map((s) => s.fico)),
    seatbelt: avg(fullLatest.map((s) => s.seatbelt)),
    distraction: avg(fullLatest.map((s) => s.distraction)),
    speeding: avg(fullLatest.map((s) => s.speeding)),
    deliveryCompletion: avg(fullLatest.map((s) => s.deliveryCompletion)),
    photoOnDelivery: avg(fullLatest.map((s) => s.photoOnDelivery)),
  };

  return NextResponse.json({
    kpis: { activeDrivers, atRiskCount, unsignedCoachings, avgFico },
    ficoTrend,
    tierBreakdown,
    atRiskDrivers: atRiskDrivers.map((s) => ({
      driverId: s.driver.id,
      name: `${s.driver.firstName} ${s.driver.lastName}`,
      employeeId: s.driver.employeeId,
      overallScore: s.overallScore,
      fico: s.fico,
      seatbelt: s.seatbelt,
      distraction: s.distraction,
      speeding: s.speeding,
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
    totalDrivers: activeDrivers,
  });
}
