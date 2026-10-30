import PDFDocument from 'pdfkit';
import { ROUND_LABELS, CHOICES } from './allotment.js';

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'To be announced');

const STATUS_TEXT = {
  allotted: 'Allotted - choice pending',
  ...Object.fromEntries(Object.values(CHOICES).map(c => [c.status, c.label]))
};

// Streams the allotment order letter for one allotment into `res`.
export const writeAllotmentOrder = (res, { allotment, faculty }) => {
  const doc = new PDFDocument({ size: 'A4', margin: 56 });
  const round = allotment.counsellingRound;
  const college = allotment.college;
  const orderNo = `FC/${new Date(allotment.allottedAt).getFullYear()}/${round?.type?.toUpperCase() || 'R'}/${String(allotment.id).padStart(5, '0')}`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="allotment-order-${allotment.id}.pdf"`);
  doc.pipe(res);

  doc.font('Helvetica-Bold').fontSize(16).text('Faculty Counselling', { align: 'center' });
  doc.font('Helvetica').fontSize(11).text('Provisional Allotment Order', { align: 'center' });
  doc.moveDown(1.5);

  doc.fontSize(10)
    .text(`Order No: ${orderNo}`, { continued: true })
    .text(`Date: ${formatDate(allotment.allottedAt)}`, { align: 'right' });
  doc.moveDown(1.5);

  doc.fontSize(11).text(`To,\n${faculty.name}\n${faculty.email}`);
  doc.moveDown();
  doc.text(
    `Based on your merit rank and the options you entered, you have been provisionally allotted ` +
    `the following position in ${ROUND_LABELS[round?.type] || 'counselling'}.`
  );
  doc.moveDown();

  const rows = [
    ['Merit rank', faculty.rank ? `#${faculty.rank}` : '-'],
    ['Score', String(faculty.totalScore ?? '-')],
    ['Counselling round', ROUND_LABELS[round?.type] || '-'],
    ['College', `${college?.name || '-'} (${college?.code || '-'})`],
    ['Location', [college?.location, college?.district].filter(Boolean).join(', ') || '-'],
    ['Department', allotment.department || '-'],
    ['Option number', allotment.optionNumber ? String(allotment.optionNumber) : '-'],
    ['Status', STATUS_TEXT[allotment.status] || allotment.status],
    ['Report by', formatDate(round?.reportingDeadline)]
  ];

  const labelX = doc.x;
  const valueX = labelX + 150;
  for (const [label, value] of rows) {
    const y = doc.y;
    doc.font('Helvetica-Bold').text(label, labelX, y, { width: 140 });
    doc.font('Helvetica').text(value, valueX, y, { width: 330 });
    doc.moveDown(0.4);
  }

  doc.moveDown();
  doc.x = labelX;
  doc.font('Helvetica-Bold').text('Instructions');
  doc.font('Helvetica').fontSize(10).list([
    'Report to the allotted college with this order and original certificates on or before the reporting date.',
    'Exercise your post-allotment choice on the portal before the choices window closes. If you do not, the seat lapses and you leave counselling.',
    'This allotment is provisional and subject to verification of original documents at the college.'
  ], { bulletRadius: 2 });

  doc.moveDown(3);
  doc.fontSize(9).fillColor('#666666')
    .text('This is a computer-generated document and does not require a signature.', { align: 'center' });

  doc.end();
};
