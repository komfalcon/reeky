import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import crypto from 'crypto';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Set up MySQL connection pool
const dbUrl = process.env.DATABASE_URL;
const pool = mysql.createPool({
    uri: dbUrl,
    ssl: {
        rejectUnauthorized: true
    }
});

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT 1');
        res.json({ 
            status: "healthy", 
            database: "connected", 
            timestamp: new Date().toISOString() 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            status: "unhealthy", 
            database: "failed", 
            error: error.message 
        });
    }
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// =======================
// AUTHENTICATION ROUTES
// =======================

app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Check if user exists
        const [existing] = await pool.execute('SELECT * FROM `User` WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: "User already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        const id = crypto.randomUUID();

        // Create user
        await pool.execute(
            'INSERT INTO `User` (id, name, email, password) VALUES (?, ?, ?, ?)',
            [id, name, email, hashedPassword]
        );

        const token = jwt.sign({ userId: id, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id, name, email } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Something went wrong" });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const [users] = await pool.execute('SELECT * FROM `User` WHERE email = ?', [email]);
        if (users.length === 0) return res.status(400).json({ error: "User not found" });
        
        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: "Invalid password" });

        const token = jwt.sign({ userId: user.id, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Something went wrong" });
    }
});

// =======================
// ASSET GENERATION ROUTES
// =======================

app.post('/api/assets/generate', authenticateToken, async (req, res) => {
    try {
        const { title, originalFileUrl } = req.body;
        const id = crypto.randomUUID();

        await pool.execute(
            'INSERT INTO `AssetBundle` (id, title, originalFileUrl, status, userId) VALUES (?, ?, ?, ?, ?)',
            [id, title, originalFileUrl, 'PENDING', req.user.userId]
        );

        res.json({ message: "Asset generation queued successfully", id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to queue generation" });
    }
});

app.get('/api/assets', authenticateToken, async (req, res) => {
    try {
        const [assets] = await pool.execute(
            'SELECT * FROM `AssetBundle` WHERE userId = ? ORDER BY createdAt DESC',
            [req.user.userId]
        );
        res.json(assets);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch assets" });
    }
});

// =======================
// ADMIN ROUTES
// =======================

app.get('/api/admin/queue', async (req, res) => {
    try {
        const [queue] = await pool.execute(
            'SELECT * FROM `AssetBundle` WHERE status = ? OR status = ? ORDER BY createdAt ASC',
            ['PENDING', 'PROCESSING']
        );
        res.json({ queue });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch queue" });
    }
});

app.get('/api/admin/queue/completed', async (req, res) => {
    try {
        const [queue] = await pool.execute(
            'SELECT * FROM `AssetBundle` WHERE status = ? ORDER BY createdAt DESC',
            ['COMPLETED']
        );
        res.json({ queue });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch completed queue" });
    }
});

app.post('/api/admin/submit-assets', async (req, res) => {
    try {
        const { assetId, artifact_urls, podcast_audio, video_overview, infographic, slide_deck, study_report, data_table } = req.body;
        
        const staticAssets = { podcast_audio, video_overview, infographic, slide_deck, study_report, data_table };
        
        // If there are no NotebookLM URLs to scrape, complete the task immediately!
        if (!artifact_urls || artifact_urls.length === 0) {
            await pool.execute(
                'UPDATE `AssetBundle` SET status = ?, assets = ? WHERE id = ?',
                ['COMPLETED', JSON.stringify(staticAssets), assetId]
            );
            return res.json({ success: true, completedDirectly: true, message: "Asset bundle completed directly" });
        }
        
        // Otherwise, set to PROCESSING and trigger the Python Scraper
        await pool.execute(
            'UPDATE `AssetBundle` SET status = ?, assets = ? WHERE id = ?',
            ['PROCESSING', JSON.stringify(staticAssets), assetId]
        );

        const pythonEngineUrl = process.env.PYTHON_ENGINE_URL || 'https://reeky-backend-engine.onrender.com';
        fetch(`${pythonEngineUrl}/admin/submit-assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: assetId, // Fix: Use user_id to match Python FastAPI AdminSubmissionRequest schema!
                artifact_urls: artifact_urls,
                podcast_audio: podcast_audio,
                video_overview: video_overview,
                infographic: infographic,
                slide_deck: slide_deck,
                study_report: study_report,
                data_table: data_table
            })
        }).catch(err => console.error("Failed to trigger python engine:", err));
        
        res.json({ success: true, completedDirectly: false, message: "Sent to processing" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to submit assets" });
    }
});

app.get('/api/admin/task-status/:id', async (req, res) => {
    try {
        const taskId = req.params.id;
        const pythonEngineUrl = process.env.PYTHON_ENGINE_URL || 'https://reeky-backend-engine.onrender.com';
        
        const response = await fetch(`${pythonEngineUrl}/status/${taskId}`);
        if (!response.ok) {
            throw new Error(`Python engine status returned ${response.status}`);
        }
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Error proxying task status:", error);
        res.status(500).json({ error: "Failed to fetch task status from engine" });
    }
});

app.post('/api/assets/webhook/complete', async (req, res) => {
    try {
        const { assetId, assets } = req.body;
        
        await pool.execute(
            'UPDATE `AssetBundle` SET status = ?, assets = ? WHERE id = ?',
            ['COMPLETED', JSON.stringify(assets), assetId]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Webhook failed" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Core API listening on port ${PORT}`);
});
