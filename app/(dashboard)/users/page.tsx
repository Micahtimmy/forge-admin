"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, organizationsApi } from "@/lib/api";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import {
  Users,
  Search,
  Shield,
  ShieldCheck,
  UserCog,
  Eye,
  Calendar,
  Link2,
  ChevronDown,
  UserPlus,
} from "lucide-react";
import { AddUserModal } from "@/components/add-user-modal";

export default function UsersPage() {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: orgs } = useQuery({
    queryKey: ["admin", "organizations"],
    queryFn: () => organizationsApi.list({ limit: 100 }),
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin", "users", selectedOrgId, search, roleFilter],
    queryFn: () =>
      usersApi.list({
        organizationId: selectedOrgId!,
        search: search || undefined,
        role: roleFilter !== "all" ? roleFilter : undefined,
        limit: 50,
      }),
    enabled: !!selectedOrgId,
  });

  const { data: userDetails } = useQuery({
    queryKey: ["admin", "user", selectedUserId],
    queryFn: () => (selectedUserId ? usersApi.get(selectedUserId) : null),
    enabled: !!selectedUserId,
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Parameters<typeof usersApi.update>[1] }) =>
      usersApi.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "user"] });
    },
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <ShieldCheck className="w-4 h-4 text-amber" />;
      case "admin":
        return <Shield className="w-4 h-4 text-iris" />;
      case "member":
        return <UserCog className="w-4 h-4 text-jade" />;
      case "viewer":
        return <Eye className="w-4 h-4 text-text-tertiary" />;
      default:
        return null;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-amber/10 text-amber border-amber/20";
      case "admin":
        return "bg-iris/10 text-iris border-iris/20";
      case "member":
        return "bg-jade/10 text-jade border-jade/20";
      case "viewer":
        return "bg-surface-03 text-text-secondary border-border-subtle";
      default:
        return "bg-surface-03 text-text-secondary border-border-subtle";
    }
  };

  return (
    <div className="p-8">
      <Breadcrumb items={[{ label: "Users" }]} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">User Management</h1>
        <p className="text-text-secondary mt-1">
          View and manage users across all organizations
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
            onChange={(e) => {
              setSelectedOrgId(e.target.value || null);
              setSelectedUserId(null);
            }}
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

      {selectedOrgId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users List */}
          <div className="lg:col-span-2 bg-surface-01 rounded-lg border border-border-subtle">
            <div className="px-5 py-4 border-b border-border-subtle">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-text-primary flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Users
                  {users && (
                    <span className="text-text-tertiary font-normal">
                      ({users.total})
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-jade hover:bg-jade/90 text-white text-sm rounded-lg transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Add User
                </button>
              </div>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-surface-02 border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-iris/50"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 bg-surface-02 border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-iris/50"
                >
                  <option value="all">All roles</option>
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>

            <div className="divide-y divide-border-subtle max-h-[600px] overflow-auto">
              {isLoading ? (
                <div className="p-5 text-text-tertiary">Loading users...</div>
              ) : users?.users.length === 0 ? (
                <div className="p-5 text-text-tertiary text-center">
                  No users found
                </div>
              ) : (
                users?.users.map((user) => (
                  <div
                    key={user.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedUserId === user.id
                        ? "bg-iris/5"
                        : "hover:bg-surface-02"
                    }`}
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-surface-03 flex items-center justify-center text-text-secondary font-medium">
                          {user.fullName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-text-primary">
                            {user.fullName || user.email.split("@")[0]}
                          </p>
                          <p className="text-xs text-text-tertiary">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.membership && (
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full border ${getRoleBadgeColor(
                              user.membership.role
                            )}`}
                          >
                            {user.membership.role}
                          </span>
                        )}
                        {user.isAdmin && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-coral/10 text-coral border border-coral/20">
                            Platform Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* User Details */}
          <div className="bg-surface-01 rounded-lg border border-border-subtle">
            <div className="px-5 py-4 border-b border-border-subtle">
              <h2 className="font-semibold text-text-primary">User Details</h2>
            </div>
            <div className="p-5">
              {!selectedUserId ? (
                <p className="text-text-tertiary text-center py-8">
                  Select a user to view details
                </p>
              ) : !userDetails ? (
                <p className="text-text-tertiary">Loading...</p>
              ) : (
                <div className="space-y-6">
                  {/* Profile */}
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-surface-03 flex items-center justify-center text-text-secondary font-medium text-xl mx-auto mb-3">
                      {userDetails.user.fullName?.charAt(0) ||
                        userDetails.user.email.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="font-semibold text-text-primary">
                      {userDetails.user.fullName || "No name"}
                    </h3>
                    <p className="text-sm text-text-tertiary">{userDetails.user.email}</p>
                  </div>

                  {/* Info Grid */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-surface-02 rounded-lg">
                      {userDetails.user.membership && (
                        <>
                          {getRoleIcon(userDetails.user.membership.role)}
                          <div className="flex-1">
                            <p className="text-xs text-text-tertiary">Role</p>
                            <p className="text-sm text-text-primary capitalize">
                              {userDetails.user.membership.role}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-surface-02 rounded-lg">
                      <Calendar className="w-4 h-4 text-text-tertiary" />
                      <div className="flex-1">
                        <p className="text-xs text-text-tertiary">Joined</p>
                        <p className="text-sm text-text-primary">
                          {new Date(userDetails.user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Linked Identities */}
                  <div>
                    <p className="text-sm font-medium text-text-primary mb-3">
                      Linked Identities
                    </p>
                    {userDetails.user.identities.length === 0 ? (
                      <p className="text-sm text-text-tertiary p-3 bg-surface-02 rounded-lg">
                        No linked identities
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {userDetails.user.identities.map((identity, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 bg-surface-02 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <Link2 className="w-4 h-4 text-text-tertiary" />
                              <div>
                                <p className="text-sm text-text-primary capitalize">
                                  {identity.provider}
                                </p>
                                <p className="text-xs text-text-tertiary">
                                  {identity.displayName || identity.providerAccountId}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-4 border-t border-border-subtle">
                    <p className="text-xs text-text-tertiary mb-3">Actions</p>
                    <select
                      value={userDetails.user.membership?.role || ""}
                      onChange={(e) => {
                        if (userDetails.user.membership) {
                          updateUserMutation.mutate({
                            userId: userDetails.user.id,
                            data: {
                              membershipId: userDetails.user.membership.id,
                              role: e.target.value as "admin" | "member" | "viewer",
                            },
                          });
                        }
                      }}
                      className="w-full px-3 py-2 bg-surface-02 border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-iris/50"
                      disabled={userDetails.user.membership?.role === "owner"}
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                      {userDetails.user.membership?.role === "owner" && (
                        <option value="owner">Owner (cannot change)</option>
                      )}
                    </select>
                    <button
                      onClick={() =>
                        updateUserMutation.mutate({
                          userId: userDetails.user.id,
                          data: { isAdmin: !userDetails.user.isAdmin },
                        })
                      }
                      className={`w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                        userDetails.user.isAdmin
                          ? "bg-coral/10 text-coral hover:bg-coral/20"
                          : "bg-iris/10 text-iris hover:bg-iris/20"
                      }`}
                    >
                      {userDetails.user.isAdmin
                        ? "Revoke Platform Admin"
                        : "Grant Platform Admin"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedOrgId && orgs?.organizations && (
        <AddUserModal
          isOpen={showAddUserModal}
          onClose={() => setShowAddUserModal(false)}
          organization={orgs.organizations.find(o => o.id === selectedOrgId)!}
        />
      )}
    </div>
  );
}
