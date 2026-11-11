
"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Plus,
  FolderOpen,
  Users,
  Trash2,
} from "lucide-react";

interface WorkspacePage {
  id: string;
  title: string;
  updatedAt: string;
  creator: {
    name: string;
  };
}

interface Member {
  id: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "EDITOR" | "COMMENTER" | "VIEWER";
  user: {
    id: string;
    name: string;
    email: string;
  };
}

 function WorkspaceDetailsContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [pages, setPages] = useState<WorkspacePage[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [workspaceName, setWorkspaceName] = useState("Workspace");

  const [pageTitle, setPageTitle] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("VIEWER");

  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [memberSaving, setMemberSaving] = useState(false);
  const [message, setMessage] = useState("");

  const currentMember = members.find(
    (member) => member.userId === currentUserId
  );

  const canManageMembers =
    currentMember?.role === "OWNER" ||
    currentMember?.role === "ADMIN";

  async function loadPages(token: string) {
    const response = await fetch(
      `/api/workspaces/${params.id}/pages`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load pages");
    }

    setPages(data.pages);
  }

  async function loadMembers(token: string) {
    const response = await fetch(
      `/api/workspaces/${params.id}/members`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load members");
    }

    setMembers(data.members);
  }

  useEffect(() => {
    async function loadWorkspace() {
      const token = localStorage.getItem("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const userResponse = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userData = await userResponse.json();

        if (!userResponse.ok) {
          throw new Error("Unable to verify user");
        }

        setCurrentUserId(userData.user.id);

        const response = await fetch("/api/workspaces", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load workspace");
        }

        const workspace = data.workspaces.find(
          (item: { id: string; name: string }) =>
            item.id === params.id
        );

        if (!workspace) {
          setMessage("Workspace not found.");
          return;
        }

        setWorkspaceName(workspace.name);

        await Promise.all([
          loadPages(token),
          loadMembers(token),
        ]);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    }

    loadWorkspace();
  }, [params.id, router]);

  async function createPage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const title = pageTitle.trim();

    if (!title) {
      setMessage("Please enter a document title.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/workspaces/${params.id}/pages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title,
            content: { type: "doc", content: [] },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to create document.");
        return;
      }

      setPageTitle("");
      setShowModal(false);
      router.push(`/pages/${data.page.id}`);
    } catch {
      setMessage("Unable to create document.");
    } finally {
      setSaving(false);
    }
  }

  async function addMember(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setMemberSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/workspaces/${params.id}/members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: memberEmail.trim(),
            role: memberRole,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to add member.");
        return;
      }

      setMemberEmail("");
      setMemberRole("VIEWER");
      setMessage("Member added successfully.");

      await loadMembers(token);
    } catch {
      setMessage("Unable to add member.");
    } finally {
      setMemberSaving(false);
    }
  }

  async function updateMemberRole(
    userId: string,
    role: string
  ) {
    const token = localStorage.getItem("token");
    if (!token) return;

    setMessage("");

    try {
      const response = await fetch(
        `/api/workspaces/${params.id}/members`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId, role }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to update role.");
        await loadMembers(token);
        return;
      }

      setMessage("Member role updated successfully.");
      await loadMembers(token);
    } catch {
      setMessage("Unable to update member role.");
    }
  }

  async function removeMember(userId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to remove this member?"
    );

    if (!confirmed) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    setMessage("");

    try {
      const response = await fetch(
        `/api/workspaces/${params.id}/members`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to remove member.");
        return;
      }

      setMessage("Member removed successfully.");
      await loadMembers(token);
    } catch {
      setMessage("Unable to remove member.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading workspace...
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

        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-3 text-indigo-600">
              <FolderOpen size={26} />
              <span className="text-sm font-medium">Workspace</span>
            </div>

            <h1 className="text-3xl font-bold text-slate-900">
              {workspaceName}
            </h1>

            <p className="mt-2 text-slate-500">
              Create and manage your workspace documents.
            </p>
          </div>

          <button
            onClick={() => {
              setMessage("");
              setShowModal(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700"
          >
            <Plus size={18} />
            Create Document
          </button>
        </header>

        {message && (
          <p className="mb-5 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-700">
            {message}
          </p>
        )}

        {/* Documents */}
        <section className="mb-12">
          <h2 className="mb-5 text-xl font-bold">
            Documents ({pages.length})
          </h2>

          {pages.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed bg-white p-8 text-center">
              <FileText size={48} className="mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold">
                No documents yet
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Create your first document in this workspace.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pages.map((page) => (
                <Link
                  key={page.id}
                  href={`/pages/${page.id}`}
                  className="rounded-xl border bg-white p-5 transition hover:border-indigo-300 hover:shadow-md"
                >
                  <FileText className="mb-4 text-indigo-600" size={28} />

                  <h3 className="font-bold text-slate-900">
                    {page.title}
                  </h3>

                  <p className="mt-2 text-xs text-slate-500">
                    By {page.creator.name}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    Updated {new Date(page.updatedAt).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Workspace Members */}
        <section className="rounded-xl border bg-white p-5 shadow-sm md:p-6">
          <div className="mb-6 flex items-center gap-3">
            <Users size={24} className="text-indigo-600" />
            <div>
              <h2 className="text-xl font-bold">
                Workspace Members ({members.length})
              </h2>
              <p className="text-sm text-slate-500">
                View and manage workspace access.
              </p>
            </div>
          </div>

          {canManageMembers && (
            <form
              onSubmit={addMember}
              className="mb-6 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-[1fr_160px_auto]"
            >
              <input
                type="email"
                required
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="Enter registered user's email"
                className="rounded-lg border bg-white px-3 py-2 outline-none focus:border-indigo-500"
              />

              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value)}
                className="rounded-lg border bg-white px-3 py-2"
              >
                <option value="VIEWER">Viewer</option>
                <option value="COMMENTER">Commenter</option>
                <option value="EDITOR">Editor</option>
                {currentMember?.role === "OWNER" && (
                  <option value="ADMIN">Admin</option>
                )}
              </select>

              <button
                type="submit"
                disabled={memberSaving}
                className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {memberSaving ? "Adding..." : "Add Member"}
              </button>
            </form>
          )}

          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
              >
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900">
                    {member.user.name}
                    {member.userId === currentUserId && (
                      <span className="ml-2 text-xs text-indigo-600">
                        (You)
                      </span>
                    )}
                  </h3>

                  <p className="break-all text-sm text-slate-500">
                    {member.user.email}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {canManageMembers && member.role !== "OWNER" &&
                  member.userId !== currentUserId &&
                  (currentMember?.role === "OWNER" ||
                    member.role !== "ADMIN") ? (
                    <>
                      <select
                        value={member.role}
                        onChange={(e) =>
                          updateMemberRole(
                            member.userId,
                            e.target.value
                          )
                        }
                        className="rounded-lg border px-3 py-2 text-sm"
                      >
                        {currentMember?.role === "OWNER" && (
                          <option value="ADMIN">Admin</option>
                        )}
                        <option value="EDITOR">Editor</option>
                        <option value="COMMENTER">Commenter</option>
                        <option value="VIEWER">Viewer</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => removeMember(member.userId)}
                        title="Remove member"
                        className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {member.role}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {members.length === 0 && (
              <p className="py-5 text-center text-sm text-slate-500">
                No members found.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Create Document Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-5 text-xl font-bold">
              Create Document
            </h2>

            <form onSubmit={createPage}>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Document Title
              </label>

              <input
                autoFocus
                value={pageTitle}
                onChange={(e) => setPageTitle(e.target.value)}
                maxLength={150}
                placeholder="e.g. Project Notes"
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-indigo-500"
              />

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border px-4 py-2 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
  
}
export default function WorkspaceDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Loading workspace...
        </div>
      }
    >
      <WorkspaceDetailsContent />
    </Suspense>
  );
}
