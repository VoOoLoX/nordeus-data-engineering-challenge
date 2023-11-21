import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Database } from "./supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey",
};

async function getUserInfo(
  supabaseClient: SupabaseClient<Database>,
  uuid: string,
  date?: string | null
) {
  const { data: user, error: registrationsError } = await supabaseClient
    .from("registrations")
    .select("*")
    .eq("user_id", uuid)
    .limit(1)
    .single();

  const { data: logins, error: loginsError } = await supabaseClient
    .from("logins")
    .select("*")
    .eq("user_id", uuid);

  let sessions: Database["public"]["Tables"]["sessions"]["Row"][] = [];
  let sessionsError = null;
  let daysSinceLastLogin = 0;

  if (date) {
    const { data, error } = await supabaseClient
      .from("sessions")
      .select("*")
      .gte("start_date", `${date} 00:00:00`)
      .lte("start_date", `${date} 23:59:59`)
      .eq("user_id", uuid)
      .order("start_date");

    const { data: lastUserLogin } = await supabaseClient
      .from("logins")
      .select("timestamp")
      .lte("timestamp", `${date} 00:00:00`)
      .eq("user_id", uuid)
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();

    if (data) sessions = data;
    if (error) sessionsError = error;
    if (lastUserLogin)
      daysSinceLastLogin =
        new Date(date).getTime() - new Date(lastUserLogin.timestamp).getTime();
  } else {
    const { data, error } = await supabaseClient
      .from("sessions")
      .select("*")
      .eq("user_id", uuid)
      .order("start_date");

    const { data: lastUserLogin } = await supabaseClient
      .from("logins")
      .select("timestamp")
      .eq("user_id", uuid)
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();

    const { data: lastLogin } = await supabaseClient
      .from("logins")
      .select("timestamp")
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();

    if (data) sessions = data;
    if (error) sessionsError = error;
    if (lastUserLogin && lastLogin)
      daysSinceLastLogin =
        new Date(lastLogin.timestamp).getTime() -
        new Date(lastUserLogin.timestamp).getTime();
  }

  let inGameTime = 0;
  if (sessions) {
    inGameTime = sessions.reduce((acc, session) => {
      acc += session.duration;
      return acc;
    }, 0);
  }

  if (registrationsError || loginsError || sessionsError) {
    return new Response("Internal Server Error", {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const diffInDays = Math.round(daysSinceLastLogin / (1000 * 60 * 60 * 24));

  return new Response(
    JSON.stringify({
      country: user.country,
      name: user.name,
      loginCount: logins.length,
      lastLogin: diffInDays,
      sessionCount: sessions.length,
      inGameTime: inGameTime,
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    }
  );
}

Deno.serve(({ url, method }) => {
  if (method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient<Database>(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const userPattern = new URLPattern({
      pathname: "/user-service/:uuid{/:date}?",
    });

    const matchingPath = userPattern.exec(url);
    const uuid = matchingPath ? matchingPath.pathname.groups.uuid : null;
    const date = matchingPath ? matchingPath.pathname.groups.date : null;

    if (!uuid) {
      return new Response("Bad Request", {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (uuid && method === "GET") {
      return getUserInfo(supabaseClient, uuid as string, date);
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
