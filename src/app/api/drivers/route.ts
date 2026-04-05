import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createDriverSchema = z.object({
  employeeId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  hireDate: z.string().optional(),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const drivers = await prisma.driver.findMany({
    orderBy: [{ status: "asc" }, { lastName: "asc" }],
    include: {
      _count: { select: { coachings: true } },
      scorecards: { orderBy: { weekOf: "desc" }, take: 1 },
    },
  });

  return NextResponse.json(drivers);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createDriverSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const driver = await prisma.driver.create({
    data: {
      ...parsed.data,
      hireDate: parsed.data.hireDate ? new Date(parsed.data.hireDate) : null,
    },
  });

  return NextResponse.json(driver, { status: 201 });
}
