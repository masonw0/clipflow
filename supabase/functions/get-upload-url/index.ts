import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.19";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

  let body: { storagePath?: string; contentType?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { storagePath, contentType } = body;
  if (!storagePath || !contentType) {
    return new Response(JSON.stringify({ error: "Missing storagePath or contentType" }), {
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
  const presigned = await aws.sign(
    new Request(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
    }),
    { aws: { signQuery: true } }
  );

  return new Response(
    JSON.stringify({ presignedUrl: presigned.url }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
