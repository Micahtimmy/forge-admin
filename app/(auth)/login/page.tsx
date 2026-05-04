"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { setDemoMode } from "@/lib/api";
import { FlaskConical } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const unauthorizedError = searchParams.get("error") === "unauthorized";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      // Check admin status
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Authentication failed");
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (userError || !userData?.is_admin) {
        await supabase.auth.signOut();
        setError("Access denied. Admin privileges required.");
        return;
      }

      router.push("/");
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary">FORGE Admin</h1>
          <p className="text-text-secondary mt-2">
            Sign in to access the administration panel
          </p>
        </div>

        {unauthorizedError && (
          <div className="mb-4 p-3 rounded-lg bg-coral/10 border border-coral/20 text-coral text-sm">
            You do not have admin access. Please contact support.
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-surface-01 rounded-lg border border-border-subtle p-6 space-y-4"
        >
          {error && (
            <div className="p-3 rounded-lg bg-coral/10 border border-coral/20 text-coral text-sm">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-text-secondary mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-surface-02 border border-border-subtle rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-iris/50 focus:border-iris"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-text-secondary mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-surface-02 border border-border-subtle rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-iris/50 focus:border-iris"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-iris hover:bg-iris/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-subtle" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-surface-01 text-text-tertiary">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setDemoMode(true);
              router.push("/");
            }}
            className="w-full py-2.5 px-4 bg-amber/10 hover:bg-amber/20 text-amber font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <FlaskConical className="w-4 h-4" />
            Enter Demo Mode
          </button>
        </form>

        <p className="text-center text-text-tertiary text-sm mt-6">
          This is a restricted area for FORGE administrators only.
        </p>
        <p className="text-center text-text-tertiary text-xs mt-2">
          Use Demo Mode to explore with sample data.
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
