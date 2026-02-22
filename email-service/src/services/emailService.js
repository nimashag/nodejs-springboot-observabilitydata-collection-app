import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendIncidentEmail({ subject, text, html }) {
  const info = await transporter.sendMail({
    from: `"Incident Bot" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_TO,
    replyTo: process.env.EMAIL_USER,
    subject,
    text,
    html,
  });

  console.log("✅ Email sent:", info.messageId);
}
