import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const driverId = searchParams.get("driverId");
  const type = searchParams.get("type");
  const signed = searchParams.get("signed");

  const coachings = await prisma.coaching.findMany({
    where: {
      ...(driverId ? { driverId } : {}),
      ...(type ? { type } : {}),
      ...(signed === "true" ? { signedAt: { not: null } } : {}),
      ...(signed === "false" ? { signedAt: null } : {}),
    },
    include: {
      driver: {
        select: { id: true, firstName: true, lastName: true, employeeId: true, status: true },
      },
    },
    orderBy: { conductedAt: "desc" },
  });

  return NextResponse.json(coachings);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { driverId, type, category, description, actionPlan, conductedBy, conductedAt } = body;

  if (!driverId || !type || !category || !description || !conductedBy) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const coaching = await prisma.coaching.create({
    data: {
      driverId,
      type,
      category,
      description,
      actionPlan: actionPlan || null,
      conductedBy,
      conductedAt: conductedAt ? new Date(conductedAt) : new Date(),
    },
    include: {
      driver: {
        select: { id: true, firstName: true, lastName: true, employeeId: true, status: true },
      },
    },
  });

  return NextResponse.json(coaching, { status: 201 });
}
