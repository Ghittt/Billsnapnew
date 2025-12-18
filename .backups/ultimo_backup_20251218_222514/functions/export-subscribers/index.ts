import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: subscribers, error } = await supabase
      .from("group_buying_subscribers")
      .select("*")
      .eq("status", "active")
      .order("subscribed_at", { ascending: false });

    if (error) throw error;

    const headers = [
      "Email","Nome","Telefono","Città","Provincia","Consumo Annuo (kWh)",
      "Fornitore Attuale","Interessato a","Data Iscrizione","UTM Source","UTM Medium","UTM Campaign","Note"
    ];

    const csvRows = [headers.join(",")];

    for (const sub of subscribers || []) {
      const row = [
        sub.email || "", sub.name || "", sub.phone || "", sub.city || "", sub.province || "",
        sub.annual_consumption_kwh || "", sub.current_provider || "", sub.interested_in || "",
        new Date(sub.subscribed_at).toLocaleString("it-IT"),
        sub.utm_source || "", sub.utm_medium || "", sub.utm_campaign || "",
        (sub.notes || "").replace(/"/g, '""')
      ];
      csvRows.push(row.map(field => `"${field}"`).join(","));
    }

    const csv = csvRows.join("\n");

    return new Response(csv, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="gruppo_acquisto_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error) {
    console.error("Export error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
