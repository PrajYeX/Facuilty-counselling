import { Notification } from '../models/index.js';
import { sendEmail, appUrl } from './mailer.js';

// Records an in-portal notification and emails the same text.
export const notify = async (user, { type, title, message, link }) => {
  await Notification.create({ userId: user.id, type, title, message, link });
  sendEmail({
    to: user.email,
    subject: `Faculty Counselling: ${title}`,
    text: `Dear ${user.name},\n\n${message}\n\n${link ? `${appUrl(link)}\n\n` : ''}This is an automated message from the Faculty Counselling portal.`
  });
};

export const notifyMany = async (users, build) => {
  for (const user of users) {
    await notify(user, build(user));
  }
};
