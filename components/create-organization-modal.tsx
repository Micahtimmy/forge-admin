"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationsApi } from "@/lib/api";
import { X, Building2, Loader2 } from "lucide-react";

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateOrganizationModal({ isOpen, onClose }: CreateOrganizationModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    plan: "free" as "free" | "pro" | "enterprise",
    ownerEmail: "",
  });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      organizationsApi.create({
        name: formData.name,
        slug: formData.slug || undefined,
        plan: formData.plan,
        ownerEmail: formData.ownerEmail,
        createDefaultWorkspace: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
      onClose();
      setFormData({ name: "", slug: "", plan: "free", ownerEmail: "" });
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to create organization");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Organization name is required");
      return;
    }
    if (!formData.ownerEmail.trim() || !formData.ownerEmail.includes("@")) {
      setError("Valid owner email is required");
      return;
    }

    createMutation.mutate();
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .substring(0, 50);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-canvas/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-01 rounded-lg border border-border-subtle w-full max-w-lg mx-4 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-iris/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-iris" />
            </div>
            <div>
              <h2 className="font-semibold text-text-primary">Create Organization</h2>
              <p className="text-xs text-text-tertiary">Set up a new organization with owner</p>
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
              Organization Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  name: e.target.value,
                  slug: formData.slug ? formData.slug : generateSlug(e.target.value),
                });
              }}
              placeholder="Acme Corporation"
              className="w-full px-3 py-2 bg-surface-02 border border-border-subtle rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-iris/50 focus:border-iris"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              URL Slug
            </label>
            <div className="flex items-center">
              <span className="px-3 py-2 bg-surface-03 border border-r-0 border-border-subtle rounded-l-lg text-text-tertiary text-sm">
                forge.com/
              </span>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: generateSlug(e.target.value) })}
                placeholder="acme-corp"
                className="flex-1 px-3 py-2 bg-surface-02 border border-border-subtle rounded-r-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-iris/50 focus:border-iris"
              />
            </div>
            <p className="text-xs text-text-tertiary mt-1">Auto-generated from name if left empty</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Plan
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["free", "pro", "enterprise"] as const).map((plan) => (
                <button
                  key={plan}
                  type="button"
                  onClick={() => setFormData({ ...formData, plan })}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    formData.plan === plan
                      ? plan === "free"
                        ? "bg-surface-03 border-border-default text-text-primary"
                        : plan === "pro"
                        ? "bg-iris/10 border-iris/30 text-iris"
                        : "bg-amber/10 border-amber/30 text-amber"
                      : "bg-surface-02 border-border-subtle text-text-secondary hover:bg-surface-03"
                  }`}
                >
                  {plan.charAt(0).toUpperCase() + plan.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-tertiary mt-1">
              {formData.plan === "free" && "5 seats, 1 workspace, basic features"}
              {formData.plan === "pro" && "25 seats, 3 workspaces, advanced analytics"}
              {formData.plan === "enterprise" && "100 seats, 10 workspaces, all features"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Owner Email *
            </label>
            <input
              type="email"
              value={formData.ownerEmail}
              onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
              placeholder="admin@example.com"
              className="w-full px-3 py-2 bg-surface-02 border border-border-subtle rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-iris/50 focus:border-iris"
            />
            <p className="text-xs text-text-tertiary mt-1">This user will be the organization owner</p>
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
              className="flex-1 px-4 py-2.5 bg-iris hover:bg-iris/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Organization"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
