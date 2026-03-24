/* ═══════════════════════════════════════════════════
   MenuQR — Supabase Edge Function: send-fcm
   Sends Firebase FCM push to all waiters of a restaurant

   Deploy: supabase functions deploy send-fcm --no-verify-jwt
   ═══════════════════════════════════════════════════ */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── REPLACE WITH YOUR FIREBASE SERVER KEY ──
const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY") || "YOUR_FIREBASE_SERVER_KEY";
const FCM_URL = "https://fcm.googleapis.com/fcm/send";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const { restaurant_id, type, data } = await req.json();
    if (!restaurant_id || !type) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: CORS });
    }

    // Get all FCM tokens for this restaurant
    const { data: tokens } = await sb
      .from("staff_fcm_tokens")
      .select("fcm_token, staff_name")
      .eq("restaurant_id", restaurant_id);

    if (!tokens?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: "no tokens" }), { headers: CORS });
    }

    // Build notification based on type
    let title = "MenuQR";
    let body  = "নতুন notification";
    let notifData: Record<string, string> = { type, url: "/waiter.html" };

    if (type === "ready") {
      title = `🍽️ টেবিল ${data.table} রেডি!`;
      body  = `অর্ডার ${data.order_id} — এখনই নিয়ে যান`;
      notifData = { type, table: data.table, order_id: data.order_id, url: "/waiter.html" };
    } else if (type === "new_order") {
      title = `🛎️ নতুন অর্ডার — টেবিল ${data.table}`;
      body  = data.items || "নতুন অর্ডার এসেছে";
      notifData = { type, table: data.table, url: "/waiter.html" };
    } else if (type === "waiter_call") {
      title = `📣 টেবিল ${data.table} ডাকছে!`;
      body  = data.request || "সাহায্য দরকার";
      notifData = { type, table: data.table, url: "/waiter.html" };
    }

    // Send to all tokens
    let sent = 0;
    const expiredTokens: string[] = [];

    for (const { fcm_token, staff_name } of tokens) {
      const res = await fetch(FCM_URL, {
        method: "POST",
        headers: {
          "Authorization": `key=${FCM_SERVER_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: fcm_token,
          notification: {
            title,
            body,
            icon:  "/menuqr-logo.svg",
            badge: "/menuqr-logo.svg",
            vibrate: [300, 100, 300, 100, 600],
            requireInteraction: true,
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          },
          data: notifData,
          priority: "high",
        }),
      });

      const result = await res.json();

      if (result.failure === 1) {
        const err = result.results?.[0]?.error;
        if (err === "NotRegistered" || err === "InvalidRegistration") {
          expiredTokens.push(fcm_token);
        }
      } else {
        sent++;
        console.log(`FCM sent to ${staff_name}`);
      }
    }

    // Remove expired tokens
    if (expiredTokens.length) {
      await sb.from("staff_fcm_tokens").delete().in("fcm_token", expiredTokens);
    }

    return new Response(
      JSON.stringify({ sent, expired: expiredTokens.length }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: CORS }
    );
  }
});
