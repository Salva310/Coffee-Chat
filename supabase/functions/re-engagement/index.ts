import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_KEY")!
);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "sal@firstsipapp.com";
const APP_URL = Deno.env.get("APP_URL") ?? "https://coffee-chat-topaz.vercel.app";

serve(async () => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    // Users who signed up 7–14 days ago and have never had a meeting
    const { data: users, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, created_at")
      .gte("created_at", fourteenDaysAgo)
      .lte("created_at", sevenDaysAgo)
      .not("email", "is", null);

    if (error) throw error;

    let sent = 0;
    for (const user of users ?? []) {
      // Check if they've ever had any meeting
      const { count } = await supabase
        .from("meetings")
        .select("id", { count: "exact", head: true })
        .or(`organizer_id.eq.${user.id},participant_id.eq.${user.id}`);

      if ((count ?? 0) > 0) continue;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `First Sip <${FROM_EMAIL}>`,
          to: user.email,
          subject: `${user.first_name}, your network is waiting ☕`,
          html: `<p>Hi ${user.first_name},</p>
<p>You joined First Sip a little while ago, but haven't had your first coffee chat yet. You're one conversation away from a connection that could change your career.</p>
<p>Here's how to get started:</p>
<ol>
  <li><strong>Browse Discover</strong> — find students and alumni who share your goals</li>
  <li><strong>Send a request</strong> — it takes 30 seconds</li>
  <li><strong>Schedule a chat</strong> — 15–30 minutes, virtual or in person</li>
</ol>
<p><a href="${APP_URL}" style="background:#B5651D;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Find someone to connect with →</a></p>
<p>Your first sip is waiting ☕<br>— Sal & the First Sip team</p>
<p style="font-size:12px;color:#888;"><a href="${APP_URL}">firstsipapp.com</a> · You're receiving this because you created an account.</p>`,
        }),
      });
      sent++;
    }

    return new Response(JSON.stringify({ sent, message: `Re-engagement emails sent: ${sent}` }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
