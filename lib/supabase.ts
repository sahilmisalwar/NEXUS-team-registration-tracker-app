import { createClient } from "@supabase/supabase-js";

// Capture the email-link mode before the client removes tokens from the URL.
export const authLinkType = typeof window === "undefined" ? null :
  new URLSearchParams(window.location.hash.slice(1)).get("type") ??
  new URLSearchParams(window.location.search.slice(1)).get("type");

// This publishable key is designed for browser use. All records are protected by RLS.
export const supabase = createClient(
  "https://mkuazrbhbbkjexreodmn.supabase.co",
  "sb_publishable_xL4_ld4-WsMeh4t5yZZTrQ_Dp8Sd79a",
  { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } },
);
