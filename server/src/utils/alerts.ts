import { sendMail, siteUrl } from './mailer';

/**
 * Письмо администратору о падении на сервере (500). Не чаще раза
 * в 15 минут: при массовом сбое придёт одно письмо со счётчиком, а не сотня.
 */
const WINDOW_MS = 15 * 60 * 1000;
let lastSentAt = 0;
let suppressed = 0;

export const reportServerError = (error: unknown, context = '') => {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to || process.env.NODE_ENV === 'test') return;

  const now = Date.now();
  if (now - lastSentAt < WINDOW_MS) {
    suppressed += 1;
    return;
  }

  const skipped = suppressed;
  lastSentAt = now;
  suppressed = 0;

  const message = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error);
  void sendMail({
    to,
    subject: 'Облако науки: ошибка на сервере',
    paragraphs: [
      `На ${siteUrl()} произошла ошибка${context ? ` (${context})` : ''}.`,
      message.slice(0, 3000),
      skipped ? `За прошлые 15 минут было ещё ${skipped} ошибок — письма о них не отправлялись.` : '',
      'Подробности — в логах: docker logs cloudco-backend --tail 200',
    ].filter(Boolean),
  });
};
