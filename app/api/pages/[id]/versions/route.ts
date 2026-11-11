import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../src/lib/prisma";
import { requireAuth } from "../../../../../src/lib/require-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { userId, error } = requireAuth(request);

    if (error || !userId) {
      return error ?? NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: pageId } = await context.params;

    const page = await prisma.page.findUnique({
      where: { id: pageId },
      select: { workspaceId: true },
    });

    if (!page) {
      return NextResponse.json(
        { message: "Page not found" },
        { status: 404 }
      );
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: page.workspaceId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { message: "You do not have access to this page" },
        { status: 403 }
      );
    }

    const versions = await prisma.pageVersion.findMany({
      where: { pageId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ versions });
  } catch (error) {
    console.error("Version history error:", error);

    return NextResponse.json(
      { message: "Unable to fetch version history" },
      { status: 500 }
    );
  }
}
// Restore a previous document version
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { userId, error } = requireAuth(request);

    if (error || !userId) {
      return error ?? NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: pageId } = await context.params;
    const body = await request.json();
    const { versionId } = body;

    if (!versionId) {
      return NextResponse.json(
        { message: "Version ID is required" },
        { status: 400 }
      );
    }

    const page = await prisma.page.findUnique({
      where: { id: pageId },
    });

    if (!page) {
      return NextResponse.json(
        { message: "Page not found" },
        { status: 404 }
      );
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: page.workspaceId,
        },
      },
    });

    if (
      !membership ||
      !["OWNER", "ADMIN", "EDITOR"].includes(membership.role)
    ) {
      return NextResponse.json(
        { message: "You do not have permission to restore this version" },
        { status: 403 }
      );
    }

    const version = await prisma.pageVersion.findFirst({
      where: {
        id: versionId,
        pageId,
      },
    });

    if (!version) {
      return NextResponse.json(
        { message: "Version not found" },
        { status: 404 }
      );
    }

    // Save the current content before restoring
    await prisma.pageVersion.create({
      data: {
        pageId,
        userId,
        content: (page.content ?? {}) as object,
      },
    });

    // Restore the selected version
    const updatedPage = await prisma.page.update({
      where: { id: pageId },
      data: {
        content: version.content as object,
      },
    });

    return NextResponse.json({
      message: "Document version restored successfully",
      page: updatedPage,
    });
  } catch (error) {
    console.error("Version restore error:", error);

    return NextResponse.json(
      { message: "Unable to restore document version" },
      { status: 500 }
    );
  }
}