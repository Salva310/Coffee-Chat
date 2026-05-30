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
        const reviewUrl = `${APP_URL}/review/${meeting.id}`;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `First Sip <${FROM_EMAIL}>`,
            to: person.email,
            subject: `☕ How did your chat with ${other?.first_name} go?`,
            html: `
<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#1C0F07">
  <div style="background:#B5651D;padding:20px 28px;border-radius:12px 12px 0 0">
    <div style="color:white;font-size:22px;font-weight:500">First Sip ☕</div>
  </div>
  <div style="background:#FAF7F2;padding:28px;border-radius:0 0 12px 12px;border:1px solid #E8D5C0;border-top:none">
    <p style="font-size:16px;font-weight:500;margin:0 0 6px">Hi ${person.first_name}!</p>
    <p style="font-size:15px;color:#5C3317;margin:0 0 20px">Hope your coffee chat with <strong>${other?.first_name} ${other?.last_name}</strong> went well ☕</p>
    <a href="${reviewUrl}" style="display:block;background:#B5651D;color:white;text-align:center;padding:12px 20px;border-radius:9px;font-size:15px;font-weight:500;text-decoration:none;margin-bottom:10px">⭐ Leave an Anonymous Review</a>
    <a href="${APP_URL}/chats" style="display:block;background:white;color:#B5651D;text-align:center;padding:12px 20px;border-radius:9px;font-size:15px;font-weight:500;text-decoration:none;border:1px solid #E8D5C0;margin-bottom:24px">💬 Send ${other?.first_name} a message</a>
    <div style="background:#F5EDE3;border-radius:8px;padding:12px 14px;margin-bottom:20px">
      <div style="font-size:12px;font-weight:500;color:#B5651D;margin-bottom:4px">🔒 100% anonymous</div>
      <div style="font-size:13px;color:#5C3317;line-height:1.5">Reviews are completely anonymous and help others find great people to connect with.</div>
    </div>
    <p style="font-size:13px;color:#8C7B6E;margin:0">Real talk. No small talk. ☕</p>
    <p style="font-size:13px;color:#B8A898;margin:16px 0 0">— The First Sip team</p>
  </div>
</div>`,
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
