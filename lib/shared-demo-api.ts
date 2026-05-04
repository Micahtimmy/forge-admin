/**
 * Shared Demo API Client
 *
 * Connects to the main app's demo state API for synced demo experience.
 * Changes made here reflect in the main app's demo mode and vice versa.
 */

// Main app URL for demo state API
const MAIN_APP_URL = process.env.NEXT_PUBLIC_MAIN_APP_URL || "https://forgeai.vercel.app";
const DEMO_STATE_API = `${MAIN_APP_URL}/api/demo/state`;

// Simulate network delay
const demoDelay = () => new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 100));

// Demo state cache
let cachedState: DemoState | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 5000; // 5 seconds

export interface DemoState {
  id: string;
  version: number;
  organizations: OrganizationData[];
  users: UserData[];
  workspaces: WorkspaceData[];
  jira_connections: JiraConnectionData[];
  feature_flags: Record<string, FeatureFlagData[]>;
  audit_logs: AuditLogData[];
  stories: StoryData[];
  sprints: SprintData[];
  signals: SignalData[];
  pis: PIData[];
  delivery_events: DeliveryEventData[];
  incidents: IncidentData[];
  updated_at: string;
  updated_by: string | null;
}

export interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "pro" | "enterprise";
  status: "active" | "suspended" | "deactivated";
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  subscription: {
    plan: string;
    seatsTotal: number;
    seatsUsed: number;
    status: string;
  } | null;
}

export interface WorkspaceData {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  memberCount: number;
  createdAt: string;
}

export interface UserData {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  workspaceId: string | null;
  organizationId: string | null;
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

export interface JiraConnectionData {
  id: string;
  workspaceId: string;
  organizationId: string;
  cloudId: string;
  siteName: string;
  siteUrl: string;
  isActive: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  storiesSynced: number;
}

export interface FeatureFlagData {
  id: string;
  flagName: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface AuditLogData {
  id: string;
  adminUserId: string;
  adminEmail: string;
  action: string;
  entityType: string;
  entityId: string | null;
  organizationId: string | null;
  workspaceId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  createdAt: string;
}

export interface StoryData {
  id: string;
  workspaceId: string;
  jiraKey: string;
  title: string;
}

export interface SprintData {
  id: string;
  workspaceId: string;
  name: string;
  state: "active" | "closed" | "future";
}

export interface SignalData {
  id: string;
  workspaceId: string;
  title: string;
}

export interface PIData {
  id: string;
  workspaceId: string;
  name: string;
}

export interface DeliveryEventData {
  id: string;
  storyId: string;
  eventType: string;
}

export interface IncidentData {
  id: string;
  title: string;
  severity: string;
  status: string;
}

// Fetch demo state from main app
export async function fetchDemoState(forceRefresh = false): Promise<DemoState> {
  const now = Date.now();

  if (!forceRefresh && cachedState && now - lastFetchTime < CACHE_TTL) {
    return cachedState;
  }

  try {
    const response = await fetch(DEMO_STATE_API, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const result = await response.json();

    if (result.success && result.data) {
      cachedState = result.data;
      lastFetchTime = now;
      return result.data;
    }

    throw new Error(result.error || "Failed to fetch demo state");
  } catch (error) {
    console.error("Failed to fetch demo state:", error);
    // Return cached state if available, otherwise throw
    if (cachedState) return cachedState;
    throw error;
  }
}

// Response types for different actions
interface ActionResponse {
  state?: DemoState;
  organization?: OrganizationData;
  user?: UserData;
  featureFlag?: FeatureFlagData;
  message?: string;
}

// Post action to main app's demo state API
async function postDemoAction(action: string, data: Record<string, unknown> = {}): Promise<ActionResponse> {
  const response = await fetch(DEMO_STATE_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...data }),
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || "Action failed");
  }

  // Update cache with new state
  if (result.data?.state) {
    cachedState = result.data.state;
    lastFetchTime = Date.now();
  } else {
    // Invalidate cache to force refresh
    cachedState = null;
  }

  return result.data as ActionResponse;
}

// Reset demo state
export async function resetDemoState(): Promise<void> {
  await postDemoAction("reset");
  cachedState = null;
}

// Organizations API
export const sharedOrganizationsApi = {
  list: async (params?: {
    status?: string;
    plan?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    await demoDelay();
    const state = await fetchDemoState();
    let orgs = [...state.organizations];

    if (params?.status && params.status !== "all") {
      orgs = orgs.filter((o) => o.status === params.status);
    }
    if (params?.plan && params.plan !== "all") {
      orgs = orgs.filter((o) => o.plan === params.plan);
    }
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

    // Attach workspaces to each org
    const orgsWithDetails = orgs.map((org) => ({
      ...org,
      workspaces: state.workspaces
        .filter((ws) => ws.organizationId === org.id)
        .map((ws) => ({ id: ws.id, name: ws.name, memberCount: ws.memberCount })),
    }));

    return { organizations: orgsWithDetails, total };
  },

  get: async (orgId: string) => {
    await demoDelay();
    const state = await fetchDemoState();
    const org = state.organizations.find((o) => o.id === orgId);
    if (!org) throw new Error("Organization not found");

    const workspaces = state.workspaces
      .filter((ws) => ws.organizationId === orgId)
      .map((ws) => ({ id: ws.id, name: ws.name, memberCount: ws.memberCount }));

    return { organization: { ...org, workspaces } };
  },

  create: async (data: {
    name: string;
    slug?: string;
    plan?: "free" | "pro" | "enterprise";
    ownerEmail: string;
  }) => {
    await demoDelay();
    const now = new Date().toISOString();

    const newOrg: OrganizationData = {
      id: `org-${Date.now()}`,
      name: data.name,
      slug: data.slug || data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      plan: data.plan || "free",
      status: "active",
      settings: {},
      createdAt: now,
      updatedAt: now,
      subscription: {
        plan: data.plan || "free",
        status: "active",
        seatsTotal: data.plan === "enterprise" ? 100 : data.plan === "pro" ? 25 : 5,
        seatsUsed: 1,
      },
    };

    const newWorkspace: WorkspaceData = {
      id: `ws-${Date.now()}`,
      organizationId: newOrg.id,
      name: "Default Workspace",
      slug: "default",
      memberCount: 1,
      createdAt: now,
    };

    const newOwner: UserData = {
      id: `user-${Date.now()}`,
      email: data.ownerEmail,
      fullName: data.ownerEmail.split("@")[0].replace(/[._]/g, " "),
      avatarUrl: null,
      isAdmin: false,
      workspaceId: newWorkspace.id,
      organizationId: newOrg.id,
      createdAt: now,
      membership: {
        id: `mem-${Date.now()}`,
        role: "owner",
        status: "active",
        joinedAt: now,
      },
      identities: [],
    };

    await postDemoAction("addOrganization", {
      organization: newOrg,
      workspace: newWorkspace,
      owner: newOwner,
    });

    return {
      organization: { ...newOrg, workspaces: [{ id: newWorkspace.id, name: newWorkspace.name, memberCount: 1 }] },
      workspaceId: newWorkspace.id,
    };
  },

  update: async (orgId: string, updates: Partial<OrganizationData>) => {
    await demoDelay();
    const result = await postDemoAction("updateOrganization", { orgId, updates });
    return { organization: result.organization! };
  },

  suspend: async (orgId: string, reason?: string) => {
    await demoDelay();
    await postDemoAction("updateOrganization", {
      orgId,
      updates: { status: "suspended", settings: { suspendReason: reason } },
    });
    return { message: "Organization suspended" };
  },

  reactivate: async (orgId: string) => {
    await demoDelay();
    await postDemoAction("updateOrganization", {
      orgId,
      updates: { status: "active" },
    });
    return { message: "Organization reactivated" };
  },

  deactivate: async (orgId: string) => {
    await demoDelay();
    await postDemoAction("updateOrganization", {
      orgId,
      updates: { status: "deactivated" },
    });
    return { message: "Organization deactivated" };
  },
};

// Users API
export const sharedUsersApi = {
  list: async (params: {
    organizationId: string;
    role?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    await demoDelay();
    const state = await fetchDemoState();
    const orgWorkspaces = state.workspaces.filter((ws) => ws.organizationId === params.organizationId);
    const wsIds = orgWorkspaces.map((ws) => ws.id);

    let users = state.users.filter((u) => u.workspaceId && wsIds.includes(u.workspaceId));

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
  },

  get: async (userId: string) => {
    await demoDelay();
    const state = await fetchDemoState();
    const user = state.users.find((u) => u.id === userId);
    if (!user) throw new Error("User not found");
    return { user };
  },

  update: async (userId: string, updates: { role?: string; isAdmin?: boolean }) => {
    await demoDelay();
    const userUpdates: Partial<UserData> = {};

    if (updates.isAdmin !== undefined) {
      userUpdates.isAdmin = updates.isAdmin;
    }
    if (updates.role) {
      userUpdates.membership = { role: updates.role } as UserData["membership"];
    }

    const result = await postDemoAction("updateUser", { userId, updates: userUpdates });
    return { user: result.user };
  },

  create: async (data: { email: string; workspaceId: string; role?: string }) => {
    await demoDelay();
    const state = await fetchDemoState();
    const workspace = state.workspaces.find((ws) => ws.id === data.workspaceId);
    const now = new Date().toISOString();

    const newUser: UserData = {
      id: `user-${Date.now()}`,
      email: data.email,
      fullName: data.email.split("@")[0].replace(/[._]/g, " "),
      avatarUrl: null,
      isAdmin: false,
      workspaceId: data.workspaceId,
      organizationId: workspace?.organizationId || null,
      createdAt: now,
      membership: {
        id: `mem-${Date.now()}`,
        role: (data.role as "owner" | "admin" | "member" | "viewer") || "member",
        status: "active",
        joinedAt: now,
      },
      identities: [],
    };

    await postDemoAction("addUser", { user: newUser });
    return { user: newUser };
  },

  linkIdentity: async (userId: string, identity: {
    provider: string;
    providerAccountId: string;
    displayName?: string;
  }) => {
    await demoDelay();
    const state = await fetchDemoState();
    const user = state.users.find((u) => u.id === userId);
    if (!user) throw new Error("User not found");

    const newIdentity = {
      provider: identity.provider,
      providerAccountId: identity.providerAccountId,
      displayName: identity.displayName || null,
    };

    await postDemoAction("updateUser", {
      userId,
      updates: { identities: [...user.identities, newIdentity] },
    });

    return {
      identity: {
        id: `identity-${Date.now()}`,
        userId,
        ...newIdentity,
        linkedAt: new Date().toISOString(),
      },
    };
  },

  unlinkIdentity: async (userId: string, provider: string) => {
    await demoDelay();
    const state = await fetchDemoState();
    const user = state.users.find((u) => u.id === userId);
    if (!user) throw new Error("User not found");

    await postDemoAction("updateUser", {
      userId,
      updates: { identities: user.identities.filter((i) => i.provider !== provider) },
    });

    return { message: "Identity unlinked" };
  },
};

// Licensing API
export const sharedLicensingApi = {
  get: async (organizationId: string) => {
    await demoDelay();
    const state = await fetchDemoState();
    const org = state.organizations.find((o) => o.id === organizationId);
    if (!org) throw new Error("Organization not found");

    const planLimits = {
      free: { seats: 5, workspaces: 1, jiraConnections: 1, features: ["basic_scoring"] },
      pro: { seats: 25, workspaces: 3, jiraConnections: 1, features: ["basic_scoring", "advanced_analytics", "custom_rubrics"] },
      enterprise: { seats: 100, workspaces: 10, jiraConnections: 5, features: ["basic_scoring", "advanced_analytics", "custom_rubrics", "multi_jira", "api_access"] },
    };

    const limits = planLimits[org.plan] || planLimits.free;
    const violations: string[] = [];
    const orgWorkspaces = state.workspaces.filter((ws) => ws.organizationId === organizationId);

    if (org.subscription && org.subscription.seatsUsed > limits.seats) {
      violations.push(`Seat limit exceeded: ${org.subscription.seatsUsed}/${limits.seats}`);
    }
    if (orgWorkspaces.length > limits.workspaces) {
      violations.push(`Workspace limit exceeded: ${orgWorkspaces.length}/${limits.workspaces}`);
    }

    return {
      subscription: {
        id: `sub-${org.id}`,
        plan: org.plan,
        status: org.subscription?.status || "active",
        seatsTotal: org.subscription?.seatsTotal || limits.seats,
        seatsUsed: org.subscription?.seatsUsed || 0,
      },
      featureFlags: state.feature_flags[organizationId] || [],
      limits: { withinLimits: violations.length === 0, violations },
      planLimits: limits,
    };
  },

  update: async (data: { organizationId: string; plan?: string; seatsTotal?: number }) => {
    await demoDelay();
    await postDemoAction("updateLicensing", data);
    return sharedLicensingApi.get(data.organizationId);
  },
};

// Feature Flags API
export const sharedFeatureFlagsApi = {
  get: async (organizationId: string) => {
    await demoDelay();
    const state = await fetchDemoState();
    const org = state.organizations.find((o) => o.id === organizationId);
    if (!org) throw new Error("Organization not found");

    const availableFlags =
      org.plan === "enterprise"
        ? ["basic_scoring", "multi_jira", "advanced_analytics", "cross_workspace_analytics", "custom_rubrics", "api_access", "white_label", "sso"]
        : org.plan === "pro"
        ? ["basic_scoring", "advanced_analytics", "custom_rubrics"]
        : ["basic_scoring"];

    return {
      featureFlags: state.feature_flags[organizationId] || [],
      plan: org.plan,
      availableFlags,
    };
  },

  toggle: async (data: { organizationId: string; flagName: string; enabled: boolean }) => {
    await demoDelay();
    const result = await postDemoAction("toggleFeatureFlag", {
      orgId: data.organizationId,
      flagName: data.flagName,
      enabled: data.enabled,
    });
    return { featureFlag: result.featureFlags?.find((f: FeatureFlagData) => f.flagName === data.flagName) };
  },
};

// JIRA API
export const sharedJiraApi = {
  listConnections: async (params?: { organizationId?: string; status?: string }) => {
    await demoDelay();
    const state = await fetchDemoState();
    let connections = [...state.jira_connections];

    if (params?.organizationId) {
      connections = connections.filter((c) => c.organizationId === params.organizationId);
    }
    if (params?.status === "active") {
      connections = connections.filter((c) => c.isActive);
    } else if (params?.status === "inactive") {
      connections = connections.filter((c) => !c.isActive);
    }

    // Attach workspace and org names
    const connectionsWithDetails = connections.map((conn) => {
      const workspace = state.workspaces.find((ws) => ws.id === conn.workspaceId);
      const org = state.organizations.find((o) => o.id === conn.organizationId);
      return {
        ...conn,
        workspaceName: workspace?.name || null,
        organizationName: org?.name || null,
      };
    });

    return { connections: connectionsWithDetails, total: connections.length };
  },

  getConnection: async (connectionId: string) => {
    await demoDelay();
    const state = await fetchDemoState();
    const conn = state.jira_connections.find((c) => c.id === connectionId);
    if (!conn) throw new Error("Connection not found");

    const workspace = state.workspaces.find((ws) => ws.id === conn.workspaceId);
    const org = state.organizations.find((o) => o.id === conn.organizationId);

    return {
      connection: {
        ...conn,
        workspaceName: workspace?.name || null,
        organizationName: org?.name || null,
      },
      syncLogs: [],
      totalLogs: 0,
    };
  },

  forceSync: async (connectionId: string) => {
    await demoDelay();
    // In demo mode, just simulate a successful sync
    return { message: "Sync started", syncLogId: `sync-${Date.now()}` };
  },

  disconnect: async (connectionId: string) => {
    await demoDelay();
    return { message: "Connection disconnected" };
  },

  getFailedSyncs: async () => {
    await demoDelay();
    return { failedSyncs: [], total: 0, errorSummary: {}, timeRange: { hours: 24, from: "", to: "" } };
  },
};

// Audit API
export const sharedAuditApi = {
  query: async (params?: {
    action?: string;
    entityType?: string;
    organizationId?: string;
    limit?: number;
    offset?: number;
  }) => {
    await demoDelay();
    const state = await fetchDemoState();
    let logs = [...state.audit_logs];

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
  },

  getSummary: async (params?: { organizationId?: string }) => {
    await demoDelay();
    const state = await fetchDemoState();
    let logs = state.audit_logs;

    if (params?.organizationId) {
      logs = logs.filter((l) => l.organizationId === params.organizationId);
    }

    const actionCounts: Record<string, number> = {};
    logs.forEach((log) => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    });

    const summary = Object.entries(actionCounts).map(([action, count]) => ({ action, count }));

    return {
      summary,
      totalActions: logs.length,
      timeRange: { from: null, to: null },
    };
  },
};

// Stats API
export const sharedStatsApi = {
  getDashboardStats: async () => {
    await demoDelay();
    const state = await fetchDemoState();

    return {
      totalOrganizations: state.organizations.length,
      activeOrganizations: state.organizations.filter((o) => o.status === "active").length,
      totalJiraConnections: state.jira_connections.length,
      failedSyncs24h: 0,
      totalAdminActions: state.audit_logs.length,
      planBreakdown: {
        free: state.organizations.filter((o) => o.plan === "free").length,
        pro: state.organizations.filter((o) => o.plan === "pro").length,
        enterprise: state.organizations.filter((o) => o.plan === "enterprise").length,
      },
    };
  },
};

// Subscribe to demo state changes (for real-time sync)
export function subscribeToDemoStateChanges(callback: (state: DemoState) => void): () => void {
  // Poll for changes every 5 seconds
  const interval = setInterval(async () => {
    try {
      const state = await fetchDemoState(true);
      callback(state);
    } catch (error) {
      console.error("Failed to fetch demo state update:", error);
    }
  }, 5000);

  return () => clearInterval(interval);
}
