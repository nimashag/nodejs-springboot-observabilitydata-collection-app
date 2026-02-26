# Email Service Setup Guide

## Overview

The email service sends incident alert emails when anomalies are detected by the anomaly-detection-agent.

## Configuration

### 1. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

### 2. Configure Gmail Credentials

**Option A: Use Gmail (Recommended for Testing)**

1. **Get a Gmail account** (or use existing one)

2. **Enable 2-Step Verification:**
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification if not already enabled

3. **Generate App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password

4. **Update .env file:**
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=abcd efgh ijkl mnop    # The 16-char app password
   EMAIL_TO=recipient@example.com
   PORT=4000
   ```

**Option B: Use Other SMTP Server**

Edit `src/services/emailService.js` to use custom SMTP:

```javascript
const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
```

## Running the Service

```bash
# Install dependencies (if not already done)
npm install

# Start the service
npm start
```

The service will run on port 4000 by default.

## Testing

Send a test email:

```bash
curl -X POST http://localhost:4000/v1/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test Email",
    "text": "This is a test",
    "html": "<h1>This is a test</h1>"
  }'
```

## Troubleshooting

### Error: "Missing credentials for PLAIN"

**Cause:** Missing or invalid EMAIL_USER and EMAIL_PASS in .env file

**Solution:**

1. Ensure .env file exists in email-service directory
2. Verify EMAIL_USER and EMAIL_PASS are set correctly
3. For Gmail, ensure you're using an App Password, not your regular password

### Error: "Invalid login: 535-5.7.8 Username and Password not accepted"

**Cause:** Invalid credentials or 2-Step Verification not enabled

**Solution:**

1. Enable 2-Step Verification on your Google account
2. Generate a new App Password
3. Update .env with the new App Password

### Want to disable email alerts?

If you don't want to set up email, you can run the anomaly detection agent without email:

```bash
cd ../anomaly-detection-agent
npm run start:no-email
```

Or set environment variable:

```bash
# PowerShell
$env:ANOMALY_SEND_EMAIL="0"
npm start

# Bash/CMD
set ANOMALY_SEND_EMAIL=0
npm start
```

## API Endpoints

### POST /v1/email/send

Send an email

**Request Body:**

```json
{
  "subject": "Email subject",
  "text": "Plain text content",
  "html": "<h1>HTML content</h1>"
}
```

**Response:**

```json
{
  "success": true,
  "messageId": "<message-id@gmail.com>"
}
```

## Security Notes

- Never commit .env file to version control
- Use App Passwords, not your main Gmail password
- Consider using a dedicated email account for alerts
- Rotate passwords periodically

## Environment Variables Reference

| Variable   | Required | Description                   | Example            |
| ---------- | -------- | ----------------------------- | ------------------ |
| EMAIL_USER | Yes      | Sender email address          | alerts@example.com |
| EMAIL_PASS | Yes      | SMTP password or App Password | abcdefghijklmnop   |
| EMAIL_TO   | Yes      | Recipient email address       | admin@example.com  |
| PORT       | No       | Service port (default: 4000)  | 4000               |
