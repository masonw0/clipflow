import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log("[supabase] initializing client:", {
  url: supabaseUrl || "MISSING",
  keyPrefix: supabaseAnonKey ? supabaseAnonKey.slice(0, 20) + "…" : "MISSING",
})

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Auth helpers ──────────────────────────────────────────────────────────────

export const auth = {
  /** Sign up with email + password. Optionally pass { full_name } in metadata. */
  signUp: (email, password, metadata = {}) =>
    supabase.auth.signUp({ email, password, options: { data: metadata } }),

  /** Sign in with email + password */
  signIn: (email, password) =>
    supabase.auth.signInWithPassword({ email, password }),

  /** Sign in with OAuth provider (e.g. 'google', 'github') */
  signInWithOAuth: (provider) =>
    supabase.auth.signInWithOAuth({ provider }),

  /** Send a magic-link / OTP to the given email */
  signInWithOTP: (email) =>
    supabase.auth.signInWithOtp({ email }),

  /** Sign out the current user */
  signOut: () => supabase.auth.signOut(),

  /** Get the current session (null if not logged in) */
  getSession: () => supabase.auth.getSession(),

  /** Get the currently authenticated user */
  getUser: () => supabase.auth.getUser(),

  /** Subscribe to auth state changes */
  onAuthStateChange: (callback) =>
    supabase.auth.onAuthStateChange(callback),

  /** Send a password-reset email */
  resetPassword: (email) =>
    supabase.auth.resetPasswordForEmail(email),

  /** Update password (call after user lands on reset link) */
  updatePassword: (newPassword) =>
    supabase.auth.updateUser({ password: newPassword }),
}
