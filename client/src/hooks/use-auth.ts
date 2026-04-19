import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type UserPlan = "free" | "basic" | "pro";

export interface AuthUser {
  id: number;
  email: string;
  name?: string | null;
  plan: UserPlan;
  transcriptsUsedThisMonth: number;
  subscriptionStatus?: string | null;
}

export interface UsageInfo {
  plan: UserPlan | "guest";
  used: number;
  limit: number;
  hasAds: boolean;
  hasSrt: boolean;
}

export function useUser() {
  return useQuery<AuthUser | null>({
    queryKey: ["/api/me"],
    queryFn: async () => {
      const res = await fetch("/api/me", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUsage() {
  return useQuery<UsageInfo>({
    queryKey: ["/api/usage"],
    queryFn: async () => {
      const res = await fetch("/api/usage", { credentials: "include" });
      if (!res.ok) return { plan: "guest", used: 0, limit: 2, hasAds: true, hasSrt: false };
      return res.json();
    },
    staleTime: 1000 * 30,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Login failed");
      }
      return res.json() as Promise<AuthUser>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/usage"] });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, password, name }: { email: string; password: string; name?: string }) => {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Registration failed");
      }
      return res.json() as Promise<AuthUser>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/usage"] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/logout", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Logout failed");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/me"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/usage"] });
    },
  });
}

export function useStartCheckout() {
  return useMutation({
    mutationFn: async ({ plan, cycle }: { plan: "basic" | "pro"; cycle: "monthly" | "annual" }) => {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, cycle }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to start checkout");
      return data as { url: string };
    },
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });
}
