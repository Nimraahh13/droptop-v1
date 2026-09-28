// Drop & Top - sends an EMAIL and a WHATSAPP message to the owner for every new order.
// Runs on Supabase's servers, so it works even when the owner panel is closed.
// Secrets it needs (Supabase > Edge Functions > Secrets):
//   WEBHOOK_SECRET   - any long random password (same one you put in notifications-setup.sql)
//   RESEND_API_KEY   - from resend.com (free)
//   OWNER_EMAIL      - email address that receives order emails
//   CALLMEBOT_PHONE  - owner WhatsApp number, e.g. 923003132136
//   CALLMEBOT_APIKEY - key CallMeBot sends you on WhatsApp
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("WEBHOOK_SECRET")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const orderId = Number(body.order_id);
  if (!orderId) return new Response("Missing order_id", { status: 400 });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: order } = await db.from("orders").select("*").eq("id", orderId).single();
  if (!order) return new Response("Order not found", { status: 404 });
  const { data: items } = await db.from("order_items").select("*").eq("order_id", orderId);

  const lines = (items || []).map((i: any) =>
    `${i.quantity} x ${i.item_name}${i.size ? " (" + i.size + ")" : ""} = Rs. ${i.price * i.quantity}`);
  const text =
    `NEW ORDER #${order.id}\n` +
    `Name: ${order.customer_name}\nPhone: ${order.phone}\nType: ${order.order_type}\n` +
    (order.address ? `Address: ${order.address}\n` : "") +
    (order.notes ? `Note: ${order.notes}\n` : "") +
    `\n${lines.join("\n")}\n\nTOTAL: Rs. ${order.total}`;

  const results: Record<string, string> = {};

  // ---- Email (Resend) ----
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const ownerEmail = Deno.env.get("OWNER_EMAIL");
  if (resendKey && ownerEmail) {
    const esc = (s: string) =>
      s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: Deno.env.get("FROM_EMAIL") || "Drop & Top Orders <onboarding@resend.dev>",
        to: [ownerEmail],
        subject: `New order #${order.id} - Rs. ${order.total}`,
        html: `<pre style="font-family:Arial,sans-serif;font-size:15px">${esc(text)}</pre>`,
      }),
    });
    results.email = r.ok ? "sent" : `failed: ${await r.text()}`;
  } else results.email = "skipped (no RESEND_API_KEY / OWNER_EMAIL)";

  // ---- WhatsApp (CallMeBot) ----
  const phone = Deno.env.get("CALLMEBOT_PHONE");
  const apikey = Deno.env.get("CALLMEBOT_APIKEY");
  if (phone && apikey) {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}` +
      `&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apikey)}`;
    const r = await fetch(url);
    results.whatsapp = r.ok ? "sent" : `failed: ${r.status}`;
  } else results.whatsapp = "skipped (no CALLMEBOT_PHONE / CALLMEBOT_APIKEY)";

  console.log(`order ${orderId}`, results);
  return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
});
