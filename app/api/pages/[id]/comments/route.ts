
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../src/lib/prisma";
import { requireAuth } from "../../../../../src/lib/require-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Create a comment
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

    // VIEWER members cannot post comments
    if (membership.role === "VIEWER") {
      return NextResponse.json(
        { message: "Your role does not allow posting comments" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const content = String(body.content || "").trim();

    if (!content) {
      return NextResponse.json(
        { message: "Comment cannot be empty" },
        { status: 400 }
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { message: "Comment must be 2000 characters or less" },
        { status: 400 }
      );
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        pageId,
        userId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Comment added successfully",
        comment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Comment creation error:", error);

    return NextResponse.json(
      { message: "Unable to add comment" },
      { status: 500 }
    );
  }
}

// Get all comments for a page
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

    const comments = await prisma.comment.findMany({
      where: { pageId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Comment fetch error:", error);

    return NextResponse.json(
      { message: "Unable to fetch comments" },
      { status: 500 }
    );
  }
}
