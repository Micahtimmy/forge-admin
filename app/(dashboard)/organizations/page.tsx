"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationsApi } from "@/lib/api";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Building2, Plus, Search, MoreVertical, Pause, Play, Trash2, Settings } from "lucide-react";
import Link from "next/link";
import { CreateOrganizationModal } from "@/components/create-organization-modal";

export default function OrganizationsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [planFilter, setPlanFilter] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "organizations", search, statusFilter, planFilter],
    queryFn: () =>
      organizationsApi.list({
        search: search || undefined,
        status: statusFilter || undefined,
        plan: planFilter || undefined,
        limit: 50,
      }),
  });

  const suspendMutation = useMutation({
    mutationFn: (orgId: string) => organizationsApi.suspend(orgId, "Suspended by admin"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
      setActiveMenu(null);
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (orgId: string) => organizationsApi.reactivate(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
      setActiveMenu(null);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (orgId: string) => organizationsApi.deactivate(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
      setActiveMenu(null);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "bg-jade/10 text-jade";
      case "suspended":
        return "bg-amber/10 text-amber";
      case "deactivated":
        return "bg-coral/10 text-coral";
      default:
        return "bg-surface-03 text-text-tertiary";
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case "enterprise":
        return "bg-iris/10 text-iris";
      case "pro":
        return "bg-jade/10 text-jade";
      default:
        return "bg-surface-03 text-text-tertiary";
    }
  };

  return (
    <div className="p-8">
      <Breadcrumb items={[{ label: "Organizations" }]} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Organizations</h1>
          <p className="text-text-secondary mt-1">
            Manage all organizations on the platform
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-iris hover:bg-iris/90 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Organization
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-01 border border-border-subtle rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-iris/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-surface-01 border border-border-subtle rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-iris/50"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="deactivated">Deactivated</option>
        </select>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="px-4 py-2 bg-surface-01 border border-border-subtle rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-iris/50"
        >
          <option value="">All plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface-01 rounded-lg border border-border-subtle overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="text-left px-5 py-3 text-sm font-medium text-text-secondary">
                Organization
              </th>
              <th className="text-left px-5 py-3 text-sm font-medium text-text-secondary">
                Plan
              </th>
              <th className="text-left px-5 py-3 text-sm font-medium text-text-secondary">
                Status
              </th>
              <th className="text-left px-5 py-3 text-sm font-medium text-text-secondary">
                Workspaces
              </th>
              <th className="text-left px-5 py-3 text-sm font-medium text-text-secondary">
                Created
              </th>
              <th className="text-right px-5 py-3 text-sm font-medium text-text-secondary">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-text-tertiary">
                  Loading...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-coral">
                  Failed to load organizations
                </td>
              </tr>
            ) : data?.organizations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-text-tertiary">
                  No organizations found
                </td>
              </tr>
            ) : (
              data?.organizations.map((org) => (
                <tr
                  key={org.id}
                  className="border-b border-border-subtle last:border-0 hover:bg-surface-02 transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-surface-03 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-text-tertiary" />
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">{org.name}</p>
                        <p className="text-sm text-text-tertiary">{org.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-xs px-2 py-1 rounded ${getPlanBadge(org.plan)}`}
                    >
                      {org.plan}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-xs px-2 py-1 rounded ${getStatusBadge(org.status)}`}
                    >
                      {org.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-text-secondary">
                    {org.workspaces?.length || 0} workspace{(org.workspaces?.length || 0) !== 1 ? "s" : ""}
                  </td>
                  <td className="px-5 py-4 text-sm text-text-secondary">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setActiveMenu(activeMenu === org.id ? null : org.id)}
                        className="p-2 rounded-lg hover:bg-surface-03 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-text-tertiary" />
                      </button>

                      {activeMenu === org.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setActiveMenu(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-surface-02 border border-border-subtle rounded-lg shadow-xl py-1">
                            <Link
                              href={`/licensing?org=${org.id}`}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-surface-03 transition-colors"
                              onClick={() => setActiveMenu(null)}
                            >
                              <Settings className="w-4 h-4" />
                              Manage Licensing
                            </Link>
                            {org.status === "active" && (
                              <button
                                onClick={() => suspendMutation.mutate(org.id)}
                                disabled={suspendMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-amber hover:bg-surface-03 transition-colors w-full text-left"
                              >
                                <Pause className="w-4 h-4" />
                                Suspend Organization
                              </button>
                            )}
                            {org.status === "suspended" && (
                              <button
                                onClick={() => reactivateMutation.mutate(org.id)}
                                disabled={reactivateMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-jade hover:bg-surface-03 transition-colors w-full text-left"
                              >
                                <Play className="w-4 h-4" />
                                Reactivate
                              </button>
                            )}
                            {org.status !== "deactivated" && (
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to deactivate "${org.name}"? This action cannot be undone.`)) {
                                    deactivateMutation.mutate(org.id);
                                  }
                                }}
                                disabled={deactivateMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-coral hover:bg-surface-03 transition-colors w-full text-left"
                              >
                                <Trash2 className="w-4 h-4" />
                                Deactivate
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="mt-4 text-sm text-text-tertiary">
          Showing {data.organizations.length} of {data.total} organizations
        </div>
      )}

      <CreateOrganizationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
