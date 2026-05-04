"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { licensingApi, organizationsApi } from "@/lib/api";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import {
  CreditCard,
  Users,
  Layers,
  Link2,
  Check,
  ChevronDown,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

export default function LicensingPage() {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editingSeats, setEditingSeats] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: orgs } = useQuery({
    queryKey: ["admin", "organizations"],
    queryFn: () => organizationsApi.list({ limit: 100 }),
  });

  const { data: licensing, isLoading } = useQuery({
    queryKey: ["admin", "licensing", selectedOrgId],
    queryFn: () => (selectedOrgId ? licensingApi.get(selectedOrgId) : null),
    enabled: !!selectedOrgId,
  });

  const updateLicensingMutation = useMutation({
    mutationFn: (data: Parameters<typeof licensingApi.update>[0]) =>
      licensingApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "licensing"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
      setEditingPlan(null);
      setEditingSeats(null);
    },
  });

  const planFeatures = {
    free: {
      color: "text-text-secondary",
      bgColor: "bg-surface-03",
      seats: 5,
      workspaces: 1,
      jiraConnections: 1,
      features: ["Basic Scoring", "5 Users", "1 Workspace"],
    },
    pro: {
      color: "text-iris",
      bgColor: "bg-iris/10",
      seats: 25,
      workspaces: 3,
      jiraConnections: 1,
      features: ["Advanced Analytics", "Custom Rubrics", "25 Users", "3 Workspaces"],
    },
    enterprise: {
      color: "text-amber",
      bgColor: "bg-amber/10",
      seats: 100,
      workspaces: 10,
      jiraConnections: 5,
      features: [
        "Multi-JIRA",
        "API Access",
        "SSO",
        "White Label",
        "100 Users",
        "10 Workspaces",
      ],
    },
  };

  return (
    <div className="p-8">
      <Breadcrumb items={[{ label: "Licensing" }]} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Licensing & Subscriptions</h1>
        <p className="text-text-secondary mt-1">
          Manage organization plans, seats, and feature access
        </p>
      </div>

      {/* Organization Selector */}
      <div className="mb-6 p-4 bg-surface-01 rounded-lg border border-border-subtle">
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Select Organization
        </label>
        <div className="relative">
          <select
            value={selectedOrgId || ""}
            onChange={(e) => setSelectedOrgId(e.target.value || null)}
            className="w-full md:w-96 px-4 py-2.5 bg-surface-02 border border-border-subtle rounded-lg text-text-primary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-iris/50"
          >
            <option value="">Choose an organization...</option>
            {orgs?.organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} ({org.plan})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
        </div>
      </div>

      {selectedOrgId && licensing && (
        <div className="space-y-6">
          {/* Current Subscription */}
          <div className="bg-surface-01 rounded-lg border border-border-subtle">
            <div className="px-5 py-4 border-b border-border-subtle">
              <h2 className="font-semibold text-text-primary flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Current Subscription
              </h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Plan */}
                <div className="p-4 bg-surface-02 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-text-tertiary">Plan</p>
                    <Sparkles
                      className={`w-4 h-4 ${
                        planFeatures[licensing.subscription.plan]?.color ||
                        "text-text-tertiary"
                      }`}
                    />
                  </div>
                  {editingPlan !== null ? (
                    <div className="space-y-2">
                      <select
                        value={editingPlan}
                        onChange={(e) => setEditingPlan(e.target.value)}
                        className="w-full px-3 py-2 bg-surface-01 border border-border-subtle rounded-lg text-sm text-text-primary"
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            updateLicensingMutation.mutate({
                              organizationId: selectedOrgId!,
                              plan: editingPlan as "free" | "pro" | "enterprise",
                            });
                          }}
                          disabled={updateLicensingMutation.isPending}
                          className="flex-1 px-3 py-1.5 bg-jade text-white text-sm rounded-lg hover:bg-jade/90 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingPlan(null)}
                          className="px-3 py-1.5 bg-surface-03 text-text-secondary text-sm rounded-lg hover:bg-surface-03/80"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-xl font-bold capitalize ${
                          planFeatures[licensing.subscription.plan]?.color ||
                          "text-text-primary"
                        }`}
                      >
                        {licensing.subscription.plan}
                      </p>
                      <button
                        onClick={() => setEditingPlan(licensing.subscription.plan)}
                        className="text-xs text-iris hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>

                {/* Seats */}
                <div className="p-4 bg-surface-02 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-text-tertiary">Seats</p>
                    <Users className="w-4 h-4 text-text-tertiary" />
                  </div>
                  {editingSeats !== null ? (
                    <div className="space-y-2">
                      <input
                        type="number"
                        value={editingSeats}
                        onChange={(e) => setEditingSeats(Number(e.target.value))}
                        min={licensing.subscription.seatsUsed}
                        className="w-full px-3 py-2 bg-surface-01 border border-border-subtle rounded-lg text-sm text-text-primary"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            updateLicensingMutation.mutate({
                              organizationId: selectedOrgId!,
                              seatsTotal: editingSeats,
                            });
                          }}
                          disabled={updateLicensingMutation.isPending}
                          className="flex-1 px-3 py-1.5 bg-jade text-white text-sm rounded-lg hover:bg-jade/90 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingSeats(null)}
                          className="px-3 py-1.5 bg-surface-03 text-text-secondary text-sm rounded-lg hover:bg-surface-03/80"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xl font-bold text-text-primary">
                          {licensing.subscription.seatsUsed} / {licensing.subscription.seatsTotal}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {licensing.subscription.seatsTotal - licensing.subscription.seatsUsed} available
                        </p>
                      </div>
                      <button
                        onClick={() => setEditingSeats(licensing.subscription.seatsTotal)}
                        className="text-xs text-iris hover:underline"
                      >
                        Adjust
                      </button>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="p-4 bg-surface-02 rounded-lg">
                  <p className="text-sm text-text-tertiary mb-3">Status</p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        licensing.subscription.status === "active"
                          ? "bg-jade"
                          : licensing.subscription.status === "past_due"
                          ? "bg-coral"
                          : "bg-amber"
                      }`}
                    />
                    <p className="text-xl font-bold text-text-primary capitalize">
                      {licensing.subscription.status.replace("_", " ")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Limit Warnings */}
              {!licensing.limits.withinLimits && (
                <div className="mt-4 p-4 bg-coral/10 border border-coral/20 rounded-lg">
                  <div className="flex items-center gap-2 text-coral mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <p className="font-medium">Limit Violations</p>
                  </div>
                  <ul className="text-sm text-coral/80 space-y-1">
                    {licensing.limits.violations.map((v, i) => (
                      <li key={i}>• {v}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Plan Comparison */}
          <div className="bg-surface-01 rounded-lg border border-border-subtle">
            <div className="px-5 py-4 border-b border-border-subtle">
              <h2 className="font-semibold text-text-primary">Plan Comparison</h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["free", "pro", "enterprise"] as const).map((plan) => (
                  <div
                    key={plan}
                    className={`p-4 rounded-lg border ${
                      licensing.subscription.plan === plan
                        ? "border-iris bg-iris/5"
                        : "border-border-subtle bg-surface-02"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3
                        className={`font-semibold capitalize ${planFeatures[plan].color}`}
                      >
                        {plan}
                      </h3>
                      {licensing.subscription.plan === plan && (
                        <span className="px-2 py-0.5 text-xs bg-iris text-white rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <ul className="space-y-2">
                      {planFeatures[plan].features.map((feature, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-2 text-sm text-text-secondary"
                        >
                          <Check className="w-3 h-3 text-jade" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Plan Limits */}
          <div className="bg-surface-01 rounded-lg border border-border-subtle">
            <div className="px-5 py-4 border-b border-border-subtle">
              <h2 className="font-semibold text-text-primary">Plan Limits</h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-surface-02 rounded-lg text-center">
                  <Users className="w-5 h-5 text-text-tertiary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-text-primary">
                    {licensing.planLimits.seats}
                  </p>
                  <p className="text-xs text-text-tertiary">Max Seats</p>
                </div>
                <div className="p-4 bg-surface-02 rounded-lg text-center">
                  <Layers className="w-5 h-5 text-text-tertiary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-text-primary">
                    {licensing.planLimits.workspaces}
                  </p>
                  <p className="text-xs text-text-tertiary">Max Workspaces</p>
                </div>
                <div className="p-4 bg-surface-02 rounded-lg text-center">
                  <Link2 className="w-5 h-5 text-text-tertiary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-text-primary">
                    {licensing.planLimits.jiraConnections}
                  </p>
                  <p className="text-xs text-text-tertiary">JIRA Connections</p>
                </div>
                <div className="p-4 bg-surface-02 rounded-lg">
                  <p className="text-xs text-text-tertiary mb-2">Features</p>
                  <div className="flex flex-wrap gap-1">
                    {licensing.planLimits.features.slice(0, 3).map((f) => (
                      <span
                        key={f}
                        className="px-2 py-0.5 text-xs bg-surface-03 text-text-secondary rounded"
                      >
                        {f.replace("_", " ")}
                      </span>
                    ))}
                    {licensing.planLimits.features.length > 3 && (
                      <span className="px-2 py-0.5 text-xs bg-surface-03 text-text-tertiary rounded">
                        +{licensing.planLimits.features.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedOrgId && isLoading && (
        <div className="text-center py-12 text-text-tertiary">Loading licensing info...</div>
      )}

      {!selectedOrgId && (
        <div className="text-center py-12 text-text-tertiary">
          Select an organization to view licensing details
        </div>
      )}
    </div>
  );
}
