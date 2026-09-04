// ============================================================
// VELOURA EMAIL API SERVER
// ============================================================

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.')); // Serve all static files

// File paths
const RESULT_DIR = path.join(__dirname, 'result');
const MAILS_FILE = path.join(RESULT_DIR, 'mails.txt');

// Ensure result directory and mails.txt exist
if (!fs.existsSync(RESULT_DIR)) {
    fs.mkdirSync(RESULT_DIR, { recursive: true });
}

if (!fs.existsSync(MAILS_FILE)) {
    fs.writeFileSync(MAILS_FILE, '');
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function readEmails() {
    try {
        const content = fs.readFileSync(MAILS_FILE, 'utf8');
        return content
            .split('\n')
            .map(line => line.trim())
            .filter(email => email.length > 0);
    } catch (error) {
        console.error('Error reading emails:', error);
        return [];
    }
}

function writeEmails(emails) {
    try {
        const content = emails.join('\n');
        fs.writeFileSync(MAILS_FILE, content);
        return true;
    } catch (error) {
        console.error('Error writing emails:', error);
        return false;
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================================
// API ENDPOINTS
// ============================================================

// GET /api/emails - Get all emails
app.get('/api/emails', (req, res) => {
    try {
        const emails = readEmails();
        res.json({
            success: true,
            emails: emails,
            count: emails.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error reading emails'
        });
    }
});

// POST /api/emails - Save a new email
app.post('/api/emails', (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        const emails = readEmails();
        const exists = emails.some(e => e.toLowerCase() === email.toLowerCase());

        if (exists) {
            return res.json({
                success: true,
                alreadySubscribed: true,
                message: 'Email already subscribed'
            });
        }

        emails.push(email);
        writeEmails(emails);

        res.json({
            success: true,
            alreadySubscribed: false,
            message: 'Email saved successfully!'
        });

    } catch (error) {
        console.error('Error saving email:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// DELETE /api/emails - Delete an email
app.delete('/api/emails', (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        let emails = readEmails();
        const filtered = emails.filter(e => e.toLowerCase() !== email.toLowerCase());

        if (filtered.length === emails.length) {
            return res.status(404).json({
                success: false,
                message: 'Email not found'
            });
        }

        writeEmails(filtered);

        res.json({
            success: true,
            message: 'Email deleted successfully!'
        });

    } catch (error) {
        console.error('Error deleting email:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📧 Emails stored in: ${MAILS_FILE}`);
    console.log(`📋 Admin panel: http://localhost:${PORT}/infos.html`);
});

module.exports = app;