/**
 * Admin API Client
 * All API calls to the main app's admin routes
 * Supports demo mode with persistent state for testing
 */

import {
  demoSyncLogs,
  demoFailedSyncs,
  demoAuditSummary,
  demoLicensingInfo,
  demoStats,
} from "./demo-data";

import {
  loadDemoState,
  addOrganization,
  updateOrganization,
  addUser,
  updateUser,
  linkUserIdentity,
  toggleFeatureFlag,
  updateLicensing,
  forceJiraSync,
  disconnectJira,
  resetDemoState,
  exportDemoStateForClient,
} from "./demo-store";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

// Demo mode toggle - set via localStorage or env
let demoMode = typeof window !== "undefined"
  ? localStorage.getItem("admin_demo_mode") === "true"
  : false;

export function setDemoMode(enabled: boolean) {
  demoMode = enabled;
  if (typeof window !== "undefined") {
    localStorage.setItem("admin_demo_mode", String(enabled));
  }
}

export function isDemoMode() {
  return demoMode;
}

export { resetDemoState, exportDemoStateForClient };

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}/api/admin${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
  });

  const result: ApiResponse<T> = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || "Request failed");
  }

  return result.data as T;
}

// Simulate network delay for demo mode
const demoDelay = () => new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 200));

// Organizations
export const organizationsApi = {
  list: async (params?: {
    status?: string;
    plan?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    if (demoMode) {
      await demoDelay();
      const state = loadDemoState();
      let orgs = [...state.organizations];
      if (params?.status) orgs = orgs.filter((o) => o.status === params.status);
      if (params?.plan) orgs = orgs.filter((o) => o.plan === params.plan);
      if (params?.search) {
        const search = params.search.toLowerCase();
        orgs = orgs.filter(
          (o) =>
            o.name.toLowerCase().includes(search) ||
            o.slug.toLowerCase().includes(search)
        );
      }
      const total = orgs.length;
      const offset = params?.offset || 0;
      const limit = params?.limit || 20;
      orgs = orgs.slice(offset, offset + limit);
      return { organizations: orgs, total };
    }

    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.plan) searchParams.set("plan", params.plan);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));

    return fetchApi<{ organizations: OrganizationWithDetails[]; total: number }>(
      `/organizations?${searchParams.toString()}`
    );
  },

  get: async (orgId: string) => {
    if (demoMode) {
      await demoDelay();
      const state = loadDemoState();
      const org = state.organizations.find((o) => o.id === orgId);
      if (!org) throw new Error("Organization not found");
      return { organization: org };
    }
    return fetchApi<{ organization: OrganizationWithDetails }>(`/organizations/${orgId}`);
  },

  create: async (data: CreateOrganizationInput) => {
    if (demoMode) {
      await demoDelay();
      const newOrg: OrganizationWithDetails = {
        id: `org-${Date.now()}`,
        name: data.name,
        slug: data.slug || data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        plan: data.plan || "free",
        status: "active",
        settings: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        workspaces: data.createDefaultWorkspace !== false ? [
          { id: `ws-${Date.now()}`, name: "Default Workspace", memberCount: 1 }
        ] : [],
        subscription: {
          plan: data.plan || "free",
          status: "active",
          seatsTotal: data.plan === "enterprise" ? 100 : data.plan === "pro" ? 25 : 5,
          seatsUsed: 1,
        },
      };

      addOrganization(newOrg);

      // Also create the owner user
      const ownerUser: UserWithMembership = {
        id: `user-${Date.now()}`,
        email: data.ownerEmail,
        fullName: data.ownerEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
        displayName: null,
        avatarUrl: null,
        isAdmin: false,
        workspaceId: newOrg.workspaces[0]?.id || null,
        createdAt: new Date().toISOString(),
        membership: {
          id: `mem-${Date.now()}`,
          role: "owner",
          status: "active",
          joinedAt: new Date().toISOString(),
        },
        identities: [],
      };

      addUser(ownerUser);

      return { organization: newOrg, workspaceId: newOrg.workspaces[0]?.id };
    }
    return fetchApi<{ organization: Organization; workspaceId?: string }>(
      "/organizations",
      { method: "POST", body: JSON.stringify(data) }
    );
  },

  update: async (orgId: string, data: UpdateOrganizationInput) => {
    if (demoMode) {
      await demoDelay();
      const updated = updateOrganization(orgId, data);
      if (!updated) throw new Error("Organization not found");
      return { organization: updated };
    }
    return fetchApi<{ organization: Organization }>(`/organizations/${orgId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deactivate: async (orgId: string) => {
    if (demoMode) {
      await demoDelay();
      updateOrganization(orgId, { status: "deactivated" });
      return { message: "Organization deactivated" };
    }
    return fetchApi<{ message: string }>(`/organizations/${orgId}`, { method: "DELETE" });
  },

  suspend: async (orgId: string, reason?: string) => {
    if (demoMode) {
      await demoDelay();
      updateOrganization(orgId, {
        status: "suspended",
        settings: { suspendReason: reason, suspendedAt: new Date().toISOString() }
      });
      return { message: "Organization suspended" };
    }
    return fetchApi<{ message: string }>(`/organizations/${orgId}/suspend`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  reactivate: async (orgId: string) => {
    if (demoMode) {
      await demoDelay();
      updateOrganization(orgId, { status: "active" });
      return { message: "Organization reactivated" };
    }
    return fetchApi<{ message: string }>(`/organizations/${orgId}/reactivate`, {
      method: "POST",
    });
  },
};

// Users
export const usersApi = {
  list: async (params: {
    organizationId: string;
    role?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    if (demoMode) {
      await demoDelay();
      const state = loadDemoState();
      const org = state.organizations.find(o => o.id === params.organizationId);
      if (!org) return { users: [], total: 0 };

      let users = state.users.filter((u) => {
        return org.workspaces.some((w) => w.id === u.workspaceId);
      });
      if (params.role && params.role !== "all") {
        users = users.filter((u) => u.membership?.role === params.role);
      }
      if (params.status && params.status !== "all") {
        users = users.filter((u) => u.membership?.status === params.status);
      }
      if (params.search) {
        const search = params.search.toLowerCase();
        users = users.filter(
          (u) =>
            u.email.toLowerCase().includes(search) ||
            u.fullName?.toLowerCase().includes(search)
        );
      }
      const total = users.length;
      const offset = params.offset || 0;
      const limit = params.limit || 20;
      users = users.slice(offset, offset + limit);
      return { users, total };
    }

    const searchParams = new URLSearchParams();
    searchParams.set("organizationId", params.organizationId);
    if (params.role) searchParams.set("role", params.role);
    if (params.status) searchParams.set("status", params.status);
    if (params.search) searchParams.set("search", params.search);
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.offset) searchParams.set("offset", String(params.offset));

    return fetchApi<{ users: UserWithMembership[]; total: number }>(
      `/users?${searchParams.toString()}`
    );
  },

  get: async (userId: string) => {
    if (demoMode) {
      await demoDelay();
      const state = loadDemoState();
      const user = state.users.find((u) => u.id === userId);
      if (!user) throw new Error("User not found");
      return { user };
    }
    return fetchApi<{ user: UserWithMembership }>(`/users/${userId}`);
  },

  update: async (userId: string, data: UpdateUserInput) => {
    if (demoMode) {
      await demoDelay();
      const updates: Partial<UserWithMembership> = {};

      if (data.isAdmin !== undefined) {
        updates.isAdmin = data.isAdmin;
      }

      if (data.role) {
        updates.membership = { role: data.role } as UserWithMembership["membership"];
      }

      const updated = updateUser(userId, updates);
      if (!updated) throw new Error("User not found");
      return { user: updated };
    }
    return fetchApi<{ user: UserWithMembership }>(`/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  linkIdentity: async (userId: string, data: LinkIdentityInput) => {
    if (demoMode) {
      await demoDelay();
      linkUserIdentity(userId, {
        provider: data.provider,
        providerAccountId: data.providerAccountId,
        displayName: data.displayName || null,
      });
      return {
        identity: {
          id: `identity-${Date.now()}`,
          userId,
          provider: data.provider,
          providerAccountId: data.providerAccountId,
          displayName: data.displayName || null,
          linkedAt: new Date().toISOString(),
        },
      };
    }
    return fetchApi<{ identity: IdentityMapping }>(`/users/${userId}/identity`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  unlinkIdentity: async (userId: string, data: { provider: string; workspaceId?: string }) => {
    if (demoMode) {
      await demoDelay();
      const state = loadDemoState();
      const user = state.users.find(u => u.id === userId);
      if (user) {
        user.identities = user.identities.filter(i => i.provider !== data.provider);
      }
      return { message: "Identity unlinked" };
    }
    return fetchApi<{ message: string }>(`/users/${userId}/identity`, {
      method: "DELETE",
      body: JSON.stringify(data),
    });
  },

  create: async (data: { email: string; workspaceId: string; role?: string }) => {
    if (demoMode) {
      await demoDelay();
      const newUser: UserWithMembership = {
        id: `user-${Date.now()}`,
        email: data.email,
        fullName: data.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
        displayName: null,
        avatarUrl: null,
        isAdmin: false,
        workspaceId: data.workspaceId,
        createdAt: new Date().toISOString(),
        membership: {
          id: `mem-${Date.now()}`,
          role: (data.role as "owner" | "admin" | "member" | "viewer") || "member",
          status: "active",
          joinedAt: new Date().toISOString(),
        },
        identities: [],
      };
      addUser(newUser);
      return { user: newUser };
    }
    return fetchApi<{ user: UserWithMembership }>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// Licensing
export const licensingApi = {
  get: async (organizationId: string) => {
    if (demoMode) {
      await demoDelay();
      const state = loadDemoState();
      const org = state.organizations.find((o) => o.id === organizationId);
      if (!org) throw new Error("Organization not found");

      const planLimits = {
        free: { seats: 5, workspaces: 1, jiraConnections: 1, features: ["basic_scoring"] },
        pro: { seats: 25, workspaces: 3, jiraConnections: 1, features: ["basic_scoring", "advanced_analytics", "custom_rubrics"] },
        enterprise: { seats: 100, workspaces: 10, jiraConnections: 5, features: ["basic_scoring", "advanced_analytics", "custom_rubrics", "multi_jira", "api_access"] },
      };

      const limits = planLimits[org.plan] || planLimits.free;
      const violations: string[] = [];

      if (org.subscription && org.subscription.seatsUsed > limits.seats) {
        violations.push(`Seat limit exceeded: ${org.subscription.seatsUsed}/${limits.seats}`);
      }
      if (org.workspaces.length > limits.workspaces) {
        violations.push(`Workspace limit exceeded: ${org.workspaces.length}/${limits.workspaces}`);
      }

      return {
        subscription: {
          id: `sub-${org.id}`,
          plan: org.plan,
          status: org.subscription?.status || "active",
          seatsTotal: org.subscription?.seatsTotal || limits.seats,
          seatsUsed: org.subscription?.seatsUsed || 0,
        },
        featureFlags: state.featureFlags[organizationId] || [],
        limits: { withinLimits: violations.length === 0, violations },
        planLimits: limits,
      };
    }
    const searchParams = new URLSearchParams({ organizationId });
    return fetchApi<LicensingInfo>(`/licensing?${searchParams.toString()}`);
  },

  update: async (data: UpdateLicensingInput) => {
    if (demoMode) {
      await demoDelay();
      updateLicensing(data.organizationId, { plan: data.plan, seatsTotal: data.seatsTotal });
      return licensingApi.get(data.organizationId);
    }
    return fetchApi<LicensingInfo>("/licensing", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};

// Feature Flags
export const featureFlagsApi = {
  get: async (organizationId: string) => {
    if (demoMode) {
      await demoDelay();
      const state = loadDemoState();
      const org = state.organizations.find((o) => o.id === organizationId);
      if (!org) throw new Error("Organization not found");

      const availableFlags =
        org.plan === "enterprise"
          ? ["basic_scoring", "multi_jira", "advanced_analytics", "cross_workspace_analytics", "custom_rubrics", "api_access", "white_label", "sso"]
          : org.plan === "pro"
          ? ["basic_scoring", "advanced_analytics", "custom_rubrics"]
          : ["basic_scoring"];

      return {
        featureFlags: state.featureFlags[organizationId] || [],
        plan: org.plan,
        availableFlags,
      };
    }
    const searchParams = new URLSearchParams({ organizationId });
    return fetchApi<FeatureFlagsInfo>(`/feature-flags?${searchParams.toString()}`);
  },

  toggle: async (data: ToggleFeatureFlagInput) => {
    if (demoMode) {
      await demoDelay();
      const flag = toggleFeatureFlag(data.organizationId, data.flagName, data.enabled);
      return { featureFlag: flag };
    }
    return fetchApi<{ featureFlag: FeatureFlag }>("/feature-flags", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// JIRA
export const jiraApi = {
  listConnections: async (params?: {
    organizationId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) => {
    if (demoMode) {
      await demoDelay();
      const state = loadDemoState();
      let connections = [...state.jiraConnections];
      if (params?.organizationId) {
        connections = connections.filter((c) => c.organizationId === params.organizationId);
      }
      if (params?.status === "active") {
        connections = connections.filter((c) => c.isActive);
      } else if (params?.status === "inactive") {
        connections = connections.filter((c) => !c.isActive);
      }
      const total = connections.length;
      const offset = params?.offset || 0;
      const limit = params?.limit || 20;
      connections = connections.slice(offset, offset + limit);
      return { connections, total };
    }

    const searchParams = new URLSearchParams();
    if (params?.organizationId) searchParams.set("organizationId", params.organizationId);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));

    return fetchApi<{ connections: JiraConnectionWithWorkspace[]; total: number }>(
      `/jira?${searchParams.toString()}`
    );
  },

  getConnection: async (connectionId: string, logsLimit?: number) => {
    if (demoMode) {
      await demoDelay();
      const state = loadDemoState();
      const conn = state.jiraConnections.find((c) => c.id === connectionId);
      if (!conn) throw new Error("Connection not found");
      return {
        connection: conn,
        syncLogs: demoSyncLogs.slice(0, logsLimit || 10),
        totalLogs: demoSyncLogs.length,
      };
    }
    const searchParams = new URLSearchParams();
    if (logsLimit) searchParams.set("logsLimit", String(logsLimit));

    return fetchApi<JiraConnectionDetails>(
      `/jira/${connectionId}?${searchParams.toString()}`
    );
  },

  forceSync: async (connectionId: string, fullSync?: boolean) => {
    if (demoMode) {
      await demoDelay();
      forceJiraSync(connectionId);
      return { message: "Sync started", syncLogId: `sync-${Date.now()}` };
    }
    return fetchApi<{ message: string; syncLogId: string }>(`/jira/${connectionId}`, {
      method: "POST",
      body: JSON.stringify({ fullSync }),
    });
  },

  disconnect: async (connectionId: string) => {
    if (demoMode) {
      await demoDelay();
      disconnectJira(connectionId);
      return { message: "Connection disconnected" };
    }
    return fetchApi<{ message: string }>(`/jira/${connectionId}`, { method: "DELETE" });
  },

  getFailedSyncs: async (params?: { organizationId?: string; hours?: number; limit?: number }) => {
    if (demoMode) {
      await demoDelay();
      const now = new Date();
      const hours = params?.hours || 24;
      const from = new Date(now.getTime() - hours * 60 * 60 * 1000);
      let failed = demoFailedSyncs;
      if (params?.organizationId) {
        failed = failed.filter((f) => f.organizationId === params.organizationId);
      }
      const errorSummary: Record<string, number> = {};
      failed.forEach((f) => {
        f.errors.forEach((e) => {
          errorSummary[e.code] = (errorSummary[e.code] || 0) + 1;
        });
      });
      return {
        failedSyncs: failed.slice(0, params?.limit || 20),
        total: failed.length,
        errorSummary,
        timeRange: { hours, from: from.toISOString(), to: now.toISOString() },
      };
    }

    const searchParams = new URLSearchParams();
    if (params?.organizationId) searchParams.set("organizationId", params.organizationId);
    if (params?.hours) searchParams.set("hours", String(params.hours));
    if (params?.limit) searchParams.set("limit", String(params.limit));

    return fetchApi<FailedSyncsInfo>(`/jira/failed-syncs?${searchParams.toString()}`);
  },
};

// Audit
export const auditApi = {
  query: async (params?: {
    adminUserId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    organizationId?: string;
    workspaceId?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) => {
    if (demoMode) {
      await demoDelay();
      const state = loadDemoState();
      let logs = [...state.auditLogs];
      if (params?.action && params.action !== "all") {
        logs = logs.filter((l) => l.action === params.action);
      }
      if (params?.entityType && params.entityType !== "all") {
        logs = logs.filter((l) => l.entityType === params.entityType);
      }
      if (params?.organizationId) {
        logs = logs.filter((l) => l.organizationId === params.organizationId);
      }
      const total = logs.length;
      const offset = params?.offset || 0;
      const limit = params?.limit || 20;
      logs = logs.slice(offset, offset + limit);
      return { logs, total };
    }

    const searchParams = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined) searchParams.set(key, String(value));
    });

    return fetchApi<{ logs: AuditLogRecord[]; total: number }>(
      `/audit?${searchParams.toString()}`
    );
  },

  getSummary: async (params?: { organizationId?: string; from?: string; to?: string }) => {
    if (demoMode) {
      await demoDelay();
      const state = loadDemoState();

      // Generate summary from actual audit logs
      const actionCounts: Record<string, number> = {};
      state.auditLogs.forEach(log => {
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      });

      const summary = Object.entries(actionCounts).map(([action, count]) => ({ action, count }));

      return {
        summary,
        totalActions: state.auditLogs.length,
        timeRange: { from: params?.from || null, to: params?.to || null },
      };
    }

    const searchParams = new URLSearchParams();
    if (params?.organizationId) searchParams.set("organizationId", params.organizationId);
    if (params?.from) searchParams.set("from", params.from);
    if (params?.to) searchParams.set("to", params.to);

    return fetchApi<AuditSummary>(`/audit/summary?${searchParams.toString()}`);
  },
};

// Stats for dashboard
export const statsApi = {
  getDashboardStats: async () => {
    if (demoMode) {
      await demoDelay();
      const state = loadDemoState();
      return {
        totalOrganizations: state.organizations.length,
        activeOrganizations: state.organizations.filter((o) => o.status === "active").length,
        totalJiraConnections: state.jiraConnections.length,
        failedSyncs24h: demoFailedSyncs.length,
        totalAdminActions: state.auditLogs.length,
        planBreakdown: {
          free: state.organizations.filter((o) => o.plan === "free").length,
          pro: state.organizations.filter((o) => o.plan === "pro").length,
          enterprise: state.organizations.filter((o) => o.plan === "enterprise").length,
        },
      };
    }
    return fetchApi<typeof demoStats>("/stats");
  },
};

// Types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "pro" | "enterprise";
  status: "active" | "suspended" | "deactivated";
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationWithDetails extends Organization {
  workspaces: { id: string; name: string; memberCount: number }[];
  subscription: {
    plan: string;
    status: string;
    seatsTotal: number;
    seatsUsed: number;
  } | null;
}

export interface CreateOrganizationInput {
  name: string;
  slug?: string;
  plan?: "free" | "pro" | "enterprise";
  ownerEmail: string;
  ownerUserId?: string;
  createDefaultWorkspace?: boolean;
}

export interface UpdateOrganizationInput {
  name?: string;
  plan?: "free" | "pro" | "enterprise";
  status?: "active" | "suspended" | "deactivated";
  settings?: Record<string, unknown>;
}

export interface UserWithMembership {
  id: string;
  email: string;
  fullName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  workspaceId: string | null;
  createdAt: string;
  membership: {
    id: string;
    role: "owner" | "admin" | "member" | "viewer";
    status: string;
    joinedAt: string;
  } | null;
  identities: {
    provider: string;
    providerAccountId: string;
    displayName: string | null;
  }[];
}

export interface UpdateUserInput {
  membershipId?: string;
  role?: "admin" | "member" | "viewer";
  suspend?: boolean;
  reactivate?: boolean;
  isAdmin?: boolean;
  reason?: string;
}

export interface LinkIdentityInput {
  provider: "jira" | "github" | "slack";
  providerAccountId: string;
  providerConnectionId?: string;
  workspaceId?: string;
  displayName?: string;
  email?: string;
}

export interface IdentityMapping {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
  displayName: string | null;
  linkedAt: string;
}

export interface LicensingInfo {
  subscription: {
    id: string;
    plan: "free" | "pro" | "enterprise";
    status: string;
    seatsTotal: number;
    seatsUsed: number;
  };
  featureFlags: FeatureFlag[];
  limits: { withinLimits: boolean; violations: string[] };
  planLimits: {
    seats: number;
    workspaces: number;
    jiraConnections: number;
    features: string[];
  };
}

export interface UpdateLicensingInput {
  organizationId: string;
  plan?: "free" | "pro" | "enterprise";
  seatsTotal?: number;
}

export interface FeatureFlag {
  id: string;
  flagName: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface FeatureFlagsInfo {
  featureFlags: FeatureFlag[];
  plan: string;
  availableFlags: string[];
}

export interface ToggleFeatureFlagInput {
  organizationId: string;
  flagName: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface JiraConnectionWithWorkspace {
  id: string;
  workspaceId: string;
  cloudId: string;
  siteName: string;
  siteUrl: string;
  isActive: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  storiesSynced: number;
  workspaceName: string | null;
  organizationId: string | null;
  organizationName: string | null;
}

export interface JiraConnectionDetails {
  connection: JiraConnectionWithWorkspace;
  syncLogs: SyncLog[];
  totalLogs: number;
}

export interface SyncLog {
  id: string;
  status: string;
  syncType: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  storiesSynced: number;
  storiesCreated: number;
  storiesUpdated: number;
  usersDiscovered: number;
  errors: { code: string; message: string }[];
  warnings: string[];
}

export interface FailedSyncsInfo {
  failedSyncs: (SyncLog & {
    workspaceName: string | null;
    organizationName: string | null;
    siteName: string | null;
  })[];
  total: number;
  errorSummary: Record<string, number>;
  timeRange: { hours: number; from: string; to: string };
}

export interface AuditLogRecord {
  id: string;
  adminUserId: string;
  adminEmail?: string;
  action: string;
  entityType: string;
  entityId: string | null;
  organizationId: string | null;
  workspaceId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditSummary {
  summary: { action: string; count: number }[];
  totalActions: number;
  timeRange: { from: string | null; to: string | null };
}
