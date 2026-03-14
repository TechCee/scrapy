import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials not configured. Auth will not work.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    throw error;
  }
  
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Recover session from URL hash (e.g. after Supabase redirect with #access_token=...&refresh_token=...).
 * Returns true if a session was set, false otherwise.
 */
export async function setSessionFromHash(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash?.slice(1);
  if (!hash) return false;
  const params = new URLSearchParams(hash);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) return false;
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  return !error;
}

/**
 * Verify OTP (e.g. invite token) and optionally update password.
 * Used for invite flow: verifyOtp with type 'invite' establishes session; then updateUser({ password }).
 */
export async function verifyInviteAndSetPassword(tokenHash: string, newPassword: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "invite",
  });
  if (error) throw error;
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) throw updateError;
  return data;
}
