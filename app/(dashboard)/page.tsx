"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { organizationsApi, jiraApi, auditApi, isDemoMode, setDemoMode, resetDemoState } from "@/lib/api";
import {
  Building2,
  Link2,
  AlertCircle,
  Activity,
  TrendingUp,
  ToggleLeft,
  ToggleRight,
  FlaskConical,
  RotateCcw,
} from "lucide-react";

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [demoEnabled, setDemoEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      return isDemoMode();
    }
    return false;
  });

  const toggleDemoMode = () => {
    const newValue = !demoEnabled;
    setDemoMode(newValue);
    setDemoEnabled(newValue);
    window.location.reload();
  };

  const { data: orgsData, isLoading: orgsLoading } = useQuery({
    queryKey: ["admin", "organizations", "summary"],
    queryFn: () => organizationsApi.list({ limit: 5 }),
  });

  const { data: jiraData } = useQuery({
    queryKey: ["admin", "jira", "connections"],
    queryFn: () => jiraApi.listConnections({ limit: 5 }),
  });

  const { data: failedSyncs, isLoading: syncsLoading } = useQuery({
    queryKey: ["admin", "jira", "failed-syncs"],
    queryFn: () => jiraApi.getFailedSyncs({ hours: 24, limit: 5 }),
  });

  const { data: auditSummary, isLoading: auditLoading } = useQuery({
    queryKey: ["admin", "audit", "summary"],
    queryFn: () => auditApi.getSummary(),
  });

  const stats = [
    {
      label: "Organizations",
      value: orgsData?.total ?? "-",
      icon: Building2,
      color: "iris",
    },
    {
      label: "JIRA Connections",
      value: jiraData?.total ?? "-",
      icon: Link2,
      color: "jade",
    },
    {
      label: "Failed Syncs (24h)",
      value: failedSyncs?.total ?? "-",
      icon: AlertCircle,
      color: failedSyncs?.total ? "coral" : "jade",
    },
    {
      label: "Admin Actions",
      value: auditSummary?.totalActions ?? "-",
      icon: Activity,
      color: "amber",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary mt-1">
            Overview of FORGE platform administration
          </p>
        </div>

        {/* Demo Mode Toggle */}
        <button
          onClick={toggleDemoMode}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            demoEnabled
              ? "bg-amber/10 border-amber/30 text-amber"
              : "bg-surface-02 border-border-subtle text-text-secondary hover:text-text-primary"
          }`}
        >
          <FlaskConical className="w-4 h-4" />
          <span className="text-sm font-medium">Demo Mode</span>
          {demoEnabled ? (
            <ToggleRight className="w-5 h-5" />
          ) : (
            <ToggleLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Demo Mode Banner */}
      {demoEnabled && (
        <div className="mb-6 p-4 bg-amber/10 border border-amber/20 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FlaskConical className="w-5 h-5 text-amber" />
            <div>
              <p className="font-medium text-text-primary">Demo Mode Active</p>
              <p className="text-sm text-text-secondary">
                Changes persist in your browser. Create orgs, add users, toggle features — they all work!
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (confirm("Reset all demo data to defaults? This cannot be undone.")) {
                resetDemoState();
                queryClient.invalidateQueries();
                window.location.reload();
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface-02 hover:bg-surface-03 text-text-secondary rounded-lg text-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Demo Data
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-surface-01 rounded-lg border border-border-subtle p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-tertiary text-sm">{stat.label}</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    stat.color === "iris"
                      ? "bg-iris/10 text-iris"
                      : stat.color === "jade"
                        ? "bg-jade/10 text-jade"
                        : stat.color === "coral"
                          ? "bg-coral/10 text-coral"
                          : "bg-amber/10 text-amber"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Organizations */}
        <div className="bg-surface-01 rounded-lg border border-border-subtle">
          <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
            <h2 className="font-semibold text-text-primary">
              Recent Organizations
            </h2>
            <a
              href="/organizations"
              className="text-sm text-iris hover:underline"
            >
              View all
            </a>
          </div>
          <div className="p-5">
            {orgsLoading ? (
              <p className="text-text-tertiary text-sm">Loading...</p>
            ) : orgsData?.organizations.length === 0 ? (
              <p className="text-text-tertiary text-sm">No organizations yet</p>
            ) : (
              <div className="space-y-3">
                {orgsData?.organizations.map((org) => (
                  <div
                    key={org.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-surface-03 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-text-tertiary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {org.name}
                        </p>
                        <p className="text-xs text-text-tertiary">{org.slug}</p>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        org.plan === "enterprise"
                          ? "bg-iris/10 text-iris"
                          : org.plan === "pro"
                            ? "bg-jade/10 text-jade"
                            : "bg-surface-03 text-text-tertiary"
                      }`}
                    >
                      {org.plan}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Failed Syncs */}
        <div className="bg-surface-01 rounded-lg border border-border-subtle">
          <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
            <h2 className="font-semibold text-text-primary">
              Failed Syncs (24h)
            </h2>
            <a href="/jira" className="text-sm text-iris hover:underline">
              View all
            </a>
          </div>
          <div className="p-5">
            {syncsLoading ? (
              <p className="text-text-tertiary text-sm">Loading...</p>
            ) : failedSyncs?.failedSyncs.length === 0 ? (
              <div className="flex items-center gap-2 text-jade">
                <TrendingUp className="w-4 h-4" />
                <p className="text-sm">All syncs healthy</p>
              </div>
            ) : (
              <div className="space-y-3">
                {failedSyncs?.failedSyncs.map((sync) => (
                  <div
                    key={sync.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-coral/10 flex items-center justify-center">
                        <AlertCircle className="w-4 h-4 text-coral" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {sync.workspaceName || "Unknown workspace"}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {sync.errors?.[0]?.message || "Sync failed"}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-text-tertiary">
                      {new Date(sync.startedAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Audit Activity */}
        <div className="bg-surface-01 rounded-lg border border-border-subtle lg:col-span-2">
          <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
            <h2 className="font-semibold text-text-primary">Admin Activity</h2>
            <a href="/audit" className="text-sm text-iris hover:underline">
              View logs
            </a>
          </div>
          <div className="p-5">
            {auditLoading ? (
              <p className="text-text-tertiary text-sm">Loading...</p>
            ) : auditSummary?.summary.length === 0 ? (
              <p className="text-text-tertiary text-sm">No recent activity</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {auditSummary?.summary.slice(0, 8).map((item) => (
                  <div
                    key={item.action}
                    className="bg-surface-02 rounded-lg p-3"
                  >
                    <p className="text-lg font-bold text-text-primary">
                      {item.count}
                    </p>
                    <p className="text-xs text-text-tertiary truncate">
                      {item.action.replace(/\./g, " ")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
