import nodemailer from 'nodemailer';
import { Attachment } from 'nodemailer/lib/mailer';
import logger from '../common/logger';
import { SMTP_FORM, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_TLS, SMTP_USER } from '../config';
import { renderTemplate } from './template';

export async function sendMail(options: {
  to: string;
  subject: string;
  templateName: string;
  data: object;
  attachments?: Attachment[];
}) {
  const { to, subject, data, templateName, attachments } = options;
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_TLS,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    logger: true,
    transactionLog: false,
  });

  const info = await transporter.sendMail({
    to,
    subject,
    from: `${SMTP_FORM} <${SMTP_USER}>`,
    html: renderTemplate(templateName, data),
    attachments,
  });

  logger.log('Email sent: %s', info.messageId);
}
