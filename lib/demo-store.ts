/**
 * Demo Store - Persistent state for demo mode
 * Changes made in the admin app persist here and can sync to the client app
 */

import {
  demoOrganizations as initialOrgs,
  demoUsers as initialUsers,
  demoJiraConnections as initialJiraConnections,
  demoFeatureFlags as initialFeatureFlags,
  demoAuditLogs as initialAuditLogs,
} from "./demo-data";
import type {
  OrganizationWithDetails,
  UserWithMembership,
  JiraConnectionWithWorkspace,
  FeatureFlag,
  AuditLogRecord,
} from "./api";

const STORAGE_KEY = "forge_demo_state";
const STORAGE_VERSION = 1;

// Shared API endpoint for cross-app sync
const SHARED_API_URL = process.env.NEXT_PUBLIC_MAIN_APP_URL || "http://localhost:3000";

async function syncToSharedApi(action: string, data: Record<string, unknown> = {}): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    await fetch(`${SHARED_API_URL}/api/demo/state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...data }),
    });
  } catch (e) {
    console.warn("Failed to sync to shared API:", e);
  }
}

export interface DemoState {
  version: number;
  lastUpdated: string;
  organizations: OrganizationWithDetails[];
  users: UserWithMembership[];
  jiraConnections: JiraConnectionWithWorkspace[];
  featureFlags: Record<string, FeatureFlag[]>; // keyed by orgId
  auditLogs: AuditLogRecord[];
}

function getInitialState(): DemoState {
  return {
    version: STORAGE_VERSION,
    lastUpdated: new Date().toISOString(),
    organizations: [...initialOrgs],
    users: [...initialUsers],
    jiraConnections: [...initialJiraConnections],
    featureFlags: {
      "org-1": [...initialFeatureFlags],
      "org-2": initialFeatureFlags.filter(f => ["basic_scoring", "advanced_analytics", "custom_rubrics"].includes(f.flagName)),
      "org-3": [...initialFeatureFlags],
    },
    auditLogs: [...initialAuditLogs],
  };
}

let cachedState: DemoState | null = null;

export function loadDemoState(): DemoState {
  if (cachedState) return cachedState;

  if (typeof window === "undefined") {
    return getInitialState();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as DemoState;
      if (parsed.version === STORAGE_VERSION) {
        cachedState = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to load demo state:", e);
  }

  const initial = getInitialState();
  saveDemoState(initial);
  return initial;
}

export function saveDemoState(state: DemoState): void {
  state.lastUpdated = new Date().toISOString();
  cachedState = state;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      // Dispatch event for cross-tab sync
      window.dispatchEvent(new CustomEvent("forge-demo-state-changed", { detail: state }));
    } catch (e) {
      console.warn("Failed to save demo state:", e);
    }
  }
}

export function resetDemoState(): void {
  cachedState = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
  // Sync reset to shared API
  syncToSharedApi("reset");
}

// Organization operations
export function addOrganization(org: OrganizationWithDetails): void {
  const state = loadDemoState();
  state.organizations.push(org);

  // Initialize feature flags for this org based on plan
  const planFlags = getPlanFeatureFlags(org.plan);
  state.featureFlags[org.id] = planFlags;

  // Add audit log
  addAuditLog(state, {
    action: "organization.create",
    entityType: "organization",
    entityId: org.id,
    organizationId: org.id,
    newValues: { name: org.name, plan: org.plan, slug: org.slug },
  });

  saveDemoState(state);

  // Sync to shared API for client app
  syncToSharedApi("addOrganization", {
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      status: org.status,
      createdAt: org.createdAt,
      subscription: org.subscription,
    },
  });
}

export function updateOrganization(orgId: string, updates: Partial<OrganizationWithDetails>): OrganizationWithDetails | null {
  const state = loadDemoState();
  const index = state.organizations.findIndex(o => o.id === orgId);
  if (index === -1) return null;

  const oldOrg = state.organizations[index];
  const updatedOrg = { ...oldOrg, ...updates, updatedAt: new Date().toISOString() };
  state.organizations[index] = updatedOrg;

  // Add audit log
  addAuditLog(state, {
    action: updates.status ? `organization.${updates.status === "suspended" ? "suspend" : updates.status === "active" ? "reactivate" : "update"}` : "organization.update",
    entityType: "organization",
    entityId: orgId,
    organizationId: orgId,
    oldValues: { plan: oldOrg.plan, status: oldOrg.status },
    newValues: updates,
  });

  saveDemoState(state);

  // Sync to shared API
  syncToSharedApi("updateOrganization", { orgId, updates });

  return updatedOrg;
}

// User operations
export function addUser(user: UserWithMembership): void {
  const state = loadDemoState();
  state.users.push(user);

  // Find organization for audit
  const org = state.organizations.find(o => o.workspaces.some(w => w.id === user.workspaceId));

  addAuditLog(state, {
    action: "user.create",
    entityType: "workspace_member",
    entityId: user.id,
    organizationId: org?.id || null,
    workspaceId: user.workspaceId,
    newValues: { email: user.email, role: user.membership?.role },
  });

  saveDemoState(state);

  // Sync to shared API
  syncToSharedApi("addUser", {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isAdmin: user.isAdmin,
      workspaceId: user.workspaceId,
      organizationId: org?.id || null,
      role: user.membership?.role || "member",
      createdAt: user.createdAt,
    },
  });
}

export function updateUser(userId: string, updates: Partial<UserWithMembership>): UserWithMembership | null {
  const state = loadDemoState();
  const index = state.users.findIndex(u => u.id === userId);
  if (index === -1) return null;

  const oldUser = state.users[index];
  const updatedUser = { ...oldUser, ...updates };

  // Handle membership updates
  if (updates.membership) {
    updatedUser.membership = { ...oldUser.membership, ...updates.membership } as UserWithMembership["membership"];
  }

  state.users[index] = updatedUser;

  // Find organization for audit
  const org = state.organizations.find(o => o.workspaces.some(w => w.id === updatedUser.workspaceId));

  // Determine action
  let action = "user.update";
  if (updates.isAdmin !== undefined) {
    action = updates.isAdmin ? "user.admin_grant" : "user.admin_revoke";
  } else if (updates.membership?.role && updates.membership.role !== oldUser.membership?.role) {
    action = "user.role_change";
  }

  addAuditLog(state, {
    action,
    entityType: "workspace_member",
    entityId: userId,
    organizationId: org?.id || null,
    workspaceId: updatedUser.workspaceId,
    oldValues: { role: oldUser.membership?.role, isAdmin: oldUser.isAdmin },
    newValues: updates,
  });

  saveDemoState(state);
  return updatedUser;
}

export function linkUserIdentity(userId: string, identity: UserWithMembership["identities"][0]): void {
  const state = loadDemoState();
  const user = state.users.find(u => u.id === userId);
  if (!user) return;

  user.identities = [...user.identities, identity];

  const org = state.organizations.find(o => o.workspaces.some(w => w.id === user.workspaceId));

  addAuditLog(state, {
    action: "user.link_identity",
    entityType: "identity_mapping",
    entityId: userId,
    organizationId: org?.id || null,
    workspaceId: user.workspaceId,
    newValues: { provider: identity.provider, displayName: identity.displayName },
  });

  saveDemoState(state);
}

// Feature flag operations
export function toggleFeatureFlag(orgId: string, flagName: string, enabled: boolean): FeatureFlag | null {
  const state = loadDemoState();

  if (!state.featureFlags[orgId]) {
    const org = state.organizations.find(o => o.id === orgId);
    state.featureFlags[orgId] = getPlanFeatureFlags(org?.plan || "free");
  }

  const flags = state.featureFlags[orgId];
  let flag = flags.find(f => f.flagName === flagName);

  if (flag) {
    flag.enabled = enabled;
  } else {
    flag = { id: `flag-${Date.now()}`, flagName, enabled, config: {} };
    flags.push(flag);
  }

  addAuditLog(state, {
    action: "feature_flag.toggle",
    entityType: "feature_flag",
    entityId: flag.id,
    organizationId: orgId,
    oldValues: { enabled: !enabled },
    newValues: { flagName, enabled },
  });

  saveDemoState(state);

  // Sync to shared API
  syncToSharedApi("updateFeatureFlags", {
    orgId,
    flags: flags.map(f => ({ flagName: f.flagName, enabled: f.enabled })),
  });

  return flag;
}

// Licensing operations
export function updateLicensing(orgId: string, updates: { plan?: string; seatsTotal?: number }): void {
  const state = loadDemoState();
  const org = state.organizations.find(o => o.id === orgId);
  if (!org) return;

  const oldPlan = org.plan;
  const oldSeats = org.subscription?.seatsTotal;

  if (updates.plan) {
    org.plan = updates.plan as "free" | "pro" | "enterprise";
    if (org.subscription) {
      org.subscription.plan = updates.plan;
    }
    // Update feature flags for new plan
    state.featureFlags[orgId] = getPlanFeatureFlags(updates.plan);
  }

  if (updates.seatsTotal !== undefined && org.subscription) {
    org.subscription.seatsTotal = updates.seatsTotal;
  }

  org.updatedAt = new Date().toISOString();

  if (updates.plan && updates.plan !== oldPlan) {
    addAuditLog(state, {
      action: "subscription.plan_change",
      entityType: "subscription",
      entityId: orgId,
      organizationId: orgId,
      oldValues: { plan: oldPlan },
      newValues: { plan: updates.plan },
    });
  }

  if (updates.seatsTotal !== undefined && updates.seatsTotal !== oldSeats) {
    addAuditLog(state, {
      action: "subscription.seats_change",
      entityType: "subscription",
      entityId: orgId,
      organizationId: orgId,
      oldValues: { seatsTotal: oldSeats },
      newValues: { seatsTotal: updates.seatsTotal },
    });
  }

  saveDemoState(state);
}

// JIRA operations
export function forceJiraSync(connectionId: string): void {
  const state = loadDemoState();
  const conn = state.jiraConnections.find(c => c.id === connectionId);
  if (!conn) return;

  conn.lastSyncAt = new Date().toISOString();
  conn.lastSyncStatus = "completed";
  conn.storiesSynced += Math.floor(Math.random() * 20);

  addAuditLog(state, {
    action: "jira.force_sync",
    entityType: "jira_connection",
    entityId: connectionId,
    organizationId: conn.organizationId,
    workspaceId: conn.workspaceId,
    newValues: { fullSync: true, status: "completed" },
  });

  saveDemoState(state);
}

export function disconnectJira(connectionId: string): void {
  const state = loadDemoState();
  const index = state.jiraConnections.findIndex(c => c.id === connectionId);
  if (index === -1) return;

  const conn = state.jiraConnections[index];

  addAuditLog(state, {
    action: "jira.disconnect",
    entityType: "jira_connection",
    entityId: connectionId,
    organizationId: conn.organizationId,
    workspaceId: conn.workspaceId,
    oldValues: { siteName: conn.siteName },
  });

  state.jiraConnections.splice(index, 1);
  saveDemoState(state);
}

// Helper functions
function addAuditLog(state: DemoState, log: Partial<Omit<AuditLogRecord, "id" | "adminUserId" | "adminEmail" | "createdAt">> & { action: string; entityType: string }): void {
  state.auditLogs.unshift({
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    adminUserId: "admin-demo",
    adminEmail: "demo-admin@forge.com",
    createdAt: new Date().toISOString(),
    entityId: null,
    organizationId: null,
    workspaceId: null,
    oldValues: null,
    newValues: null,
    ...log,
  });
}

function getPlanFeatureFlags(plan: string): FeatureFlag[] {
  const baseFlags: FeatureFlag[] = [
    { id: `flag-basic-${Date.now()}`, flagName: "basic_scoring", enabled: true, config: {} },
  ];

  if (plan === "pro" || plan === "enterprise") {
    baseFlags.push(
      { id: `flag-analytics-${Date.now()}`, flagName: "advanced_analytics", enabled: true, config: {} },
      { id: `flag-rubrics-${Date.now()}`, flagName: "custom_rubrics", enabled: true, config: {} }
    );
  }

  if (plan === "enterprise") {
    baseFlags.push(
      { id: `flag-multijira-${Date.now()}`, flagName: "multi_jira", enabled: true, config: {} },
      { id: `flag-crossws-${Date.now()}`, flagName: "cross_workspace_analytics", enabled: false, config: {} },
      { id: `flag-api-${Date.now()}`, flagName: "api_access", enabled: true, config: {} },
      { id: `flag-wl-${Date.now()}`, flagName: "white_label", enabled: false, config: {} },
      { id: `flag-sso-${Date.now()}`, flagName: "sso", enabled: false, config: {} }
    );
  }

  return baseFlags;
}

// Export state for client app to read
export function exportDemoStateForClient(): string {
  const state = loadDemoState();
  return btoa(JSON.stringify({
    organizations: state.organizations,
    users: state.users,
    featureFlags: state.featureFlags,
    exportedAt: new Date().toISOString(),
  }));
}

// Listen for storage changes from other tabs
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      cachedState = null; // Invalidate cache
    }
  });
}
