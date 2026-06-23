// @ts-nocheck - Deno Edge Function with URL imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Note {
  content: string;
  timestamp: string;
  employee: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "Token is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from("member_invitation_tokens")
      .select("team_member_id, expires_at, used_at")
      .eq("token", token)
      .single();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ error: "Invalid or expired link" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "This link has expired. Please request a new invitation." }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Resolve the member and their company - this is the scope boundary.
    // Notes are only ever fetched for THIS member's company, never globally.
    const { data: member, error: memberError } = await supabase
      .from("team_members")
      .select("first_name, last_name, company_id")
      .eq("id", tokenData.team_member_id)
      .single();

    if (memberError || !member || !member.company_id) {
      return new Response(JSON.stringify({ error: "Could not find member information" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fullName = `${member.first_name} ${member.last_name}`;

    // 3. Fetch notes only from employees within the same company
    const { data: employees, error: employeesError } = await supabase
      .from("employees")
      .select("notes, full_name")
      .eq("company_id", member.company_id)
      .not("notes", "is", null);

    if (employeesError) {
      console.error("Error fetching notes:", employeesError);
      return new Response(JSON.stringify({ memberName: fullName, notes: [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Filter notes containing an @mention of this member
    const mentionedNotes: Note[] = [];

    employees?.forEach((emp: any) => {
      try {
        const parsedNotes = JSON.parse(emp.notes);
        if (Array.isArray(parsedNotes)) {
          parsedNotes.forEach((note: any) => {
            if (
              note.content &&
              (note.content.includes(`@${fullName}`) ||
                note.content.includes(`@${member.first_name}`) ||
                note.content.includes(`@${member.last_name}`))
            ) {
              mentionedNotes.push({
                content: note.content,
                timestamp: note.timestamp || note.date || new Date().toISOString(),
                employee: emp.full_name || "Unknown",
              });
            }
          });
        }
      } catch (e) {
        // Note field wasn't a JSON array (free-text legacy note) - skip it.
      }
    });

    mentionedNotes.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // 5. Mark token as used (best effort, first time only)
    if (!tokenData.used_at) {
      await supabase
        .from("member_invitation_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("token", token);
    }

    return new Response(
      JSON.stringify({ memberName: fullName, notes: mentionedNotes }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-public-notes error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
