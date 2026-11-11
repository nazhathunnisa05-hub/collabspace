
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../src/lib/prisma";
import { requireAuth } from "../../../../../src/lib/require-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Create a new page
export async function POST(
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

    const { id: workspaceId } = await context.params;

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
        { message: "You do not have access to this workspace" },
        { status: 403 }
      );
    }

    if (!["OWNER", "ADMIN", "EDITOR"].includes(membership.role)) {
      return NextResponse.json(
        { message: "You do not have permission to create pages" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const title = String(body.title || "").trim();

    if (!title) {
      return NextResponse.json(
        { message: "Page title is required" },
        { status: 400 }
      );
    }

    if (title.length > 150) {
      return NextResponse.json(
        { message: "Page title must be 150 characters or less" },
        { status: 400 }
      );
    }

    const page = await prisma.page.create({
      data: {
        title,
        content: body.content ?? {},
        workspaceId,
        creatorId: userId,
      },
    });

    return NextResponse.json(
      {
        message: "Page created successfully",
        page,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Page creation error:", error);

    return NextResponse.json(
      { message: "Unable to create page" },
      { status: 500 }
    );
  }
}

// Get all pages in a workspace
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

    const { id: workspaceId } = await context.params;

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
        { message: "You do not have access to this workspace" },
        { status: 403 }
      );
    }

    const pages = await prisma.page.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ pages });
  } catch (error) {
    console.error("Page fetch error:", error);

    return NextResponse.json(
      { message: "Unable to fetch pages" },
      { status: 500 }
    );
  }
}
