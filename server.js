const express    = require('express');
const nodemailer = require('nodemailer');
const cors       = require('cors');
const path       = require('path');

const app = express();
app.use(cors());
app.use(express.json());

function buildTransporter(cfg) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: parseInt(cfg.port, 10),
    secure: cfg.secure === true || cfg.secure === 'true',
    auth: { user: cfg.user, pass: cfg.pass },
    pool: true, maxConnections: 5, maxMessages: 100,
    connectionTimeout: 30000, socketTimeout: 60000,
    requireTLS: true, tls: { rejectUnauthorized: true },
  });
}

app.post('/api/verify', async (req, res) => {
  try {
    await buildTransporter(req.body).verify();
    res.json({ ok: true, message: 'SMTP connection verified' });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

app.post('/api/send', async (req, res) => {
  const { smtp, mail } = req.body;
  if (!smtp || !mail) return res.status(400).json({ ok: false, message: 'smtp and mail required.' });
  try {
    const domain = smtp.user.split('@')[1] || 'mail.local';
    const msgId  = '<' + Date.now() + '.' + Math.random().toString(36).slice(2) + '@' + domain + '>';
    const info = await buildTransporter(smtp).sendMail({
      from: '"' + (mail.fromName || smtp.user) + '" <' + smtp.user + '>',
      to: mail.to, cc: mail.cc || undefined, bcc: mail.bcc || undefined,
      subject: mail.subject, text: mail.text || undefined, html: mail.html || undefined,
      headers: { 'Message-ID': msgId, 'X-Mailer': 'NodeMailer-UI/1.0', 'MIME-Version': '1.0' },
    });
    res.json({ ok: true, messageId: info.messageId, accepted: info.accepted });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log('Mailer ready at http://localhost:' + PORT));
}

module.exports = app;