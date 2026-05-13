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
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
    const window = new Date(now.getTime() + 90 * 60 * 1000);

    // Find meetings starting in ~1 hour that haven't been reminded yet
    const { data: meetings, error } = await supabase
      .from("meetings")
      .select(`
        id, title, start_time, meeting_type, meeting_url,
        organizer:profiles!meetings_organizer_id_fkey(id, first_name, last_name, email),
        participant:profiles!meetings_participant_id_fkey(id, first_name, last_name, email)
      `)
      .eq("status", "confirmed")
      .gte("start_time", in1Hour.toISOString())
      .lte("start_time", window.toISOString())
      .is("reminder_sent", null);

    if (error) throw error;

    let sent = 0;
    for (const meeting of meetings ?? []) {
      const organizer = meeting.organizer as any;
      const participant = meeting.participant as any;
      const startTime = new Date(meeting.start_time).toLocaleString("en-US", {
        weekday: "long", month: "long", day: "numeric",
        hour: "numeric", minute: "2-digit", timeZoneName: "short",
      });

      for (const person of [organizer, participant]) {
        if (!person?.email) continue;
        const other = person.id === organizer?.id ? participant : organizer;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `First Sip <${FROM_EMAIL}>`,
            to: person.email,
            subject: `☕ Reminder: your chat with ${other?.first_name} starts in 1 hour`,
            html: `<p>Hi ${person.first_name},</p>
<p>Your coffee chat with <strong>${other?.first_name} ${other?.last_name}</strong> is starting in about 1 hour.</p>
<p><strong>When:</strong> ${startTime}<br>
<strong>Format:</strong> ${meeting.meeting_type ?? "Virtual"}</p>
${meeting.meeting_url ? `<p><a href="${meeting.meeting_url}" style="background:#B5651D;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Join now →</a></p>` : ""}
<p>See you soon ☕<br>— The First Sip team</p>
<p style="font-size:12px;color:#888;"><a href="${APP_URL}">firstsipapp.com</a></p>`,
          }),
        });
        sent++;
      }

      await supabase.from("meetings").update({ reminder_sent: new Date().toISOString() }).eq("id", meeting.id);
    }

    return new Response(JSON.stringify({ sent, message: `Reminder emails sent: ${sent}` }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
