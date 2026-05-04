"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jiraApi } from "@/lib/api";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import {
  Link2,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";

export default function JiraPage() {
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: connections, isLoading } = useQuery({
    queryKey: ["admin", "jira", "connections"],
    queryFn: () => jiraApi.listConnections({ limit: 100 }),
  });

  const { data: failedSyncs } = useQuery({
    queryKey: ["admin", "jira", "failed-syncs"],
    queryFn: () => jiraApi.getFailedSyncs({ hours: 24 }),
  });

  const { data: connectionDetails } = useQuery({
    queryKey: ["admin", "jira", "connection", selectedConnection],
    queryFn: () => (selectedConnection ? jiraApi.getConnection(selectedConnection) : null),
    enabled: !!selectedConnection,
  });

  const forceSyncMutation = useMutation({
    mutationFn: (connectionId: string) => jiraApi.forceSync(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "jira"] });
    },
  });

  const getSyncStatusIcon = (status: string | null) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-jade" />;
      case "in_progress":
        return <RefreshCw className="w-4 h-4 text-iris animate-spin" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-coral" />;
      case "partial":
        return <AlertCircle className="w-4 h-4 text-amber" />;
      default:
        return <Clock className="w-4 h-4 text-text-tertiary" />;
    }
  };

  return (
    <div className="p-8">
      <Breadcrumb items={[{ label: "JIRA" }]} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">JIRA Management</h1>
        <p className="text-text-secondary mt-1">
          Monitor and manage JIRA connections across all organizations
        </p>
      </div>

      {/* Failed Syncs Alert */}
      {failedSyncs && failedSyncs.total > 0 && (
        <div className="mb-6 p-4 bg-coral/10 border border-coral/20 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-coral" />
            <div>
              <p className="font-medium text-text-primary">
                {failedSyncs.total} failed syncs in the last 24 hours
              </p>
              <p className="text-sm text-text-secondary mt-0.5">
                Error breakdown:{" "}
                {Object.entries(failedSyncs.errorSummary)
                  .map(([code, count]) => `${code}: ${count}`)
                  .join(", ")}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connections List */}
        <div className="bg-surface-01 rounded-lg border border-border-subtle">
          <div className="px-5 py-4 border-b border-border-subtle">
            <h2 className="font-semibold text-text-primary">JIRA Connections</h2>
          </div>
          <div className="divide-y divide-border-subtle max-h-[600px] overflow-auto">
            {isLoading ? (
              <div className="p-5 text-text-tertiary">Loading...</div>
            ) : connections?.connections.length === 0 ? (
              <div className="p-5 text-text-tertiary">No JIRA connections</div>
            ) : (
              connections?.connections.map((conn) => (
                <div
                  key={conn.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedConnection === conn.id
                      ? "bg-iris/5"
                      : "hover:bg-surface-02"
                  }`}
                  onClick={() => setSelectedConnection(conn.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          conn.isActive
                            ? "bg-jade/10 text-jade"
                            : "bg-surface-03 text-text-tertiary"
                        }`}
                      >
                        <Link2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">
                          {conn.siteName}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {conn.organizationName || "Unknown org"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getSyncStatusIcon(conn.lastSyncStatus)}
                      <span className="text-xs text-text-tertiary">
                        {conn.storiesSynced} stories
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Connection Details */}
        <div className="bg-surface-01 rounded-lg border border-border-subtle">
          <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
            <h2 className="font-semibold text-text-primary">Connection Details</h2>
            {selectedConnection && (
              <button
                onClick={() => forceSyncMutation.mutate(selectedConnection)}
                disabled={forceSyncMutation.isPending}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-iris hover:bg-iris/90 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                <RefreshCw
                  className={`w-4 h-4 ${forceSyncMutation.isPending ? "animate-spin" : ""}`}
                />
                Force Sync
              </button>
            )}
          </div>
          <div className="p-5">
            {!selectedConnection ? (
              <p className="text-text-tertiary text-center py-8">
                Select a connection to view details
              </p>
            ) : !connectionDetails ? (
              <p className="text-text-tertiary">Loading...</p>
            ) : (
              <div className="space-y-6">
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-text-tertiary">Site URL</p>
                    <p className="text-sm text-text-primary">
                      {connectionDetails.connection.siteUrl}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary">Workspace</p>
                    <p className="text-sm text-text-primary">
                      {connectionDetails.connection.workspaceName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary">Last Sync</p>
                    <p className="text-sm text-text-primary">
                      {connectionDetails.connection.lastSyncAt
                        ? new Date(
                            connectionDetails.connection.lastSyncAt
                          ).toLocaleString()
                        : "Never"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary">Status</p>
                    <p className="text-sm text-text-primary flex items-center gap-1.5">
                      {getSyncStatusIcon(connectionDetails.connection.lastSyncStatus)}
                      {connectionDetails.connection.lastSyncStatus || "Unknown"}
                    </p>
                  </div>
                </div>

                {/* Recent Sync Logs */}
                <div>
                  <p className="text-sm font-medium text-text-primary mb-3">
                    Recent Sync Logs
                  </p>
                  <div className="space-y-2">
                    {connectionDetails.syncLogs.length === 0 ? (
                      <p className="text-sm text-text-tertiary">No sync logs</p>
                    ) : (
                      connectionDetails.syncLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between py-2 px-3 bg-surface-02 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            {getSyncStatusIcon(log.status)}
                            <span className="text-sm text-text-primary">
                              {log.syncType}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-text-tertiary">
                              {new Date(log.startedAt).toLocaleString()}
                            </p>
                            <p className="text-xs text-text-secondary">
                              {log.storiesSynced} stories
                              {log.durationMs && ` • ${Math.round(log.durationMs / 1000)}s`}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
