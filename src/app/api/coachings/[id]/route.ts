import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const coaching = await prisma.coaching.findUnique({
    where: { id },
    include: {
      driver: {
        select: { id: true, firstName: true, lastName: true, employeeId: true, status: true },
      },
    },
  });

  if (!coaching) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(coaching);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const coaching = await prisma.coaching.update({
    where: { id },
    data: body,
    include: {
      driver: {
        select: { id: true, firstName: true, lastName: true, employeeId: true, status: true },
      },
    },
  });

  return NextResponse.json(coaching);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.coaching.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
