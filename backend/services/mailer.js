import nodemailer from 'nodemailer';

let transport;

// SMTP is configured through SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS /
// SMTP_FROM. Without SMTP_HOST, emails are printed to the console so the whole
// flow (verification links, reset links) still works in development.
const getTransport = () => {
  if (transport !== undefined) return transport;
  if (!process.env.SMTP_HOST) {
    transport = null;
    return transport;
  }
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
  return transport;
};

export const appUrl = (path = '') => `${(process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')}${path}`;

// Never throws: a failed email must not fail the request that triggered it.
export const sendEmail = async ({ to, subject, text }) => {
  const smtp = getTransport();
  if (!smtp) {
    console.log(`\n[email:console] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }
  try {
    await smtp.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text });
  } catch (error) {
    console.error(`Failed to send email to ${to}: ${error.message}`);
  }
};
