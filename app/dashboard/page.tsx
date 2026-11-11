
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Settings,
  Plus,
  Bell,
  LogOut,
  FileText,
  X,
} from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Workspace {
  id: string;
  name: string;
  createdAt: string;
  _count: {
    members: number;
    pages: number;
  };
}

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadWorkspaces(token: string) {
    const response = await fetch("/api/workspaces", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Unable to load workspaces");
    }

    const data = await response.json();
    setWorkspaces(data.workspaces);
  }

  useEffect(() => {
    async function loadDashboard() {
      const token = localStorage.getItem("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          localStorage.removeItem("token");
          router.replace("/login");
          return;
        }

        const data = await response.json();
        setUser(data.user);

        await loadWorkspaces(token);
      } catch {
        setMessage("Unable to load dashboard data. Please refresh.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  async function handleCreateWorkspace(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    const name = workspaceName.trim();

    if (!name) {
      setMessage("Please enter a workspace name.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to create workspace.");
        return;
      }

      await loadWorkspaces(token);
      setWorkspaceName("");
      setShowModal(false);
      setMessage("Workspace created successfully!");
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    router.replace("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading CollabSpace...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 flex-col border-r bg-white p-6 md:flex">
        <h1 className="mb-10 text-2xl font-bold text-indigo-600">
          ✦ CollabSpace
        </h1>

        <nav className="flex-1 space-y-3">
          <div className="flex items-center gap-3 rounded-lg bg-indigo-50 px-4 py-3 font-medium text-indigo-600">
            <LayoutDashboard size={20} />
            Dashboard
          </div>

          <div className="flex items-center gap-3 px-4 py-3 text-slate-600">
            <FolderOpen size={20} />
            My Workspaces
          </div>

          <div className="flex items-center gap-3 px-4 py-3 text-slate-600">
            <Users size={20} />
            Shared with me
          </div>

          <div className="flex items-center gap-3 px-4 py-3 text-slate-600">
            <Settings size={20} />
            Settings
          </div>
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-lg px-4 py-3 text-red-600 hover:bg-red-50"
        >
          <LogOut size={20} />
          Logout
        </button>
      </aside>

      <main className="flex-1 p-5 md:p-10">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">
              Welcome, {user.name}!
            </h2>
            <p className="mt-2 text-slate-500">
              Manage your work and collaborate with your team.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button className="rounded-full p-3 hover:bg-slate-200">
              <Bell size={20} />
            </button>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border bg-white p-6">
            <FolderOpen className="mb-4 text-indigo-600" size={28} />
            <p className="text-sm text-slate-500">My Workspaces</p>
            <h3 className="mt-2 text-3xl font-bold">{workspaces.length}</h3>
          </div>

          <div className="rounded-xl border bg-white p-6">
            <FileText className="mb-4 text-emerald-600" size={28} />
            <p className="text-sm text-slate-500">Documents</p>
            <h3 className="mt-2 text-3xl font-bold">
              {workspaces.reduce((total, w) => total + w._count.pages, 0)}
            </h3>
          </div>

          <div className="rounded-xl border bg-white p-6">
            <Users className="mb-4 text-amber-600" size={28} />
            <p className="text-sm text-slate-500">Team Members</p>
            <h3 className="mt-2 text-3xl font-bold">
              {workspaces.reduce((total, w) => total + w._count.members, 0)}
            </h3>
          </div>
        </div>

        <section>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold">Your Workspaces</h3>
              <p className="mt-1 text-sm text-slate-500">
                Organize your projects in one place.
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
              Create Workspace
            </button>
          </div>

          {message && (
            <p className="mb-4 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-700">
              {message}
            </p>
          )}

          {workspaces.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed bg-white p-8 text-center">
              <FolderOpen size={48} className="mb-4 text-slate-300" />
              <h4 className="text-lg font-semibold">No workspaces yet</h4>
              <p className="mt-2 text-sm text-slate-500">
                Create your first workspace to start collaborating.
              </p>
            </div>
          ) : (
            
<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
  {workspaces.map((workspace) => (
    <button
      key={workspace.id}
      onClick={() => router.push(`/workspaces/${workspace.id}`)}
      className="w-full rounded-xl border bg-white p-6 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        <FolderOpen size={25} />
      </div>

      <h4 className="text-lg font-bold text-slate-900">
        {workspace.name}
      </h4>

      <p className="mt-2 text-sm text-slate-500">
        {workspace._count.pages} documents ·{" "}
        {workspace._count.members} members
      </p>

      <p className="mt-4 text-xs text-slate-400">
        Created {new Date(workspace.createdAt).toLocaleDateString()}
      </p>
    </button>
  ))}
</div>

          )}
        </section>
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold">Create Workspace</h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 hover:bg-slate-100"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace}>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Workspace Name
              </label>

              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="e.g. My Team Project"
                maxLength={100}
                autoFocus
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border px-4 py-2 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
