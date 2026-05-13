import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_KEY')!
)

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'sal@firstsipapp.com'

Deno.serve(async () => {
  try {
    const now = new Date()
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
    const windowStart = new Date(oneHourFromNow.getTime() - 5 * 60 * 1000)
    const windowEnd   = new Date(oneHourFromNow.getTime() + 5 * 60 * 1000)

    const { data: meetings, error } = await supabase
      .from('meetings')
      .select(`
        id, start_time, end_time, meeting_type, meeting_url, location, note,
        organizer:profiles!meetings_organizer_id_fkey(id, first_name, last_name, email),
        participant:profiles!meetings_participant_id_fkey(id, first_name, last_name, email)
      `)
      .eq('status', 'accepted')
      .gte('start_time', windowStart.toISOString())
      .lte('start_time', windowEnd.toISOString())

    if (error) throw error
    if (!meetings || meetings.length === 0)
      return new Response(JSON.stringify({ sent: 0, message: 'No upcoming meetings' }), { status: 200 })

    let sent = 0
    for (const meeting of meetings) {
      const org  = meeting.organizer as any
      const part = meeting.participant as any
      if (!org?.email || !part?.email) continue

      const startTime = new Date(meeting.start_time)
      const timeStr = startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
      const dateStr = startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' })

      let joinText = ''
      if (meeting.meeting_url) joinText = `<a href="${meeting.meeting_url}" style="color:#B5651D;font-weight:500">Join meeting →</a>`
      else if (meeting.meeting_type === 'phone' && meeting.note) joinText = `📞 Call: ${meeting.note}`
      else if (meeting.meeting_type === 'inperson' && meeting.location) joinText = `📍 ${meeting.location}`
      else if (meeting.meeting_type === 'facetime') joinText = `📱 FaceTime call`

      await sendReminderEmail({ to: org.email,  toName: org.first_name,  otherPersonName: `${part.first_name} ${part.last_name}`, dateStr, timeStr, joinText })
      await sendReminderEmail({ to: part.email, toName: part.first_name, otherPersonName: `${org.first_name} ${org.last_name}`,  dateStr, timeStr, joinText })

      await supabase.from('notifications').insert([
        { user_id: org.id,  type: 'chat_reminder', title: 'Your chat starts in 1 hour ☕', body: `Your coffee chat with ${part.first_name} ${part.last_name} is at ${timeStr} today.`, related_id: meeting.id, related_type: 'meeting' },
        { user_id: part.id, type: 'chat_reminder', title: 'Your chat starts in 1 hour ☕', body: `Your coffee chat with ${org.first_name} ${org.last_name} is at ${timeStr} today.`,  related_id: meeting.id, related_type: 'meeting' }
      ])
      sent++
    }

    return new Response(JSON.stringify({ sent, message: `Sent ${sent} reminders` }), { status: 200 })
  } catch (err) {
    console.error('chat-reminder error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})

async function sendReminderEmail({ to, toName, otherPersonName, dateStr, timeStr, joinText }: {
  to: string, toName: string, otherPersonName: string, dateStr: string, timeStr: string, joinText: string
}) {
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#1C0F07"><div style="background:#B5651D;padding:20px 28px;border-radius:12px 12px 0 0"><div style="color:white;font-size:22px;font-weight:500">First Sip ☕</div></div><div style="background:#FAF7F2;padding:28px;border-radius:0 0 12px 12px;border:1px solid #E8D5C0;border-top:none"><p style="font-size:16px;font-weight:500;margin:0 0 8px">Hey ${toName} 👋</p><p style="font-size:15px;color:#5C3317;margin:0 0 20px">Your coffee chat with <strong>${otherPersonName}</strong> is coming up in about an hour.</p><div style="background:white;border:1px solid #E8D5C0;border-radius:10px;padding:16px 20px;margin-bottom:20px"><div style="font-size:13px;color:#8C7B6E;margin-bottom:4px">📅 ${dateStr}</div><div style="font-size:15px;font-weight:500;margin-bottom:8px">⏰ ${timeStr} ET</div>${joinText ? `<div style="font-size:13px;margin-top:8px">${joinText}</div>` : ''}</div><p style="font-size:13px;color:#8C7B6E;margin:0">Real talk. No small talk. ☕</p><p style="font-size:13px;color:#B8A898;margin:16px 0 0">— The First Sip team</p></div></div>`
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `First Sip <${FROM_EMAIL}>`, to: [to], subject: `☕ Reminder: Your chat with ${otherPersonName} is in 1 hour`, html })
  })
}
