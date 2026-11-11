
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../src/lib/prisma";
import { requireAuth } from "../../../../../../src/lib/require-auth";

type RouteContext = {
  params: Promise<{
    id: string;
    memberId: string;
  }>;
};

// PATCH: Change member role
export async function PATCH(
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

    const { id: workspaceId, memberId } = await params;

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
        { message: "Only owners and admins can change roles" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const allowedRoles = ["ADMIN", "EDITOR", "COMMENTER", "VIEWER"];

    if (!allowedRoles.includes(body.role)) {
      return NextResponse.json(
        { message: "Invalid member role" },
        { status: 400 }
      );
    }

    const targetMember = await prisma.workspaceMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.workspaceId !== workspaceId) {
      return NextResponse.json(
        { message: "Workspace member not found" },
        { status: 404 }
      );
    }

    if (targetMember.role === "OWNER") {
      return NextResponse.json(
        { message: "The owner role cannot be changed here" },
        { status: 403 }
      );
    }

    if (
      currentMember.role === "ADMIN" &&
      body.role === "ADMIN" &&
      targetMember.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { message: "Only the owner can promote another admin" },
        { status: 403 }
      );
    }

    const updatedMember = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role: body.role },
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

    return NextResponse.json({
      message: "Member role updated successfully",
      member: updatedMember,
    });
  } catch (error) {
    console.error("Update member role error:", error);
    return NextResponse.json(
      { message: "Failed to update member role" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a member
export async function DELETE(
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

    const { id: workspaceId, memberId } = await params;

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
        { message: "Only owners and admins can remove members" },
        { status: 403 }
      );
    }

    const targetMember = await prisma.workspaceMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.workspaceId !== workspaceId) {
      return NextResponse.json(
        { message: "Workspace member not found" },
        { status: 404 }
      );
    }

    if (targetMember.role === "OWNER") {
      return NextResponse.json(
        { message: "The workspace owner cannot be removed" },
        { status: 403 }
      );
    }

    if (currentMember.role === "ADMIN" &&
        targetMember.role === "ADMIN") {
      return NextResponse.json(
        { message: "Admins cannot remove other admins" },
        { status: 403 }
      );
    }

    await prisma.workspaceMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({
      message: "Member removed successfully",
    });
  } catch (error) {
    console.error("Remove member error:", error);
    return NextResponse.json(
      { message: "Failed to remove member" },
      { status: 500 }
    );
  }
}
