import "dotenv/config";

import { Server } from "@hocuspocus/server";
import { Redis } from "@hocuspocus/extension-redis";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

import {
  applyUpdate,
  encodeStateAsUpdate,
} from "yjs";

import {
  prosemirrorJSONToYDoc,
  yDocToProsemirrorJSON,
} from "y-prosemirror";

import { prisma } from "../src/lib/prisma";
import { verifyToken } from "../src/lib/auth";

const schema = getSchema([StarterKit]);

const server = new Server({
  port: 1235,
   extensions: [
    new Redis({
      host: "127.0.0.1",
      port: 6379,
      prefix: "collabspace",
    }),
  ],

  async onAuthenticate({
    token,
    documentName,
    connectionConfig,
  }) {
    if (!token) {
      throw new Error("Authentication required");
    }

    const { userId } = verifyToken(token);

    if (!documentName.startsWith("page-")) {
      throw new Error("Invalid document");
    }

    const pageId = documentName.replace("page-", "");

    const page = await prisma.page.findUnique({
      where: { id: pageId },
      include: {
        workspace: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!page) {
      throw new Error("Page not found");
    }

    const membership = page.workspace.members.find(
      (member) => member.userId === userId
    );

    if (
      page.workspace.ownerId !== userId &&
      !membership
    ) {
      throw new Error("You are not a workspace member");
    }

    const role =
      page.workspace.ownerId === userId
        ? "OWNER"
        : membership!.role;

    const canEdit = [
      "OWNER",
      "ADMIN",
      "EDITOR",
    ].includes(role);

    connectionConfig.readOnly = !canEdit;

    return {
      userId,
      pageId,
      role,
    };
  },

  // Load the saved Yjs document from PostgreSQL.
  async onLoadDocument({ document, documentName }) {
    const pageId = documentName.replace("page-", "");

    const page = await prisma.page.findUnique({
      where: { id: pageId },
    });

    if (!page) {
      throw new Error("Page not found");
    }

    if (page.collaborationState) {
      applyUpdate(
        document,
        new Uint8Array(page.collaborationState)
      );
    } else {
      // Import existing editor content for the first time.
      const initialContent = page.content ?? {
        type: "doc",
        content: [],
      };

      const initialDoc = prosemirrorJSONToYDoc(
        schema,
        initialContent,
        "default"
      );

      applyUpdate(
        document,
        encodeStateAsUpdate(initialDoc)
      );

      initialDoc.destroy();
    }

    return document;
  },

  // Save collaborative document changes to PostgreSQL.
  async onStoreDocument({
    document,
    documentName,
    lastContext,
  }) {
    const pageId = documentName.replace("page-", "");

    const page = await prisma.page.findUnique({
      where: { id: pageId },
    });

    if (!page) {
      console.error("Cannot save: page not found", pageId);
      return;
    }

    const content = yDocToProsemirrorJSON(
      document,
      "default"
    );

    const collaborationState = Buffer.from(
      encodeStateAsUpdate(document)
    );

    const contentChanged =
      JSON.stringify(page.content ?? {}) !==
      JSON.stringify(content);

    await prisma.$transaction(async (tx) => {
      if (contentChanged) {
        await tx.pageVersion.create({
          data: {
            pageId,
            userId: lastContext?.userId ?? page.creatorId,
            content: (page.content ?? {}) as object,
          },
        });
      }

      await tx.page.update({
        where: { id: pageId },
        data: {
          content,
          collaborationState,
        },
      });
    });

    console.log(`Saved collaborative document: ${pageId}`);
  },

  async onDisconnect({ documentName }) {
    console.log(`Disconnected: ${documentName}`);
  },
});

server.listen().then(() => {
  console.log(
    "CollabSpace Hocuspocus server running on port 1234"
  );
});