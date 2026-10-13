import nodemailer, { Transporter } from 'nodemailer';

/**
 * Почта. Настраивается в deploy/.env:
 *   SMTP_HOST, SMTP_PORT (465 — SSL, 587 — STARTTLS), SMTP_USER, SMTP_PASS, SMTP_FROM
 * Без SMTP_HOST письма не уходят, а только пишутся в лог — сайт работает,
 * а ссылки для сброса пароля и согласия родителя выдаёт администратор.
 */
let transporter: Transporter | null = null;

export const isMailConfigured = () => !!process.env.SMTP_HOST;

const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 465;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
};

/** Адрес сайта для ссылок в письмах */
export const siteUrl = () => (process.env.PUBLIC_URL || process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:3000').replace(/\/$/, '');

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

interface Letter {
  to: string;
  subject: string;
  /** Абзацы текста; ссылка — отдельной кнопкой */
  paragraphs: string[];
  action?: { label: string; url: string };
}

/** Отправить письмо. true — ушло, false — почта не настроена или не удалось */
export const sendMail = async ({ to, subject, paragraphs, action }: Letter) => {
  const text = [...paragraphs, action ? `${action.label}: ${action.url}` : '', '—', 'Облако науки'].filter(Boolean).join('\n\n');

  if (!isMailConfigured()) {
    console.log(`[почта не настроена] письмо «${subject}» для ${to} не отправлено`);
    return false;
  }

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#111;max-width:520px">
${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n')}
${action ? `<p><a href="${escapeHtml(action.url)}" style="display:inline-block;padding:12px 22px;border-radius:24px;background:#111;color:#fff;text-decoration:none">${escapeHtml(action.label)}</a></p><p style="font-size:12px;color:#666">Если кнопка не работает, откройте ссылку: ${escapeHtml(action.url)}</p>` : ''}
<p style="color:#666">— Облако науки</p></div>`;

  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    console.error(`Письмо «${subject}» для ${to} не ушло:`, error instanceof Error ? error.message : error);
    return false;
  }
};
