import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Basic auth check for the edge function itself (prevent public access)
    // The DB trigger should send the ANON or SERVICE key in Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401, headers: corsHeaders });
    }

    const payload = await req.json();
    const { company_id, type, table, record, old_record, timestamp } = payload;

    if (!company_id) {
      return new Response(JSON.stringify({ error: "Missing company_id in payload" }), { status: 400, headers: corsHeaders });
    }

    // Initialize Supabase Client with Service Role to bypass RLS and read external_systems
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch active webhooks for this company
    const { data: systems, error: systemsError } = await supabaseAdmin
      .from("external_systems")
      .select("*")
      .eq("company_id", company_id)
      .eq("status", "active");

    if (systemsError) {
      console.error("Error fetching external systems:", systemsError);
      throw systemsError;
    }

    if (!systems || systems.length === 0) {
      return new Response(JSON.stringify({ message: "No active external systems found for this company" }), { status: 200, headers: corsHeaders });
    }

    const webhookPayload = {
      event: `${type.toLowerCase()}.${table}`,
      timestamp,
      data: record || old_record, // If delete, send old_record
      previous_data: old_record,
    };

    // Dispatch to all active systems concurrently
    const dispatchPromises = systems.map(async (system) => {
      if (!system.endpoint_url && system.endpoint) {
          system.endpoint_url = system.endpoint; // Compatibility if field name differs
      }
      if (!system.endpoint_url) return null;

      try {
        const response = await fetch(system.endpoint_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "HSEHub-Webhook-Dispatcher/1.0",
            ...system.headers,
            // If auth is provided in system config, add it here
            ...(system.api_key_encrypted ? { "Authorization": `Bearer ${system.api_key_encrypted}` } : {})
          },
          body: JSON.stringify(webhookPayload),
        });

        // Log the outcome
        await supabaseAdmin.from("external_systems_sync_history").insert({
          external_system_id: system.id,
          status: response.ok ? "success" : "failed",
          records_processed: 1,
          records_created: type === 'INSERT' ? 1 : 0,
          records_updated: type === 'UPDATE' ? 1 : 0,
          error_message: response.ok ? null : `HTTP ${response.status}: ${await response.text()}`,
          sync_details: { payload: webhookPayload, endpoint: system.endpoint_url }
        });

        // Update last_sync_at on the external system
        await supabaseAdmin.from("external_systems").update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: response.ok ? "success" : "failed",
          last_sync_error: response.ok ? null : `HTTP Error ${response.status}`,
        }).eq("id", system.id);

        return { system: system.name, success: response.ok };
      } catch (err: any) {
        // Log failure
        await supabaseAdmin.from("external_systems_sync_history").insert({
          external_system_id: system.id,
          status: "failed",
          records_processed: 1,
          records_failed: 1,
          error_message: err.message,
          sync_details: { payload: webhookPayload, endpoint: system.endpoint_url }
        });

        await supabaseAdmin.from("external_systems").update({
          last_sync_status: "failed",
          last_sync_error: err.message,
        }).eq("id", system.id);

        return { system: system.name, success: false, error: err.message };
      }
    });

    const results = await Promise.all(dispatchPromises);

    return new Response(
      JSON.stringify({ message: "Dispatched successfully", results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Webhook Dispatcher Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", details: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
