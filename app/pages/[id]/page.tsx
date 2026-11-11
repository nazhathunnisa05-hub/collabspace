
"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageEditor from "../../../src/components/PageEditor";
import {
  ArrowLeft,
  MessageSquare,
  Send,
  History,
  RotateCcw,
} from "lucide-react";

interface PageData {
  id: string;
  title: string;
  content: object | null;
}

interface CommentData {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
  };
}

interface VersionData {
  id: string;
  content: object;
  createdAt: string;
  creator: {
    id: string;
    name: string;
  };
}

function DocumentPageContent() {
  const [userRole, setUserRole] = useState("VIEWER");
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [page, setPage] = useState<PageData | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(true);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentMessage, setCommentMessage] = useState("");

  const [versions, setVersions] = useState<VersionData[]>([]);
  const [versionLoading, setVersionLoading] = useState(true);
  const [versionMessage, setVersionMessage] = useState("");
  const [restoring, setRestoring] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  async function loadVersions(token: string) {
    setVersionLoading(true);
    setVersionMessage("");

    try {
      const response = await fetch(
        `/api/pages/${params.id}/versions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setVersionMessage(
          data.message || "Unable to load version history."
        );
        return;
      }

      setVersions(data.versions || []);
    } catch {
      setVersionMessage("Unable to load version history.");
    } finally {
      setVersionLoading(false);
    }
  }

  useEffect(() => {
    async function loadPage() {
      const token = localStorage.getItem("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch(`/api/pages/${params.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          setMessage("Unable to load this document.");
          return;
        }
const data = await response.json();

setPage(data.page);
setTitle(data.page.title);
setUserRole(data.userRole || "VIEWER");

        const [commentsResponse] = await Promise.all([
          fetch(`/api/pages/${params.id}/comments`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          loadVersions(token),
        ]);

        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json();
          setComments(commentsData.comments);
        } else {
          setCommentMessage("Unable to load comments.");
        }
      } catch {
        setMessage("Something went wrong while loading.");
      } finally {
        setLoading(false);
        setCommentLoading(false);
      }
    }

    loadPage();
  }, [params.id, router]);

  async function savePage(content: object) {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/pages/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          content,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to save document.");
        return;
      }

      setPage(data.page);
      setMessage("Document saved successfully!");

      await loadVersions(token);
    } catch {
      setMessage("Unable to save document. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = commentText.trim();

    if (!content) {
      setCommentMessage("Please enter a comment.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setCommentSubmitting(true);
    setCommentMessage("");

    try {
      const response = await fetch(
        `/api/pages/${params.id}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setCommentMessage(data.message || "Unable to add comment.");
        return;
      }

      setComments((previous) => [...previous, data.comment]);
      setCommentText("");
      setCommentMessage("Comment added successfully!");
    } catch {
      setCommentMessage("Something went wrong. Please try again.");
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function restoreVersion(versionId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to restore this version? Your current document will be saved in version history."
    );

    if (!confirmed) return;

    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setRestoring(versionId);
    setVersionMessage("");

    try {
      const response = await fetch(
        `/api/pages/${params.id}/versions`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ versionId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setVersionMessage(
          data.message || "Unable to restore version."
        );
        return;
      }

      setPage(data.page);
      setTitle(data.page.title);
      setEditorKey((previous) => previous + 1);
      setVersionMessage("Previous version restored successfully!");

      await loadVersions(token);
    } catch {
      setVersionMessage("Something went wrong while restoring.");
    } finally {
      setRestoring(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading document...
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen p-10">
        <p className="text-red-600">
          {message || "Document not found."}
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-indigo-600"
        >
          Back to Dashboard
        </Link>
      </div>
    );
    
  }

  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-2 text-slate-600 hover:text-indigo-600"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>

        <div className="mb-6 rounded-xl border bg-white p-5">
          <label className="mb-2 block text-sm font-medium text-slate-500">
            Document Title
          </label>

          {["OWNER", "ADMIN", "EDITOR"].includes(userRole) ? (
  <input
    value={title}
    onChange={(e) => setTitle(e.target.value)}
    maxLength={150}
    className="w-full text-2xl font-bold outline-none"
    placeholder="Untitled Document"
  />
) : (
  <h1 className="text-2xl font-bold text-slate-800">
    {title}
  </h1>
)}
        </div>

        {message && (
          <p className="mb-4 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-700">
            {message}
          </p>
        )}

        {/* Version History */}
{/* Version History */}
<section className="mb-6 rounded-xl border bg-white p-5">
  <button
    type="button"
    onClick={() => setShowVersions(!showVersions)}
    className="flex w-full items-center justify-between text-left"
  >
    <span className="flex items-center gap-2 font-semibold text-slate-800">
      <History size={20} className="text-indigo-600" />
      Version History ({versions.length})
    </span>

    <span className="text-sm text-indigo-600">
      {showVersions ? "Hide" : "View History"}
    </span>
  </button>

  {showVersions && (
    <div className="mt-5 border-t pt-4">
      {versionLoading ? (
        <p className="text-sm text-slate-500">
          Loading versions...
        </p>
      ) : versions.length === 0 ? (
        <p className="text-sm text-slate-500">
          No previous versions available yet. Save the document
          after making changes to create a version.
        </p>
      ) : (
        <div className="space-y-3">
          {versions.map((version) => (
            <div
              key={version.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-slate-50 p-4"
            >
              <div>
                <p className="font-medium text-slate-800">
                  Edited by {version.creator.name}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {new Date(version.createdAt).toLocaleString()}
                </p>
              </div>

              {["OWNER", "ADMIN", "EDITOR"].includes(userRole) && (
                <button
                  type="button"
                  onClick={() => restoreVersion(version.id)}
                  disabled={restoring !== null}
                  className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                >
                  <RotateCcw size={15} />
                  {restoring === version.id
                    ? "Restoring..."
                    : "Restore"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {versionMessage && (
        <p className="mt-3 text-sm text-indigo-600">
          {versionMessage}
        </p>
      )}
    </div>
  )}
</section>
         
       <PageEditor
  pageId={page.id}
  initialContent={page.content}
  onSave={savePage}
  editable={["OWNER", "ADMIN", "EDITOR"].includes(userRole)}
/>

        {saving && (
          <p className="mt-3 text-sm text-slate-500">
            Saving document...
          </p>
        )}

        {/* Comments Section */}
        <section className="mt-8 rounded-xl border bg-white p-6">
          <div className="mb-6 flex items-center gap-2">
            <MessageSquare size={22} className="text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-800">
              Comments ({comments.length})
            </h2>
          </div>
{userRole!=="VIEWER" &&(
          <form onSubmit={addComment} className="mb-6">
       
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Write a comment..."
              className="w-full rounded-lg border p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {commentText.length}/2000 characters
              </span>

              <button
                type="submit"
                disabled={commentSubmitting || !commentText.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={16} />
                {commentSubmitting ? "Posting..." : "Post Comment"}
              </button>
            </div>
          </form>
 )}
          {commentMessage && (
            <p className="mb-4 text-sm text-indigo-600">
              {commentMessage}
            </p>
          )}

          {commentLoading ? (
            <p className="text-sm text-slate-500">
              Loading comments...
            </p>
          ) : comments.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-lg border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800">
                      {comment.author.name}
                    </span>

                    <span className="text-xs text-slate-400">
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap text-sm text-slate-700">
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );

}
export default function DocumentPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading document...</div>}>
      <DocumentPageContent />
    </Suspense>
  );
}