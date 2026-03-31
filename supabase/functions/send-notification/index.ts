// ClipFlow — send-notification edge function
// Sends a transactional email via the Resend API.
//
// Required environment variables (set in Supabase dashboard → Project Settings → Edge Functions):
//   RESEND_API_KEY  — your Resend API key (resend.com → API Keys)
//   RESEND_FROM     — verified sender address, e.g. "ClipFlow <notifications@yourdomain.com>"
//                     Use "ClipFlow <onboarding@resend.dev>" for Resend's shared test domain
//                     (only delivers to your own Resend account email during testing)
//
// Deploy:
//   supabase functions deploy send-notification --project-ref YOUR_PROJECT_REF
//
// Expected request body:
//   { to: string, subject: string, html: string }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "ClipFlow <onboarding@resend.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  if (!RESEND_API_KEY) {
    console.error("[send-notification] RESEND_API_KEY is not set");
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let body: { to?: string; subject?: string; html?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { to, subject, html } = body;

  if (!to || !subject || !html) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: to, subject, html" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [to],
      subject,
      html,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("[send-notification] Resend API error:", data);
    return new Response(
      JSON.stringify({ error: "Failed to send email", details: data }),
      { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("[send-notification] Sent to:", to, "| subject:", subject, "| resend id:", data.id);
  return new Response(
    JSON.stringify({ success: true, id: data.id }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
