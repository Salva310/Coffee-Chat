import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_KEY')!
)

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL    = Deno.env.get('FROM_EMAIL') ?? 'sal@firstsipapp.com'
const APP_URL       = Deno.env.get('APP_URL')    ?? 'https://coffee-chat-topaz.vercel.app'

Deno.serve(async (req) => {
  try {
    const { meeting_id } = await req.json()
    if (!meeting_id) {
      return new Response(JSON.stringify({ error: 'meeting_id required' }), { status: 400 })
    }

    const { data: meeting, error } = await supabase
      .from('meetings')
      .select(`
        id, start_time, end_time, meeting_type, meeting_url, location, note, status,
        organizer:profiles!meetings_organizer_id_fkey(id, first_name, last_name, email, major, headline),
        participant:profiles!meetings_participant_id_fkey(id, first_name, last_name, email, major, headline)
      `)
      .eq('id', meeting_id)
      .single()

    if (error || !meeting) throw error ?? new Error('Meeting not found')

    const org  = meeting.organizer  as any
    const part = meeting.participant as any

    if (!org?.email || !part?.email) {
      return new Response(JSON.stringify({ error: 'Missing email addresses' }), { status: 400 })
    }

    const startTime = new Date(meeting.start_time)
    const endTime   = new Date(meeting.end_time)

    const dateStr  = startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' })
    const startStr = startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
    const endStr   = endTime.toLocaleTimeString('en-US',   { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })

    const formatMap: Record<string, string> = { video: '🎥 Video call', phone: '📞 Phone call', facetime: '📱 FaceTime', inperson: '📍 In person' }
    const formatLabel = formatMap[meeting.meeting_type] ?? '☕ Coffee chat'

    let joinLine = ''
    if (meeting.meeting_url) {
      joinLine = `<a href="${meeting.meeting_url}" style="color:#B5651D;font-weight:500">Join meeting →</a>`
    } else if ((meeting.meeting_type === 'phone' || meeting.meeting_type === 'facetime') && meeting.note) {
      joinLine = `${formatLabel}: ${meeting.note}`
    } else if (meeting.meeting_type === 'inperson' && meeting.location) {
      joinLine = `📍 ${meeting.location}`
    }

    const calStart = startTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const calEnd   = endTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const calTitle = encodeURIComponent('Coffee Chat on First Sip ☕')
    const calUrl   = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calTitle}&dates=${calStart}/${calEnd}`

    await sendConfirmationEmail({ to: org.email,  toName: org.first_name,  otherPerson: part, dateStr, startStr, endStr, formatLabel, joinLine, calUrl, chatsUrl: `${APP_URL}/chats` })
    await sendConfirmationEmail({ to: part.email, toName: part.first_name, otherPerson: org,  dateStr, startStr, endStr, formatLabel, joinLine, calUrl, chatsUrl: `${APP_URL}/chats` })

    return new Response(JSON.stringify({ sent: 2, meeting_id }), { status: 200 })

  } catch (err) {
    console.error('meeting-confirmed error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})

async function sendConfirmationEmail({ to, toName, otherPerson, dateStr, startStr, endStr, formatLabel, joinLine, calUrl, chatsUrl }: {
  to: string, toName: string, otherPerson: any, dateStr: string, startStr: string, endStr: string,
  formatLabel: string, joinLine: string, calUrl: string, chatsUrl: string
}) {
  const otherName = `${otherPerson.first_name} ${otherPerson.last_name}`
  const otherSub  = otherPerson.headline || otherPerson.major || 'Rowan University'

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#1C0F07">
      <div style="background:#B5651D;padding:20px 28px;border-radius:12px 12px 0 0">
        <div style="color:white;font-size:22px;font-weight:500">First Sip ☕</div>
      </div>
      <div style="background:#FAF7F2;padding:28px;border-radius:0 0 12px 12px;border:1px solid #E8D5C0;border-top:none">
        <p style="font-size:16px;font-weight:500;margin:0 0 6px">You're all set, ${toName}! ✅</p>
        <p style="font-size:15px;color:#5C3317;margin:0 0 24px">Your coffee chat with <strong>${otherName}</strong> is confirmed.</p>
        <div style="background:white;border:1px solid #E8D5C0;border-radius:10px;padding:14px 16px;margin-bottom:16px">
          <div style="font-size:14px;font-weight:500">${otherName}</div>
          <div style="font-size:12px;color:#8C7B6E;margin-top:2px">${otherSub}</div>
        </div>
        <div style="background:white;border:1px solid #E8D5C0;border-radius:10px;padding:16px 20px;margin-bottom:20px">
          <div style="font-size:13px;font-weight:500;text-transform:uppercase;letter-spacing:0.06em;color:#B5651D;margin-bottom:10px">Meeting details</div>
          <div style="font-size:14px;margin-bottom:6px">📅 ${dateStr}</div>
          <div style="font-size:14px;margin-bottom:6px">⏰ ${startStr} – ${endStr} ET</div>
          <div style="font-size:14px">${formatLabel}</div>
          ${joinLine ? `<div style="font-size:14px;margin-top:4px">${joinLine}</div>` : ''}
        </div>
        <a href="${calUrl}" style="display:block;background:#B5651D;color:white;text-align:center;padding:12px 20px;border-radius:9px;font-size:15px;font-weight:500;text-decoration:none;margin-bottom:10px">📅 Add to Google Calendar</a>
        <a href="${chatsUrl}" style="display:block;background:white;color:#B5651D;text-align:center;padding:12px 20px;border-radius:9px;font-size:15px;font-weight:500;text-decoration:none;border:1px solid #E8D5C0;margin-bottom:24px">View in First Sip →</a>
        <div style="background:#F5EDE3;border-radius:8px;padding:12px 14px;margin-bottom:20px">
          <div style="font-size:12px;font-weight:500;color:#B5651D;margin-bottom:4px">☕ Quick tip</div>
          <div style="font-size:13px;color:#5C3317;line-height:1.5">Check ${otherPerson.first_name}'s profile before the chat — knowing their interests makes for a much better conversation.</div>
        </div>
        <p style="font-size:13px;color:#8C7B6E;margin:0">Real talk. No small talk. ☕</p>
        <p style="font-size:13px;color:#B8A898;margin:16px 0 0">— The First Sip team</p>
      </div>
    </div>
  `

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `First Sip <${FROM_EMAIL}>`, to: [to], subject: `Your chat with ${otherPerson.first_name} is confirmed ✅`, html })
  })
}
