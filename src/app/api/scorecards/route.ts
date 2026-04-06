import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const weekParam = searchParams.get("week");

  if (searchParams.get("weeks") === "1") {
    const weeks = await prisma.scorecard.findMany({
      select: { weekOf: true },
      distinct: ["weekOf"],
      orderBy: { weekOf: "desc" },
      take: 52,
    });
    return NextResponse.json(weeks.map((w) => w.weekOf));
  }

  const where = weekParam ? { weekOf: new Date(weekParam) } : {};

  const scorecards = await prisma.scorecard.findMany({
    where,
    include: {
      driver: {
        select: { id: true, firstName: true, lastName: true, employeeId: true, status: true },
      },
    },
    orderBy: [{ overallScore: "asc" }, { driver: { lastName: "asc" } }],
  });

  return NextResponse.json(scorecards);
}
