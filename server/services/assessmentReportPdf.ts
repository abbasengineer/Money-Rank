import PDFDocument from 'pdfkit';
import type { AssessmentReportModel } from './assessmentReportContent';
import { fmtUsd } from './assessmentReportMoneyContext';

type PdfDoc = InstanceType<typeof PDFDocument>;

/** MoneyRank theme (see client/src/index.css) */
const BRAND = {
  primary: '#008f4c',
  primaryDark: '#047857',
  teal: '#0d9488',
  amber: '#d97706',
  slate: '#0f172a',
  slateMuted: '#64748b',
  border: '#e2e8f0',
  rowAlt: '#f1f5f9',
  white: '#ffffff',
};

const MARGIN = 50;
const CONTENT_WIDTH = 512;
const PAGE_MAX_Y = 720;
const BAR_CHART_LEFT = MARGIN + 130;
const BAR_MAX_W = CONTENT_WIDTH - 130;

function ensureSpace(doc: PdfDoc, need: number): void {
  if (doc.y + need > PAGE_MAX_Y) {
    doc.addPage();
    doc.y = MARGIN;
  }
}

function heading(doc: PdfDoc, text: string, size: number): void {
  ensureSpace(doc, 28);
  doc.font('Helvetica-Bold').fontSize(size).fillColor(BRAND.slate);
  doc.text(text, MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'left' });
  doc.moveDown(0.55);
}

function body(doc: PdfDoc, text: string, size = 10, gap = 0.4): void {
  ensureSpace(doc, 40);
  doc.font('Helvetica').fontSize(size).fillColor('#334155');
  doc.text(text, MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'left', lineGap: 2 });
  doc.moveDown(gap);
  doc.fillColor(BRAND.slate);
}

function bulletList(doc: PdfDoc, items: string[]): void {
  for (const item of items) {
    ensureSpace(doc, 42);
    doc.font('Helvetica').fontSize(9.5).fillColor('#334155');
    doc.text(`• ${item}`, MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'left', lineGap: 1.5 });
    doc.moveDown(0.38);
  }
  doc.moveDown(0.15);
}

/** Branded header: amber accent + emerald banner + lettermark + title */
function drawBrandHeader(doc: PdfDoc): void {
  const top = 40;
  const bannerH = 58;
  const pageRight = MARGIN + CONTENT_WIDTH;

  doc.save();
  // Amber accent strip
  doc.rect(MARGIN, top, 6, bannerH).fill(BRAND.amber);

  // Main emerald banner
  doc.roundedRect(MARGIN + 6, top, CONTENT_WIDTH - 6, bannerH, 10).fill(BRAND.primary);

  // White rounded lettermark
  doc.roundedRect(MARGIN + 18, top + 8, 42, 42, 8).fill(BRAND.white);
  doc.fillColor(BRAND.primary).font('Helvetica-Bold').fontSize(24).text('M', MARGIN + 30, top + 18, {
    lineBreak: false,
  });

  // Titles
  doc.fillColor(BRAND.white).font('Helvetica-Bold').fontSize(20).text('MoneyRank', MARGIN + 72, top + 12);
  doc.font('Helvetica').fontSize(10.5).opacity(0.92);
  doc.text('Financial profile report', MARGIN + 72, top + 36, { width: 400 });
  doc.opacity(1);
  doc.restore();

  doc.y = top + bannerH + 18;
  doc.fillColor(BRAND.slate);
}

function drawGeneratedDate(doc: PdfDoc, generatedAt: Date): void {
  doc.font('Helvetica').fontSize(9).fillColor(BRAND.slateMuted);
  doc.text(
    `Generated ${generatedAt.toLocaleDateString('en-US', { dateStyle: 'long' })}`,
    MARGIN,
    doc.y,
    { width: CONTENT_WIDTH }
  );
  doc.moveDown(0.9);
  doc.fillColor(BRAND.slate);
}

/** Simple key/value table with zebra rows */
function drawKeyValueTable(
  doc: PdfDoc,
  title: string,
  rows: { label: string; value: string }[]
): void {
  if (rows.length === 0) return;

  ensureSpace(doc, 36 + rows.length * 24);
  heading(doc, title, 11);

  const rowH = 22;
  let y = doc.y;

  rows.forEach((row, i) => {
    ensureSpace(doc, rowH + 4);
    y = doc.y;
    if (i % 2 === 0) {
      doc.save();
      doc.rect(MARGIN, y, CONTENT_WIDTH, rowH).fill(BRAND.rowAlt);
      doc.restore();
    }
    doc.fillColor(BRAND.slate).font('Helvetica-Bold').fontSize(8.5);
    doc.text(row.label, MARGIN + 6, y + 6, { width: 168, lineBreak: true });
    doc.fillColor('#334155').font('Helvetica').fontSize(8.5);
    doc.text(row.value, MARGIN + 182, y + 6, { width: CONTENT_WIDTH - 188, lineBreak: true });
    doc.y = y + rowH;
  });
  doc.moveDown(0.45);
}

/** Stacked horizontal bar for 50/30/20 */
function draw503020Stack(doc: PdfDoc, split: { needs: number; wants: number; savingsDebt: number }): void {
  ensureSpace(doc, 110);
  heading(doc, '50 / 30 / 20 snapshot (estimated take-home)', 11);

  const total = split.needs + split.wants + split.savingsDebt;
  if (total <= 0) return;

  const barY = doc.y;
  const barH = 16;
  const wNeeds = (split.needs / total) * CONTENT_WIDTH;
  const wWants = (split.wants / total) * CONTENT_WIDTH;
  const wSave = (split.savingsDebt / total) * CONTENT_WIDTH;

  doc.save();
  let x = MARGIN;
  doc.rect(x, barY, wNeeds, barH).fill(BRAND.primary);
  x += wNeeds;
  doc.rect(x, barY, wWants, barH).fill(BRAND.teal);
  x += wWants;
  doc.rect(x, barY, wSave, barH).fill(BRAND.amber);
  doc.restore();

  doc.y = barY + barH + 8;

  doc.font('Helvetica').fontSize(8).fillColor('#334155');
  doc.text(
    `Needs 50% ${fmtUsd(split.needs)}  ·  Wants 30% ${fmtUsd(split.wants)}  ·  Savings/debt 20% ${fmtUsd(split.savingsDebt)}`,
    MARGIN,
    doc.y,
    { width: CONTENT_WIDTH }
  );
  doc.moveDown(0.9);
}

/** Horizontal bar chart for topic scores 0–100 */
function drawTopicScoreChart(doc: PdfDoc, topicRows: { name: string; score: number }[]): void {
  if (topicRows.length === 0) return;

  ensureSpace(doc, 32 + topicRows.length * 20);
  heading(doc, 'Topic scores (chart)', 11);
  doc.font('Helvetica').fontSize(8.5).fillColor(BRAND.slateMuted);
  doc.text('Bar length = match score (0–100) vs. expert-ranked order.', MARGIN, doc.y, { width: CONTENT_WIDTH });
  doc.moveDown(0.45);

  const labelW = 118;
  const trackH = 9;

  for (const row of topicRows) {
    ensureSpace(doc, 22);
    const rowTop = doc.y;
    doc.font('Helvetica').fontSize(8).fillColor('#334155');
    doc.text(row.name, MARGIN, rowTop + 1, { width: labelW, lineGap: 0 });
    const trackX = BAR_CHART_LEFT;
    doc.strokeColor(BRAND.border).lineWidth(0.4);
    doc.rect(trackX, rowTop + 1, BAR_MAX_W, trackH).stroke();
    const fillW = Math.max(0, (row.score / 100) * BAR_MAX_W);
    doc.save();
    doc.rect(trackX, rowTop + 1, fillW, trackH).fill(BRAND.primary);
    doc.restore();
    doc.fillColor(BRAND.slate).font('Helvetica-Bold').fontSize(7.5);
    doc.text(`${row.score}`, trackX + BAR_MAX_W + 6, rowTop + 2, { width: 36 });
    doc.y = rowTop + trackH + 7;
  }
  doc.moveDown(0.35);
}

/** Mini gauges: literacy match + decision risk */
function drawScoreGauges(
  doc: PdfDoc,
  averageScore: number,
  overallRiskScore: number
): void {
  ensureSpace(doc, 88);
  heading(doc, 'Score overview (chart)', 11);

  const drawGauge = (label: string, value: number, max: number, color: string, yStart: number): number => {
    const gw = CONTENT_WIDTH;
    doc.font('Helvetica').fontSize(8).fillColor('#334155');
    doc.text(label, MARGIN, yStart, { width: CONTENT_WIDTH - 60, lineGap: 1 });
    const trackY = yStart + 14;
    doc.strokeColor(BRAND.border).lineWidth(0.45);
    doc.rect(MARGIN, trackY, gw, 10).stroke();
    const fw = Math.min(gw, Math.max(0, (value / max) * gw));
    doc.save();
    doc.rect(MARGIN, trackY, fw, 10).fill(color);
    doc.restore();
    doc.fillColor(BRAND.slate).font('Helvetica-Bold').fontSize(8);
    doc.text(`${Math.round(value)} / ${max}`, MARGIN + gw - 58, trackY + 1, { width: 56, align: 'right' });
    return trackY + 26;
  };

  let gy = doc.y;
  gy = drawGauge('Literacy match (scenario score)', averageScore, 100, BRAND.primary, gy);
  gy = drawGauge(
    'Decision risk index (higher = more “risky” ranked choices)',
    overallRiskScore,
    100,
    BRAND.amber,
    gy
  );
  doc.y = gy;
  doc.moveDown(0.2);
}

export function generateAssessmentReportPdfBuffer(model: AssessmentReportModel): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: MARGIN });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.y = MARGIN;
    drawBrandHeader(doc);
    drawGeneratedDate(doc, model.generatedAt);

    if (model.questionnaire.profileBullets.length > 0) {
      ensureSpace(doc, 24 + model.questionnaire.profileBullets.length * 12);
      heading(doc, 'Your questionnaire snapshot', 12);
      for (const line of model.questionnaire.profileBullets) {
        body(doc, `• ${line}`, 9.5, 0.28);
      }
    }

    drawKeyValueTable(doc, 'Your numbers (from the quiz)', model.questionnaire.moneyRows);

    if (model.questionnaire.split503020) {
      draw503020Stack(doc, model.questionnaire.split503020);
    }

    heading(doc, 'Your Financial Profile', 13);
    body(doc, 'Personalized insights based on your quiz rankings and the information you provided.', 10);

    drawScoreGauges(doc, model.profile.averageScore, model.profile.overallRiskScore);

    body(
      doc,
      `Trend: ${model.profile.riskTrend}. ${model.profile.riskStyleLine}`,
      10,
      0.45
    );

    drawTopicScoreChart(doc, model.profile.topicRows);

    heading(doc, 'Personalized insights', 11);
    for (const line of model.personalizedInsights) {
      body(doc, line, 10, 0.42);
    }

    heading(doc, 'Recommendations', 11);
    for (const line of model.recommendations) {
      body(doc, `• ${line}`, 10, 0.32);
    }
    doc.moveDown(0.25);

    heading(doc, 'How to read this report', 11);
    for (const line of model.baselineReference) {
      body(doc, line, 9.5, 0.38);
    }

    ensureSpace(doc, 48);
    heading(doc, 'Deeper checklist', 12);
    doc.font('Helvetica').fontSize(9).fillColor(BRAND.slateMuted);
    doc.text('Rules below use your questionnaire where we have it; remaining items are general reminders.', MARGIN, doc.y, {
      width: CONTENT_WIDTH,
    });
    doc.moveDown(0.55);
    doc.fillColor(BRAND.slate);

    for (const section of model.sections) {
      ensureSpace(doc, 72);
      heading(doc, section.title, 10.5);
      bulletList(doc, section.rules);
      if (section.yourInsight) {
        ensureSpace(doc, 36);
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(BRAND.primaryDark);
        doc.text('Note: ', MARGIN, doc.y, { continued: true });
        doc.font('Helvetica').fillColor('#334155');
        doc.text(section.yourInsight, { width: CONTENT_WIDTH, lineGap: 1.5 });
        doc.moveDown(0.45);
      }
      doc.fillColor(BRAND.slate);
    }

    ensureSpace(doc, 44);
    doc.moveDown(0.35);
    heading(doc, 'Keep building your score', 11);
    body(doc, model.literacyReminder, 10.5, 0.55);
    body(
      doc,
      'This report is educational and based on rules of thumb—not individualized financial, tax, or legal advice.',
      9,
      0.3
    );

    doc.end();
  });
}
