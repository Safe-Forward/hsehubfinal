import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname; // e.g., /v1/public-api/incidents
    const pathParts = path.split("/").filter(Boolean);
    const resource = pathParts[pathParts.length - 1]; // e.g., "incidents"
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.split(" ")[1];

    // Initialize Supabase Client with Service Role to validate token
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate Token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("company_api_tokens")
      .select("company_id")
      .eq("token", token)
      .maybeSingle();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: "Invalid API Token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const companyId = tokenData.company_id;

    // Update last_used_at async
    supabaseAdmin
      .from("company_api_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("token", token)
      .then();

    // Route Request based on resource
    // Supported resources for this demo: incidents, employees
    const allowedResources = ["incidents", "employees", "audits", "locations"];
    
    if (!allowedResources.includes(resource)) {
      return new Response(
        JSON.stringify({ error: `Resource '${resource}' is not supported.` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle GET Request
    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from(resource)
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(100); // Pagination could be added here

      if (error) throw error;

      return new Response(
        JSON.stringify({ data, count: data.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle POST Request
    if (req.method === "POST") {
      const body = await req.json();
      
      // Ensure company_id is forced to the token's company
      const insertData = { ...body, company_id: companyId };

      const { data, error } = await supabaseAdmin
        .from(resource)
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ data, message: "Created successfully" }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Public API Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", details: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
