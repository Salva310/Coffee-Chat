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
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

    // Meetings that ended 2–4 hours ago without a followup sent
    const { data: meetings, error } = await supabase
      .from("meetings")
      .select(`
        id, title, start_time, duration,
        organizer:profiles!meetings_organizer_id_fkey(id, first_name, last_name, email),
        participant:profiles!meetings_participant_id_fkey(id, first_name, last_name, email)
      `)
      .in("status", ["confirmed", "completed"])
      .gte("start_time", fourHoursAgo.toISOString())
      .lte("start_time", twoHoursAgo.toISOString())
      .is("followup_sent", null);

    if (error) throw error;

    let sent = 0;
    for (const meeting of meetings ?? []) {
      const organizer = meeting.organizer as any;
      const participant = meeting.participant as any;

      for (const person of [organizer, participant]) {
        if (!person?.email) continue;
        const other = person.id === organizer?.id ? participant : organizer;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `First Sip <${FROM_EMAIL}>`,
            to: person.email,
            subject: `☕ How did your chat with ${other?.first_name} go?`,
            html: `<p>Hi ${person.first_name},</p>
<p>Hope your coffee chat with <strong>${other?.first_name} ${other?.last_name}</strong> went well!</p>
<p>A few ways to keep the momentum going:</p>
<ul>
  <li>Send ${other?.first_name} a message to say thanks</li>
  <li>Schedule your next chat if you want to meet again</li>
  <li>Expand your network — discover more people on First Sip</li>
</ul>
<p><a href="${APP_URL}" style="background:#B5651D;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Open First Sip →</a></p>
<p>Keep building that network ☕<br>— The First Sip team</p>
<p style="font-size:12px;color:#888;"><a href="${APP_URL}">firstsipapp.com</a></p>`,
          }),
        });
        sent++;
      }

      await supabase.from("meetings").update({ followup_sent: new Date().toISOString() }).eq("id", meeting.id);
    }

    return new Response(JSON.stringify({ sent, message: `Follow-up emails sent: ${sent}` }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
