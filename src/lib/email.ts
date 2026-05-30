/**
 * AWS SES Email Service for Prokip Qualification Portal.
 * Used to release exam scores to candidates.
 */

import { SESClient, SendEmailCommand, SendBulkTemplatedEmailCommand } from '@aws-sdk/client-ses'

const ses = new SESClient({
  region: process.env.AWS_SES_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      }
    : undefined,
})

const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@prokip.com'
const FROM_NAME = process.env.SES_FROM_NAME || 'Prokip Qualification Portal'

interface ScoreEmailData {
  to: string
  candidateName: string
  quizTitle: string
  score: number
  percentageScore: number
  totalMarks: number
  passMark: number
  passed: boolean
  state?: string
  additionalMessage?: string
}

/**
 * Send a single score release email.
 */
export async function sendScoreEmail(data: ScoreEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const statusColor = data.passed ? '#28a745' : '#dc3545'
  const statusText = data.passed ? 'PASSED' : 'FAILED'
  const statusEmoji = data.passed ? '✅' : '❌'

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#1B2B4B;border-radius:16px 16px 0 0;padding:30px;text-align:center;">
      <h1 style="color:#F5B731;margin:0;font-size:24px;">Prokip Qualification Portal</h1>
      <p style="color:#94A3B8;margin:8px 0 0;font-size:14px;">Examination Results</p>
    </div>
    <div style="background:#FFFFFF;padding:30px;border:1px solid #E2E8F0;border-top:none;">
      <p style="color:#1B2B4B;font-size:16px;margin:0 0 20px;">Dear <strong>${data.candidateName}</strong>,</p>
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
        Your results for <strong>${data.quizTitle}</strong> are now available. Please find your score details below:
      </p>
      <div style="background:#F8FAFC;border-radius:12px;padding:20px;margin:0 0 20px;border:1px solid #E2E8F0;">
        <div style="text-align:center;margin-bottom:16px;">
          <span style="font-size:48px;">${statusEmoji}</span>
          <h2 style="color:${statusColor};margin:8px 0 0;font-size:28px;">${statusText}</h2>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#94A3B8;font-size:13px;">Score</td>
            <td style="padding:8px 0;color:#1B2B4B;font-size:15px;font-weight:600;text-align:right;">${data.score} / ${data.totalMarks}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#94A3B8;font-size:13px;">Percentage</td>
            <td style="padding:8px 0;color:#1B2B4B;font-size:15px;font-weight:600;text-align:right;">${data.percentageScore}%</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#94A3B8;font-size:13px;">Pass Mark</td>
            <td style="padding:8px 0;color:#1B2B4B;font-size:15px;font-weight:600;text-align:right;">${data.passMark}%</td>
          </tr>
          ${data.state ? `<tr>
            <td style="padding:8px 0;color:#94A3B8;font-size:13px;">State</td>
            <td style="padding:8px 0;color:#1B2B4B;font-size:15px;font-weight:600;text-align:right;">${data.state}</td>
          </tr>` : ''}
        </table>
      </div>
      ${data.additionalMessage ? `<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">${data.additionalMessage}</p>` : ''}
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0;">
        ${data.passed
          ? 'Congratulations on passing the qualification exam! You will be contacted with further instructions.'
          : 'Unfortunately, you did not meet the pass mark this time. Please contact your state manager for information on next steps.'}
      </p>
    </div>
    <div style="background:#F1F5F9;border-radius:0 0 16px 16px;padding:20px;text-align:center;border:1px solid #E2E8F0;border-top:none;">
      <p style="color:#94A3B8;font-size:12px;margin:0;">© ${new Date().getFullYear()} Prokip. All rights reserved.</p>
      <p style="color:#94A3B8;font-size:11px;margin:4px 0 0;">This is an automated message. Do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`

  const textBody = `Dear ${data.candidateName},

Your results for ${data.quizTitle} are now available.

Status: ${statusText}
Score: ${data.score} / ${data.totalMarks}
Percentage: ${data.percentageScore}%
Pass Mark: ${data.passMark}%
${data.state ? `State: ${data.state}` : ''}

${data.passed
  ? 'Congratulations on passing the qualification exam!'
  : 'Unfortunately, you did not meet the pass mark this time. Please contact your state manager for next steps.'}

${data.additionalMessage || ''}

— Prokip Qualification Portal`

  try {
    const command = new SendEmailCommand({
      Source: `${FROM_NAME} <${FROM_EMAIL}>`,
      Destination: { ToAddresses: [data.to] },
      Message: {
        Subject: { Data: `${statusEmoji} Your Prokip Exam Results — ${statusText}`, Charset: 'UTF-8' },
        Body: {
          Html: { Data: htmlBody, Charset: 'UTF-8' },
          Text: { Data: textBody, Charset: 'UTF-8' },
        },
      },
    })

    const result = await ses.send(command)
    return { success: true, messageId: result.MessageId }
  } catch (error) {
    console.error('SES send failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Send score emails in batches (max 50 per SES call).
 * Returns summary of sent/failed.
 */
export async function sendBulkScoreEmails(
  emails: ScoreEmailData[],
  onProgress?: (sent: number, total: number) => void
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const BATCH_SIZE = 14 // SES rate limit friendly
  const BATCH_DELAY = 1000 // 1s between batches
  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE)
    
    const results = await Promise.allSettled(
      batch.map(data => sendScoreEmail(data))
    )

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.success) {
        sent++
      } else {
        failed++
        const err = result.status === 'fulfilled' ? result.value.error : String(result.reason)
        errors.push(err || 'Unknown error')
      }
    }

    onProgress?.(sent + failed, emails.length)

    // Delay between batches to respect SES rate limits
    if (i + BATCH_SIZE < emails.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
    }
  }

  return { sent, failed, errors: [...new Set(errors)] }
}
