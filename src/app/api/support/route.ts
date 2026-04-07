import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const driverId = searchParams.get("driverId");
  const month = searchParams.get("month");
  const summary = searchParams.get("summary");

  // Dashboard summary: totals + top reasons + top drivers by contact count
  if (summary === "1") {
    const [total, totalTimeSecs, byReason, byDriver, recentTickets] = await Promise.all([
      prisma.supportTicket.count({ where: driverId ? { driverId } : {} }),
      prisma.supportTicket.aggregate({
        _sum: { totalContactTimeSecs: true },
        where: driverId ? { driverId } : {},
      }),
      prisma.supportTicket.groupBy({
        by: ["contactReason"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
      prisma.supportTicket.groupBy({
        by: ["driverId", "transporterId"],
        _count: { id: true },
        _sum: { totalContactTimeSecs: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
        where: { driverId: { not: null } },
      }),
      prisma.supportTicket.findMany({
        orderBy: { contactDate: "desc" },
        take: 10,
        include: {
          driver: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
        },
      }),
    ]);

    // Enrich byDriver with driver names
    const driverIds = byDriver.map((r) => r.driverId).filter(Boolean) as string[];
    const drivers = await prisma.driver.findMany({
      where: { id: { in: driverIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const driverNameMap = new Map(drivers.map((d) => [d.id, `${d.firstName} ${d.lastName}`]));

    return NextResponse.json({
      total,
      totalTimeSecs: totalTimeSecs._sum.totalContactTimeSecs ?? 0,
      byReason: byReason.map((r) => ({ reason: r.contactReason ?? "Unknown", count: r._count.id })),
      byDriver: byDriver.map((r) => ({
        driverId: r.driverId,
        name: r.driverId ? driverNameMap.get(r.driverId) ?? r.transporterId : r.transporterId,
        count: r._count.id,
        totalSecs: r._sum.totalContactTimeSecs ?? 0,
      })),
      recentTickets,
    });
  }

  const tickets = await prisma.supportTicket.findMany({
    where: {
      ...(driverId ? { driverId } : {}),
      ...(month ? { month } : {}),
    },
    include: {
      driver: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
    },
    orderBy: { contactDate: "desc" },
  });

  return NextResponse.json(tickets);
}
