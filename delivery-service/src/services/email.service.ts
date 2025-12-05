import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Create a transporter using Gmail (or another email service)
const transporter = nodemailer.createTransport({
  service: 'gmail',  
  auth: {
    user: process.env.EMAIL_USER, 
 // Use email from environment variables
    pass: process.env.EMAIL_PASS,  // Use App password from environment variables
  },
});

export const sendEmail = async (to: string, subject: string, text: string) => {
  try {
    console.log('email:',process.env.EMAIL_USER);
    console.log('pass:',process.env.EMAIL_PASS);
    const info = await transporter.sendMail({
      from: `"HungerJet" <${process.env.EMAIL_USER}>`,  // Sender email from environment variable
      to,  // Recipient email (parameter)
      subject,  // Email subject (parameter)
      text,  // Email body (parameter)
    });
    console.log('Email sent: ', info.messageId);  // Log the message ID of the sent email
  } catch (error) {
    console.error('Error sending email: ', error);  // Log any errors if the email couldn't be sent
  }
};