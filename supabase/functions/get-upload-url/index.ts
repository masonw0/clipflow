import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.19";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const accountId = Deno.env.get("R2_ACCOUNT_ID") ?? "";
  const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID") ?? "";
  const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY") ?? "";
  const bucket = "clipflow-videos";

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return new Response(JSON.stringify({ error: "R2 credentials not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const contentType = req.headers.get("x-content-type") || "video/mp4";
  const storagePath = req.headers.get("x-storage-path");

  if (!storagePath) {
    return new Response(JSON.stringify({ error: "Missing x-storage-path header" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const aws = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: "s3",
    region: "auto",
  });

  const uploadUrl = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${storagePath}`;
  const fileData = await req.arrayBuffer();

  const r2Response = await aws.fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: fileData,
  });

  if (!r2Response.ok) {
    const text = await r2Response.text();
    return new Response(JSON.stringify({ error: "R2 upload failed", details: text }), {
      status: r2Response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const publicUrl = `https://media.clipflowstudio.app/${storagePath}`;
  return new Response(
    JSON.stringify({ publicUrl }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
