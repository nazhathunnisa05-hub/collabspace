
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../src/lib/prisma";
import { requireAuth } from "../../../../../src/lib/require-auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET: View workspace members
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { userId, error } = requireAuth(request);

    if (error || !userId) {
      return error ?? NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: workspaceId } = await params;

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { message: "You are not a member of this workspace" },
        { status: 403 }
      );
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ members }, { status: 200 });
  } catch (error) {
    console.error("Get members error:", error);
    return NextResponse.json(
      { message: "Failed to fetch members" },
      { status: 500 }
    );
  }
}

// POST: Add an existing registered user by email
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { userId, error } = requireAuth(request);

    if (error || !userId) {
      return error ?? NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: workspaceId } = await params;

    const currentMember = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!currentMember ||
        !["OWNER", "ADMIN"].includes(currentMember.role)) {
      return NextResponse.json(
        { message: "Only owners and admins can add members" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { message: "No registered user found with this email" },
        { status: 404 }
      );
    }

    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { message: "User is already a workspace member" },
        { status: 409 }
      );
    }

    const member = await prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId,
        role: "VIEWER",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      { message: "Member added successfully", member },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add member error:", error);
    return NextResponse.json(
      { message: "Failed to add member" },
      { status: 500 }
    );
  }
}
