import fs from 'node:fs';
import path from 'node:path';

function createPdf({ title, subtitle, points, helplines }) {
  let streamText = `BT\n/F1 18 Tf\n50 740 Td\n(${title}) Tj\n/F1 11 Tf\n0 -26 Td\n(${subtitle}) Tj\n0 -36 Td\n`;
  points.forEach((pt, idx) => {
    streamText += `(${idx + 1}. ${pt}) Tj\n0 -24 Td\n`;
  });
  streamText += `0 -12 Td\n(${helplines}) Tj\nET\n`;

  const streamLength = Buffer.byteLength(streamText, 'utf8');

  let body = `%PDF-1.4\n`;
  const offsets = [];

  function addObj(content) {
    offsets.push(Buffer.byteLength(body, 'utf8'));
    body += content + `\n`;
  }

  addObj(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`);
  addObj(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`);
  addObj(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj`);
  addObj(`4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamText}endstream\nendobj`);
  addObj(`5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`);

  const startxref = Buffer.byteLength(body, 'utf8');
  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 0; i < offsets.length; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ` 00000 n \n`;
  }
  xref += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

  return body + xref;
}

const checklistsDir = path.resolve('assets/checklists');
if (!fs.existsSync(checklistsDir)) {
  fs.mkdirSync(checklistsDir, { recursive: true });
}

const tenancyPdf = createPdf({
  title: 'RIGHTAWARE NIGERIA: TENANCY & EVICTION CHECKLIST',
  subtitle: 'Under Recovery of Premises Act & State Tenancy Laws',
  points: [
    'WRITTEN NOTICE: Landlords must serve statutory Notice to Quit (6 months for yearly tenant).',
    'SELF-HELP IS ILLEGAL: Locking doors, removing roofs, or seizing property is unlawful.',
    'RENT RECEIPTS: Insist on written receipts for all payments with dates, amounts, and signature.',
    '7 DAYS NOTICE: Notice of Owner Intention to Apply to Court must precede legal filings.',
    'COURT BAILIFF ONLY: Only lawful court bailiffs under valid judicial warrant can execute possession.'
  ],
  helplines: 'EMERGENCY MEDIATION & AID: Legal Aid Council: +234 800 534 2524 | Citizens Mediation'
});
fs.writeFileSync(path.join(checklistsDir, 'tenancy-evidence.pdf'), tenancyPdf, 'utf8');

const salaryPdf = createPdf({
  title: 'RIGHTAWARE NIGERIA: WORKPLACE & SALARY CHECKLIST',
  subtitle: 'Under the Nigerian Labour Act (Cap L1 LFN 2004)',
  points: [
    'WRITTEN TERMS: Employers must provide written employment terms within 3 months.',
    'UNLAWFUL DEDUCTIONS: Deductions from salary without consent or statutory cause are prohibited.',
    'NOTICE OF TERMINATION: Statutory notice or payment of salary in lieu of notice is mandatory.',
    'EVIDENCE LOG: Preserve offer letters, bank statements, official emails, and WhatsApp records.',
    'LEGAL REMEDIES: File complaints with Ministry of Labour or National Industrial Court (NICN).'
  ],
  helplines: 'STATUTORY LABOUR AID: Federal Ministry of Labour | Legal Aid Council: +234 800 534 2524'
});
fs.writeFileSync(path.join(checklistsDir, 'salary-workplace.pdf'), salaryPdf, 'utf8');

console.log('Checklists generated successfully.');
