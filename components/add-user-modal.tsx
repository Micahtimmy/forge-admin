"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, type OrganizationWithDetails } from "@/lib/api";
import { X, UserPlus, Loader2 } from "lucide-react";

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: OrganizationWithDetails;
}

export function AddUserModal({ isOpen, onClose, organization }: AddUserModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    email: "",
    workspaceId: organization.workspaces[0]?.id || "",
    role: "member" as "admin" | "member" | "viewer",
  });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      usersApi.create({
        email: formData.email,
        workspaceId: formData.workspaceId,
        role: formData.role,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
      onClose();
      setFormData({ email: "", workspaceId: organization.workspaces[0]?.id || "", role: "member" });
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to create user");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email.trim() || !formData.email.includes("@")) {
      setError("Valid email is required");
      return;
    }
    if (!formData.workspaceId) {
      setError("Select a workspace");
      return;
    }

    createMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-canvas/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-01 rounded-lg border border-border-subtle w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-jade/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-jade" />
            </div>
            <div>
              <h2 className="font-semibold text-text-primary">Add User</h2>
              <p className="text-xs text-text-tertiary">Add a user to {organization.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-02 transition-colors"
          >
            <X className="w-5 h-5 text-text-tertiary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-coral/10 border border-coral/20 text-coral text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="user@example.com"
              className="w-full px-3 py-2 bg-surface-02 border border-border-subtle rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-iris/50 focus:border-iris"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Workspace *
            </label>
            <select
              value={formData.workspaceId}
              onChange={(e) => setFormData({ ...formData, workspaceId: e.target.value })}
              className="w-full px-3 py-2 bg-surface-02 border border-border-subtle rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-iris/50"
            >
              <option value="">Select workspace...</option>
              {organization.workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name} ({ws.memberCount} members)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Role
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["admin", "member", "viewer"] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setFormData({ ...formData, role })}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    formData.role === role
                      ? role === "admin"
                        ? "bg-iris/10 border-iris/30 text-iris"
                        : role === "member"
                        ? "bg-jade/10 border-jade/30 text-jade"
                        : "bg-surface-03 border-border-default text-text-primary"
                      : "bg-surface-02 border-border-subtle text-text-secondary hover:bg-surface-03"
                  }`}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-tertiary mt-1">
              {formData.role === "admin" && "Can manage workspace settings and members"}
              {formData.role === "member" && "Full access to features, cannot manage settings"}
              {formData.role === "viewer" && "Read-only access to dashboards and reports"}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-surface-02 hover:bg-surface-03 text-text-secondary rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-2.5 bg-jade hover:bg-jade/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add User"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
