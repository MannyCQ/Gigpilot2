// api/send-email.js
// Vercel serverless function — handles email sending via Resend
// Deploy this file to your repo at: api/send-email.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, body, fromName } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) {
    return res.status(500).json({ error: 'Resend not configured' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName || 'GigPilot'} <bookings@yourdomain.com>`,
        to: [to],
        subject,
        text: body,
        html: body.replace(/\n/g, '<br>'),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data.message || 'Send failed' });
    }

    return res.status(200).json({ id: data.id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
