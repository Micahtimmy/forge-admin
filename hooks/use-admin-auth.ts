"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { isDemoMode } from "@/lib/api";
import type { User } from "@supabase/supabase-js";

interface AdminUser {
  id: string;
  email: string;
  isAdmin: boolean;
  fullName: string | null;
  avatarUrl: string | null;
}

const DEMO_ADMIN: AdminUser = {
  id: "demo-admin-1",
  email: "admin@forge.demo",
  isAdmin: true,
  fullName: "Demo Admin",
  avatarUrl: null,
};

export function useAdminAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      // In demo mode, use demo admin
      if (isDemoMode()) {
        setAdminUser(DEMO_ADMIN);
        setLoading(false);
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        setUser(user);

        // Check if user is admin
        const { data: userData, error } = await supabase
          .from("users")
          .select("id, email, is_admin, full_name, avatar_url")
          .eq("id", user.id)
          .single();

        if (error || !userData?.is_admin) {
          console.warn("User is not an admin");
          router.push("/login?error=unauthorized");
          return;
        }

        setAdminUser({
          id: userData.id,
          email: userData.email,
          isAdmin: userData.is_admin,
          fullName: userData.full_name,
          avatarUrl: userData.avatar_url,
        });
      } catch (err) {
        console.error("Auth check failed:", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Skip auth state change listener in demo mode
    if (isDemoMode()) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        setAdminUser(null);
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  const signOut = async () => {
    if (isDemoMode()) {
      router.push("/login");
      return;
    }
    await supabase.auth.signOut();
    router.push("/login");
  };

  return {
    user,
    adminUser,
    loading,
    signOut,
    isAuthenticated: !!adminUser,
  };
}
