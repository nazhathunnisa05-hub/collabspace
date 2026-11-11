"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import { HocuspocusProvider } from "@hocuspocus/provider";
import type { Doc } from "yjs";

interface PageEditorProps {
  pageId: string;
  initialContent?: object | null;
  onSave: (content: object) => Promise<void>;
  editable?: boolean;
  userName?: string;
}

export default function PageEditor({
  pageId,
  initialContent,
  onSave,
  editable = true,
  userName = "Collaborator",
}: PageEditorProps) {
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) return;

    const newProvider = new HocuspocusProvider({
      url: "ws://localhost:1234",
      name: `page-${pageId}`,
      token,
    });

newProvider.on("status", ({ status }: { status: string }) => {
        setConnected(status === "connected");
    });

    newProvider.on("synced", () => {
      setConnected(true);
    });

    newProvider.awareness?.setLocalStateField("user", {
      name: userName,
      color: "#7c3aed",
    });

    setProvider(newProvider);

    return () => {
      newProvider.destroy();
      setProvider(null);
    };
  }, [pageId, userName]);

  const editor = useEditor(
    {
      extensions: provider
        ? [
            StarterKit.configure({
              undoRedo: false,
            }),
            Collaboration.configure({
              document: provider.document as Doc,
            }),
            CollaborationCaret.configure({
              provider,
              user: {
                name: userName,
                color: "#7c3aed",
              },
              render: (user) => {
                const element = document.createElement("span");
                element.classList.add("collaboration-caret");
                element.style.borderLeft = "2px solid #7c3aed";
                element.style.marginLeft = "-1px";
                element.style.marginRight = "-1px";
                element.style.position = "relative";

                const label = document.createElement("span");
                label.classList.add("collaboration-caret-label");
                label.style.position = "absolute";
                label.style.top = "-1.5em";
                label.style.left = "-1px";
                label.style.backgroundColor = "#7c3aed";
                label.style.color = "white";
                label.style.padding = "2px 5px";
                label.style.borderRadius = "4px";
                label.style.fontSize = "11px";
                label.style.whiteSpace = "nowrap";
                label.textContent = user.name || "Collaborator";

                element.appendChild(label);
                return element;
              },
              selectionRender: () => ({
                class: "collaboration-selection",
                style: "background-color: rgba(124, 58, 237, 0.15)",
              }),
            }),
          ]
        : [StarterKit],
      content: provider ? undefined : initialContent || {
        type: "doc",
        content: [],
      },
      editable,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class:
            "prose prose-slate max-w-none min-h-[400px] p-5 focus:outline-none",
        },
      },
    },
    [provider]
  );

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  if (!provider) {
    return (
      <p className="p-5 text-slate-500">
        Connecting to collaborative editor...
      </p>
    );
  }

  if (!editor) {
    return <p className="p-5 text-slate-500">Loading editor...</p>;
  }

  async function saveContent() {
    if (!editor || !editable) return;
    await onSave(editor.getJSON());
  }

  const toolbarButton =
    "rounded-md border px-3 py-2 text-sm hover:bg-indigo-50";

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-2">
        <span className="text-sm text-slate-600">
          {connected ? "🟢 Live collaboration connected" : "🟡 Connecting..."}
        </span>
      </div>

      {editable ? (
        <div className="flex flex-wrap gap-2 border-b bg-slate-50 p-3">
          <button
            type="button"
            className={toolbarButton}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            Bold
          </button>

          <button
            type="button"
            className={toolbarButton}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            Italic
          </button>

          <button
            type="button"
            className={toolbarButton}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            H1
          </button>

          <button
            type="button"
            className={toolbarButton}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            H2
          </button>

          <button
            type="button"
            className={toolbarButton}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            Bullet List
          </button>

          <button
            type="button"
            className={toolbarButton}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            Numbered List
          </button>

          <button
            type="button"
            className={toolbarButton}
            onClick={() => editor.chain().focus().undo().run()}
          >
            Undo
          </button>

          <button
            type="button"
            className={toolbarButton}
            onClick={() => editor.chain().focus().redo().run()}
          >
            Redo
          </button>

          <button
            type="button"
            disabled={editor.isEmpty}
            onClick={saveContent}
            className="ml-auto rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Save Document
          </button>
        </div>
      ) : (
        <div className="border-b bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Read-only mode — you can view this document but cannot edit it.
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}