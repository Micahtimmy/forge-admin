"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { auditApi, organizationsApi } from "@/lib/api";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import {
  FileText,
  ChevronDown,
  Building2,
  Users,
  CreditCard,
  Flag,
  Link2,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const ACTION_ICONS: Record<string, typeof Building2> = {
  "organization.create": Building2,
  "organization.update": Building2,
  "organization.suspend": Building2,
  "organization.reactivate": Building2,
  "subscription.plan_change": CreditCard,
  "subscription.seats_change": CreditCard,
  "feature_flag.toggle": Flag,
  "user.role_change": Users,
  "user.suspend": Users,
  "user.link_identity": Link2,
  "user.unlink_identity": Link2,
  "user.admin_grant": Shield,
  "user.admin_revoke": Shield,
  "jira.force_sync": Link2,
  "jira.disconnect": Link2,
};

const ACTION_COLORS: Record<string, string> = {
  create: "text-jade bg-jade/10",
  update: "text-iris bg-iris/10",
  suspend: "text-coral bg-coral/10",
  reactivate: "text-jade bg-jade/10",
  toggle: "text-amber bg-amber/10",
  change: "text-iris bg-iris/10",
  grant: "text-jade bg-jade/10",
  revoke: "text-coral bg-coral/10",
  link: "text-jade bg-jade/10",
  unlink: "text-coral bg-coral/10",
  sync: "text-iris bg-iris/10",
  disconnect: "text-coral bg-coral/10",
};

export default function AuditPage() {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});

  const { data: orgs } = useQuery({
    queryKey: ["admin", "organizations"],
    queryFn: () => organizationsApi.list({ limit: 100 }),
  });

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ["admin", "audit", selectedOrgId, actionFilter, entityTypeFilter, dateRange],
    queryFn: () =>
      auditApi.query({
        organizationId: selectedOrgId || undefined,
        action: actionFilter !== "all" ? actionFilter : undefined,
        entityType: entityTypeFilter !== "all" ? entityTypeFilter : undefined,
        from: dateRange.from,
        to: dateRange.to,
        limit: 50,
      }),
  });

  const { data: summary } = useQuery({
    queryKey: ["admin", "audit-summary", selectedOrgId],
    queryFn: () => auditApi.getSummary({ organizationId: selectedOrgId || undefined }),
  });

  const getActionIcon = (action: string) => {
    const Icon = ACTION_ICONS[action] || FileText;
    return Icon;
  };

  const getActionColor = (action: string) => {
    const actionPart = action.split(".")[1] || action;
    for (const [key, color] of Object.entries(ACTION_COLORS)) {
      if (actionPart.includes(key)) return color;
    }
    return "text-text-secondary bg-surface-03";
  };

  const formatAction = (action: string) => {
    return action
      .split(".")
      .map((part) =>
        part
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
      )
      .join(" → ");
  };

  const formatChanges = (oldValues: Record<string, unknown> | null, newValues: Record<string, unknown> | null) => {
    if (!oldValues && !newValues) return null;

    const changes: { field: string; from?: unknown; to?: unknown }[] = [];

    if (newValues) {
      Object.entries(newValues).forEach(([key, value]) => {
        if (key === "flagName") return;
        changes.push({
          field: key,
          from: oldValues?.[key],
          to: value,
        });
      });
    }

    return changes;
  };

  return (
    <div className="p-8">
      <Breadcrumb items={[{ label: "Audit Logs" }]} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Audit Logs</h1>
        <p className="text-text-secondary mt-1">
          Track all administrative actions across the platform
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-surface-01 rounded-lg border border-border-subtle">
            <p className="text-sm text-text-tertiary">Total Actions</p>
            <p className="text-2xl font-bold text-text-primary mt-1">
              {summary.totalActions}
            </p>
          </div>
          {summary.summary.slice(0, 3).map((item) => (
            <div
              key={item.action}
              className="p-4 bg-surface-01 rounded-lg border border-border-subtle"
            >
              <p className="text-sm text-text-tertiary truncate">
                {formatAction(item.action).split(" → ")[1] || formatAction(item.action)}
              </p>
              <p className="text-2xl font-bold text-text-primary mt-1">{item.count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-surface-01 rounded-lg border border-border-subtle mb-6">
        <div className="p-4">
          <div className="flex flex-wrap gap-4">
            {/* Organization Filter */}
            <div className="relative">
              <label className="block text-xs text-text-tertiary mb-1">Organization</label>
              <select
                value={selectedOrgId || ""}
                onChange={(e) => setSelectedOrgId(e.target.value || null)}
                className="w-48 px-3 py-2 bg-surface-02 border border-border-subtle rounded-lg text-sm text-text-primary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-iris/50"
              >
                <option value="">All Organizations</option>
                {orgs?.organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 bottom-2.5 w-4 h-4 text-text-tertiary pointer-events-none" />
            </div>

            {/* Action Filter */}
            <div className="relative">
              <label className="block text-xs text-text-tertiary mb-1">Action</label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-48 px-3 py-2 bg-surface-02 border border-border-subtle rounded-lg text-sm text-text-primary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-iris/50"
              >
                <option value="all">All Actions</option>
                <option value="organization.create">Org Created</option>
                <option value="organization.suspend">Org Suspended</option>
                <option value="subscription.plan_change">Plan Changed</option>
                <option value="feature_flag.toggle">Flag Toggled</option>
                <option value="user.role_change">Role Changed</option>
                <option value="jira.force_sync">JIRA Sync</option>
              </select>
              <ChevronDown className="absolute right-3 bottom-2.5 w-4 h-4 text-text-tertiary pointer-events-none" />
            </div>

            {/* Entity Type Filter */}
            <div className="relative">
              <label className="block text-xs text-text-tertiary mb-1">Entity Type</label>
              <select
                value={entityTypeFilter}
                onChange={(e) => setEntityTypeFilter(e.target.value)}
                className="w-40 px-3 py-2 bg-surface-02 border border-border-subtle rounded-lg text-sm text-text-primary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-iris/50"
              >
                <option value="all">All Types</option>
                <option value="organization">Organization</option>
                <option value="subscription">Subscription</option>
                <option value="feature_flag">Feature Flag</option>
                <option value="workspace_member">User/Member</option>
                <option value="jira_connection">JIRA</option>
              </select>
              <ChevronDown className="absolute right-3 bottom-2.5 w-4 h-4 text-text-tertiary pointer-events-none" />
            </div>

            {/* Date From */}
            <div>
              <label className="block text-xs text-text-tertiary mb-1">From</label>
              <input
                type="date"
                value={dateRange.from || ""}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, from: e.target.value || undefined }))
                }
                className="px-3 py-2 bg-surface-02 border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-iris/50"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs text-text-tertiary mb-1">To</label>
              <input
                type="date"
                value={dateRange.to || ""}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, to: e.target.value || undefined }))
                }
                className="px-3 py-2 bg-surface-02 border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-iris/50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log List */}
      <div className="bg-surface-01 rounded-lg border border-border-subtle">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Activity Log
            {auditLogs && (
              <span className="text-text-tertiary font-normal">
                ({auditLogs.total} records)
              </span>
            )}
          </h2>
        </div>
        <div className="divide-y divide-border-subtle">
          {isLoading ? (
            <div className="p-5 text-text-tertiary">Loading audit logs...</div>
          ) : auditLogs?.logs.length === 0 ? (
            <div className="p-5 text-text-tertiary text-center">No audit logs found</div>
          ) : (
            auditLogs?.logs.map((log) => {
              const Icon = getActionIcon(log.action);
              const changes = formatChanges(log.oldValues, log.newValues);

              return (
                <div key={log.id} className="p-4 hover:bg-surface-02 transition-colors">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getActionColor(
                        log.action
                      )}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-text-primary">
                          {formatAction(log.action)}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-sm text-text-tertiary mb-2">
                        by {log.adminEmail || "Unknown admin"}
                      </p>

                      {/* Changes */}
                      {changes && changes.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {changes.map((change, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 text-xs"
                            >
                              <span className="text-text-tertiary capitalize">
                                {change.field.replace("_", " ")}:
                              </span>
                              {change.from !== undefined && (
                                <>
                                  <span className="text-coral flex items-center gap-1">
                                    <ArrowDownRight className="w-3 h-3" />
                                    {String(change.from)}
                                  </span>
                                  <span className="text-text-tertiary">→</span>
                                </>
                              )}
                              <span className="text-jade flex items-center gap-1">
                                <ArrowUpRight className="w-3 h-3" />
                                {String(change.to)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Entity ID */}
                      {log.entityId && (
                        <p className="text-xs text-text-tertiary mt-2">
                          Entity: <span className="font-mono">{log.entityId}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
