"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import {
  Building2,
  Users,
  CreditCard,
  Link2,
  ScrollText,
  Settings,
  LogOut,
  LayoutDashboard,
  Flag,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Organizations", href: "/organizations", icon: Building2 },
  { name: "Users", href: "/users", icon: Users },
  { name: "Licensing", href: "/licensing", icon: CreditCard },
  { name: "Feature Flags", href: "/feature-flags", icon: Flag },
  { name: "JIRA", href: "/jira", icon: Link2 },
  { name: "Audit Logs", href: "/audit", icon: ScrollText },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const { adminUser, signOut, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas flex">
      {/* Sidebar */}
      <aside className="w-64 bg-surface-01 border-r border-border-subtle flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-border-subtle">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-iris flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="font-semibold text-text-primary">FORGE Admin</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-iris/10 text-iris"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-02"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-border-subtle">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-surface-03 flex items-center justify-center">
              <span className="text-xs font-medium text-text-primary">
                {adminUser?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {adminUser?.fullName || "Admin"}
              </p>
              <p className="text-xs text-text-tertiary truncate">
                {adminUser?.email}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-02 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
