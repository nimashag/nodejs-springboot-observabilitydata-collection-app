// services/email.service.ts
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { logError, logInfo } from '../utils/logger';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  }
});

export const sendOrderStatusEmail = async (
  to: string,
  orderId: string,
  newStatus: string
) => {
  const mailOptions = {
    from: 'HungerJet <dev40.emailtest@gmail.com>',
    to,
    subject: `🍽️ HungerJet - Order #${orderId} is now ${newStatus}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
        <h2 style="color: #ff5722;">HungerJet</h2>
        <p>Hello,</p>
        <p>We're happy to let you know that the status of your order <strong>#${orderId}</strong> has been updated to:</p>
        <h3 style="color: #4caf50;">${newStatus}</h3>
        <p>We'll keep you posted as your order progresses. Thank you for choosing <strong>HungerJet</strong>!</p>
        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #888;">This is an automated message. Please do not reply.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    logInfo('email.orderStatus.sent', { to, orderId, status: newStatus });
  } catch (error) {
    logError('email.orderStatus.error', { to, orderId, status: newStatus }, error as Error);
  }
};
