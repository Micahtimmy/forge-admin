"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { featureFlagsApi, organizationsApi } from "@/lib/api";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import {
  Flag,
  ChevronDown,
  Lock,
  Unlock,
  Info,
  Sparkles,
} from "lucide-react";

const FLAG_DESCRIPTIONS: Record<string, { name: string; description: string; tier: string }> = {
  multi_jira: {
    name: "Multi-JIRA",
    description: "Connect multiple JIRA instances to a single workspace",
    tier: "enterprise",
  },
  advanced_analytics: {
    name: "Advanced Analytics",
    description: "Access to velocity, burndown, and team comparison analytics",
    tier: "pro",
  },
  cross_workspace_analytics: {
    name: "Cross-Workspace Analytics",
    description: "Aggregate analytics across multiple workspaces",
    tier: "enterprise",
  },
  custom_rubrics: {
    name: "Custom Rubrics",
    description: "Create and customize story scoring rubrics",
    tier: "pro",
  },
  api_access: {
    name: "API Access",
    description: "Programmatic access to FORGE data via REST API",
    tier: "enterprise",
  },
  white_label: {
    name: "White Label",
    description: "Remove FORGE branding and customize appearance",
    tier: "enterprise",
  },
  sso: {
    name: "SSO",
    description: "Single Sign-On with SAML 2.0 or OIDC",
    tier: "enterprise",
  },
  basic_scoring: {
    name: "Basic Scoring",
    description: "AI-powered story quality scoring",
    tier: "free",
  },
};

export default function FeatureFlagsPage() {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: orgs } = useQuery({
    queryKey: ["admin", "organizations"],
    queryFn: () => organizationsApi.list({ limit: 100 }),
  });

  const { data: flagsInfo, isLoading } = useQuery({
    queryKey: ["admin", "feature-flags", selectedOrgId],
    queryFn: () => (selectedOrgId ? featureFlagsApi.get(selectedOrgId) : null),
    enabled: !!selectedOrgId,
  });

  const toggleFlagMutation = useMutation({
    mutationFn: (data: { flagName: string; enabled: boolean }) =>
      featureFlagsApi.toggle({
        organizationId: selectedOrgId!,
        ...data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "feature-flags"] });
    },
  });

  const selectedOrg = orgs?.organizations.find((o) => o.id === selectedOrgId);

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case "free":
        return "bg-surface-03 text-text-secondary";
      case "pro":
        return "bg-iris/10 text-iris";
      case "enterprise":
        return "bg-amber/10 text-amber";
      default:
        return "bg-surface-03 text-text-secondary";
    }
  };

  const allFlags = Object.keys(FLAG_DESCRIPTIONS);

  return (
    <div className="p-8">
      <Breadcrumb items={[{ label: "Feature Flags" }]} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Feature Flags</h1>
        <p className="text-text-secondary mt-1">
          Enable or disable features for specific organizations
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

      {selectedOrgId && selectedOrg && (
        <div className="space-y-6">
          {/* Plan Info */}
          <div className="p-4 bg-surface-01 rounded-lg border border-border-subtle">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-iris" />
                <div>
                  <p className="font-medium text-text-primary">
                    {selectedOrg.name}
                  </p>
                  <p className="text-sm text-text-tertiary">
                    Plan: <span className="capitalize">{selectedOrg.plan}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-text-tertiary">Available Features</p>
                <p className="text-lg font-semibold text-text-primary">
                  {flagsInfo?.availableFlags.length || 0} / {allFlags.length}
                </p>
              </div>
            </div>
          </div>

          {/* Feature Flags List */}
          <div className="bg-surface-01 rounded-lg border border-border-subtle">
            <div className="px-5 py-4 border-b border-border-subtle">
              <h2 className="font-semibold text-text-primary flex items-center gap-2">
                <Flag className="w-5 h-5" />
                Feature Toggles
              </h2>
            </div>
            <div className="divide-y divide-border-subtle">
              {isLoading ? (
                <div className="p-5 text-text-tertiary">Loading feature flags...</div>
              ) : (
                allFlags.map((flagName) => {
                  const flagInfo = FLAG_DESCRIPTIONS[flagName];
                  const currentFlag = flagsInfo?.featureFlags.find(
                    (f) => f.flagName === flagName
                  );
                  const isEnabled = currentFlag?.enabled || false;
                  const isAvailable =
                    flagsInfo?.availableFlags.includes(flagName) || false;

                  return (
                    <div
                      key={flagName}
                      className={`p-4 ${!isAvailable ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isEnabled
                                ? "bg-jade/10 text-jade"
                                : "bg-surface-03 text-text-tertiary"
                            }`}
                          >
                            {isAvailable ? (
                              <Unlock className="w-5 h-5" />
                            ) : (
                              <Lock className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-text-primary">
                                {flagInfo.name}
                              </p>
                              <span
                                className={`px-2 py-0.5 text-xs rounded-full ${getTierBadgeColor(
                                  flagInfo.tier
                                )}`}
                              >
                                {flagInfo.tier}
                              </span>
                            </div>
                            <p className="text-sm text-text-tertiary mt-0.5">
                              {flagInfo.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {!isAvailable && (
                            <span className="text-xs text-text-tertiary flex items-center gap-1">
                              <Info className="w-3 h-3" />
                              Requires {flagInfo.tier} plan
                            </span>
                          )}
                          <button
                            onClick={() =>
                              toggleFlagMutation.mutate({
                                flagName,
                                enabled: !isEnabled,
                              })
                            }
                            disabled={!isAvailable || toggleFlagMutation.isPending}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                              isEnabled ? "bg-jade" : "bg-surface-03"
                            } ${
                              !isAvailable
                                ? "cursor-not-allowed"
                                : "cursor-pointer"
                            }`}
                          >
                            <span
                              className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                                isEnabled ? "left-7" : "left-1"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-surface-01 rounded-lg border border-border-subtle">
            <div className="px-5 py-4 border-b border-border-subtle">
              <h2 className="font-semibold text-text-primary">Quick Actions</h2>
            </div>
            <div className="p-5">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    const availableFlags = flagsInfo?.availableFlags || [];
                    availableFlags.forEach((flagName) => {
                      const currentFlag = flagsInfo?.featureFlags.find(
                        (f) => f.flagName === flagName
                      );
                      if (!currentFlag?.enabled) {
                        toggleFlagMutation.mutate({ flagName, enabled: true });
                      }
                    });
                  }}
                  disabled={toggleFlagMutation.isPending}
                  className="px-4 py-2 bg-jade/10 text-jade rounded-lg hover:bg-jade/20 transition-colors disabled:opacity-50"
                >
                  Enable All Available
                </button>
                <button
                  onClick={() => {
                    const availableFlags = flagsInfo?.availableFlags || [];
                    availableFlags.forEach((flagName) => {
                      const currentFlag = flagsInfo?.featureFlags.find(
                        (f) => f.flagName === flagName
                      );
                      if (currentFlag?.enabled) {
                        toggleFlagMutation.mutate({ flagName, enabled: false });
                      }
                    });
                  }}
                  disabled={toggleFlagMutation.isPending}
                  className="px-4 py-2 bg-coral/10 text-coral rounded-lg hover:bg-coral/20 transition-colors disabled:opacity-50"
                >
                  Disable All
                </button>
                <button
                  onClick={() => {
                    const defaults: Record<string, string[]> = {
                      free: ["basic_scoring"],
                      pro: ["basic_scoring", "advanced_analytics", "custom_rubrics"],
                      enterprise: [
                        "basic_scoring",
                        "advanced_analytics",
                        "custom_rubrics",
                        "multi_jira",
                        "api_access",
                        "cross_workspace_analytics",
                      ],
                    };
                    const planDefaults = defaults[selectedOrg.plan] || [];
                    allFlags.forEach((flagName) => {
                      const shouldBeEnabled = planDefaults.includes(flagName);
                      const currentFlag = flagsInfo?.featureFlags.find(
                        (f) => f.flagName === flagName
                      );
                      if (
                        flagsInfo?.availableFlags.includes(flagName) &&
                        currentFlag?.enabled !== shouldBeEnabled
                      ) {
                        toggleFlagMutation.mutate({
                          flagName,
                          enabled: shouldBeEnabled,
                        });
                      }
                    });
                  }}
                  disabled={toggleFlagMutation.isPending}
                  className="px-4 py-2 bg-iris/10 text-iris rounded-lg hover:bg-iris/20 transition-colors disabled:opacity-50"
                >
                  Reset to Plan Defaults
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!selectedOrgId && (
        <div className="text-center py-12 text-text-tertiary">
          Select an organization to manage feature flags
        </div>
      )}
    </div>
  );
}
