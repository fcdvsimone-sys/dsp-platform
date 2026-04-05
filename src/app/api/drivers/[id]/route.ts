import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateDriverSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  workPhone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  status: z.enum(["active", "inactive", "terminated"]).optional(),
  hireDate: z.string().optional().nullable(),
  qualifications: z.string().optional().nullable(),
  idExpiration: z.string().optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const driver = await prisma.driver.findUnique({
    where: { id },
    include: {
      scorecards: { orderBy: { weekOf: "desc" }, take: 20 },
      coachings: {
        orderBy: { conductedAt: "desc" },
        select: {
          id: true, type: true, category: true, description: true,
          actionPlan: true, conductedBy: true, conductedAt: true,
          signedAt: true, signatureUrl: true,
        },
      },
      _count: { select: { coachings: true, scorecards: true } },
    },
  });

  if (!driver) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(driver);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateDriverSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const driver = await prisma.driver.update({
    where: { id },
    data: {
      ...parsed.data,
      hireDate: parsed.data.hireDate ? new Date(parsed.data.hireDate) : parsed.data.hireDate === null ? null : undefined,
      idExpiration: parsed.data.idExpiration ? new Date(parsed.data.idExpiration) : parsed.data.idExpiration === null ? null : undefined,
    },
  });

  return NextResponse.json(driver);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.driver.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
