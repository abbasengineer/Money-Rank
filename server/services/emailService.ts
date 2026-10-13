import type { UserRiskProfile } from './riskProfileService';
import { buildAssessmentReportModel } from './assessmentReportContent';
import { generateAssessmentReportPdfBuffer } from './assessmentReportPdf';

const PDF_FILENAME = 'MoneyRank-Financial-Profile-Report.pdf';

/**
 * Sends assessment report with PDF attachment. Without RESEND_API_KEY, logs to console (local dev).
 */
export async function sendAssessmentReportEmail(
  to: string,
  riskProfile: UserRiskProfile,
  opts?: { baseUrl?: string; demographics?: Record<string, unknown> | null }
): Promise<{ ok: boolean; mode: 'resend' | 'console' }> {
  const baseUrl = opts?.baseUrl || process.env.BASE_URL || 'http://localhost:5000';
  const subject = 'Your MoneyRank financial profile report';
  const text = buildReportText(riskProfile, baseUrl);
  const html = buildReportHtml(riskProfile, baseUrl);
  const model = buildAssessmentReportModel(riskProfile, opts?.demographics ?? undefined);
  const pdfBuffer = await generateAssessmentReportPdfBuffer(model);

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'MoneyRank <onboarding@resend.dev>';

  if (!apiKey) {
    console.log('\n--- [emailService] RESEND_API_KEY not set; report would be sent to:', to, '---\n');
    console.log(subject);
    console.log(text);
    console.log(`[PDF attachment: ${PDF_FILENAME}, ${pdfBuffer.length} bytes]`);
    console.log('--- end email preview ---\n');
    return { ok: true, mode: 'console' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
      attachments: [
        {
          filename: PDF_FILENAME,
          content: pdfBuffer.toString('base64'),
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend error ${res.status}: ${errText}`);
  }

  return { ok: true, mode: 'resend' };
}

function topicScores(profile: UserRiskProfile): Record<string, number> {
  const raw = profile.categoryScenarioScores;
  if (raw && Object.keys(raw).length > 0) return raw;
  return Object.fromEntries(Object.keys(profile.categoryRiskScores).map((k) => [k, profile.averageScore]));
}

function buildReportText(profile: UserRiskProfile, baseUrl: string): string {
  const topics = topicScores(profile);
  const lines = [
    'Your MoneyRank financial profile report',
    '',
    `Overall scenario match: ${profile.averageScore} out of 100 (higher = closer to expert-ranked answers).`,
    '',
    'A detailed PDF is attached: rules of thumb, your signals, and recommendations.',
    '',
    'By topic (scenario match):',
    ...Object.entries(topics).map(([k, v]) => `  ${k}: ${v}`),
    '',
    'Keep improving:',
    '— Complete the daily challenge to improve your literacy score.',
    `— Use Tools: ${baseUrl}/tools`,
    `— Open your profile: ${baseUrl}/profile`,
    '',
    `Retake the quiz: ${baseUrl}/assessment`,
  ];
  return lines.join('\n');
}

function buildReportHtml(profile: UserRiskProfile, baseUrl: string): string {
  const cats = Object.entries(topicScores(profile))
    .map(([k, v]) => `<li><strong>${escapeHtml(k)}</strong>: ${v} / 100</li>`)
    .join('');
  return `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; color: #0f172a;">
  <h1>Your MoneyRank financial profile report</h1>
  <p><strong>Overall scenario match:</strong> ${profile.averageScore} out of 100</p>
  <p>Higher scores mean your ranked choices were closer to expert-ranked answers. <strong>Your full PDF report is attached</strong> (rules of thumb, personalized signals, and recommendations).</p>
  <p><strong>By topic</strong></p>
  <ul>${cats}</ul>
  <p><strong>Tip:</strong> Complete the daily challenge to improve your literacy score.</p>
  <p><a href="${baseUrl}/">Daily challenge</a> · <a href="${baseUrl}/tools">Tools</a> · <a href="${baseUrl}/profile">Profile</a> · <a href="${baseUrl}/assessment">Retake quiz</a></p>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
