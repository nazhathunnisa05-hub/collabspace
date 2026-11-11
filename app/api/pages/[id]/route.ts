
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/prisma";
import { requireAuth } from "../../../../src/lib/require-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Update a document
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

    const page = await prisma.page.findUnique({
      where: { id: pageId },
      select: {
        id: true,
        workspaceId: true,
        title: true,
        content: true,
      },
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

    // Only OWNER, ADMIN and EDITOR can edit documents.
    const editableRoles = ["OWNER", "ADMIN", "EDITOR"];

    if (!editableRoles.includes(membership.role)) {
      return NextResponse.json(
        {
          message: "Your workspace role does not allow document editing",
        },
        { status: 403 }
      );
    }

    const updateData: {
      title?: string;
      content?: object;
    } = {};

    if (body.title !== undefined) {
      if (typeof body.title !== "string") {
        return NextResponse.json(
          { message: "Document title must be text" },
          { status: 400 }
        );
      }

      const title = body.title.trim();

      if (!title || title.length > 150) {
        return NextResponse.json(
          { message: "Title must be between 1 and 150 characters" },
          { status: 400 }
        );
      }

      updateData.title = title;
    }

    if (body.content !== undefined) {
      if (
        body.content === null ||
        typeof body.content !== "object" ||
        Array.isArray(body.content)
      ) {
        return NextResponse.json(
          { message: "Invalid page content" },
          { status: 400 }
        );
      }

      updateData.content = body.content;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: "No changes provided" },
        { status: 400 }
      );
    }

    // Save the previous content before updating.
    if (body.content !== undefined) {
      await prisma.pageVersion.create({
        data: {
          pageId,
          userId,
          content: (page.content ?? {}) as object,
        },
      });
    }

    const updatedPage = await prisma.page.update({
      where: { id: pageId },
      data: updateData,
    });

    return NextResponse.json({
      message: "Page updated successfully",
      page: updatedPage,
    });
  } catch (error) {
    console.error("Page update error:", error);

    return NextResponse.json(
      { message: "Unable to update page" },
      { status: 500 }
    );
  }
}

// Get a document
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
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
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

return NextResponse.json({
  page,
  userRole: membership.role,
});  } catch (error) {
    console.error("Page fetch error:", error);

    return NextResponse.json(
      { message: "Unable to fetch page" },
      { status: 500 }
    );
  }
}
