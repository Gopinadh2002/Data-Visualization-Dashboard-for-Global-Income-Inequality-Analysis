// Import all required packages
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const axios = require('axios');

// Load environment variables from .env file
require('dotenv').config();

// Initialize the Express app
const app = express();
const PORT = 3000;

// --- DATABASE CONNECTION ---
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root', // Your MySQL password
    database: process.env.DB_NAME || 'powerbi_portal_db'
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL Database! 🐘');
});

// --- MIDDLEWARE ---
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'a-very-strong-and-long-secret-key-for-sessions',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if you are using HTTPS
}));

// Middleware to protect routes
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.status(401).json({ message: 'Unauthorized. Please log in.' });
};

// --- API ROUTES ---

// 1. User Signup
app.post('/api/signup', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
        db.query(query, [username, hashedPassword], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Username already exists.' });
                return res.status(500).json({ message: 'Database error.', error: err });
            }
            res.status(201).json({ message: 'User created successfully! Please log in.' });
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error.', error });
    }
});

// 2. User Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], async (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ message: 'Invalid username or password.' });
        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            req.session.userId = user.id;
            req.session.username = user.username;
            res.json({ message: 'Login successful!', username: user.username });
        } else {
            res.status(401).json({ message: 'Invalid username or password.' });
        }
    });
});

// 3. Get current user session info
app.get('/api/user', (req, res) => {
    if (req.session.userId) {
        res.json({ loggedIn: true, username: req.session.username });
    } else {
        res.json({ loggedIn: false });
    }
});

// 4. Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ message: 'Could not log out.' });
        res.clearCookie('connect.sid');
        res.json({ message: 'Logout successful.' });
    });
});

// 5. Submit Feedback (Protected Route)
app.post('/api/feedback', isAuthenticated, (req, res) => {
    const { feedbackType, subject, details } = req.body;
    const userId = req.session.userId;
    const query = 'INSERT INTO feedback (user_id, feedback_type, subject, details) VALUES (?, ?, ?, ?)';
    db.query(query, [userId, feedbackType, subject, details], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error submitting feedback.' });
        res.status(201).json({ message: 'Feedback submitted successfully! Thank you.' });
    });
});

// 6. Handle Chat Messages (Protected Route)
app.post('/api/chat', isAuthenticated, async (req, res) => {
    const { message } = req.body;
    const apiKey = process.env.CHATBOT_API_KEY;
    if (!apiKey) return res.status(500).json({ reply: "API key is not configured on the server." });
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions', // ⚠️ Adapt this API endpoint
            { model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: message }] },
            { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
        );
        const botReply = response.data.choices[0].message.content;
        res.json({ reply: botReply });
    } catch (error) {
        console.error('Error calling chatbot API:', error.response ? error.response.data : error.message);
        res.status(500).json({ reply: "Sorry, I'm having trouble connecting right now." });
    }
});

// 7. Get Power BI Dashboard URL (Protected Route)
app.get('/api/dashboard-url', isAuthenticated, (req, res) => {
    const embedUrl = process.env.POWER_BI_EMBED_URL;
    if (embedUrl) {
        res.json({ url: embedUrl });
    } else {
        res.status(500).json({ message: 'Dashboard URL is not configured on the server.' });
    }
});

// --- SERVE THE FRONT-END ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`🚀 Server is live and running on http://localhost:${PORT}`);
});