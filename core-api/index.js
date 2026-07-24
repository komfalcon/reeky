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

function safeParseJson(val) {
    if (!val) return null;
    if (typeof val === 'object') return val;
    if (val === '[object Object]') return null;
    try {
        return JSON.parse(val);
    } catch (e) {
        console.error("JSON parse error:", e, "for value:", val);
        return null;
    }
}

// Set up MySQL connection pool
const dbUrl = process.env.DATABASE_URL;

// Parse out the URL and build a clean pool config for TiDB Serverless
// TiDB requires SSL but mysql2's URI parser doesn't handle 'sslAccept' param
const pool = mysql.createPool({
    uri: dbUrl.replace(/[?&]sslAccept=[^&]*/g, ''),
    ssl: {
        rejectUnauthorized: false  // TiDB Serverless uses a self-signed-style cert chain
    },
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
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
        res.json({ token, user: { id, name, email, preferences: null } });
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
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                preferences: safeParseJson(user.preferences)
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Something went wrong" });
    }
});

// User Preferences and Profile Routes
app.post('/api/user/preferences', authenticateToken, async (req, res) => {
    try {
        const { preferences } = req.body;
        await pool.execute(
            'UPDATE `User` SET preferences = ? WHERE id = ?',
            [JSON.stringify(preferences), req.user.userId]
        );
        res.json({ success: true, preferences });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to save preferences" });
    }
});

app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT id, name, email, preferences FROM `User` WHERE id = ?',
            [req.user.userId]
        );
        if (users.length === 0) return res.status(404).json({ error: "User not found" });
        const user = users[0];
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            preferences: safeParseJson(user.preferences)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});

// =======================
// ASSET GENERATION ROUTES
// =======================

app.post('/api/assets/generate', authenticateToken, async (req, res) => {
    try {
        const { title, originalFileUrl, customInstructions, assetsRequested } = req.body;
        const id = crypto.randomUUID();

        // Save requested assets formats as metadata inside assets JSON column initially
        const assetsJson = assetsRequested ? JSON.stringify({ requested: assetsRequested }) : null;

        const isNotebookLm = originalFileUrl && originalFileUrl.includes('notebooklm.google.com');
        const initialStatus = isNotebookLm ? 'PROCESSING' : 'PENDING';

        await pool.execute(
            'INSERT INTO `AssetBundle` (id, title, originalFileUrl, status, userId, customInstructions, assets) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, title, originalFileUrl, initialStatus, req.user.userId, customInstructions || null, assetsJson]
        );

        if (isNotebookLm) {
            const pythonEngineUrl = process.env.PYTHON_ENGINE_URL || 'https://reeky-backend-engine.onrender.com';
            fetch(`${pythonEngineUrl}/admin/submit-assets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: id,
                    artifact_urls: [originalFileUrl],
                    podcast_audio: null,
                    video_overview: null,
                    infographic: null,
                    slide_deck: null,
                    study_report: null,
                    data_table: null
                })
            }).catch(err => console.error("Failed to trigger python engine automatically:", err));
            res.json({ message: "NotebookLM link detected. Auto-scraping started.", id, status: 'PROCESSING' });
        } else {
            res.json({ message: "Asset generation queued successfully", id, status: 'PENDING' });
        }
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
            'SELECT ab.*, u.name as userName, u.email as userEmail, u.preferences as userPreferences FROM `AssetBundle` ab JOIN `User` u ON ab.userId = u.id WHERE ab.status = ? OR ab.status = ? ORDER BY ab.createdAt ASC',
            ['PENDING', 'PROCESSING']
        );
        
        // Parse JSON fields to objects
        const parsedQueue = queue.map(item => ({
            ...item,
            assets: safeParseJson(item.assets),
            userPreferences: safeParseJson(item.userPreferences)
        }));

        res.json({ queue: parsedQueue });
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

// Reset any stuck PROCESSING bundles back to PENDING
app.post('/api/admin/reset-stuck', async (req, res) => {
    try {
        const [result] = await pool.execute(
            "UPDATE AssetBundle SET status = 'PENDING' WHERE status = 'PROCESSING'"
        );
        res.json({ message: `Reset ${result.affectedRows} stuck bundle(s) to PENDING.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to reset stuck bundles' });
    }
});

app.post('/api/admin/submit-assets', async (req, res) => {
    try {
        const {
            assetId,
            artifact_urls,
            podcast_audio,
            video_overview,
            flashcards_url,
            quizzes_url,
            mindmap_url,
            slide_deck_url,
            study_report_url,
            data_table_url,
            infographic_url
        } = req.body;
        
        const staticAssets = {
            podcast_audio,
            video_overview,
            flashcards_url,
            quizzes_url,
            mindmap_url,
            slide_deck_url,
            study_report_url,
            data_table_url,
            infographic_url
        };
        
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

        // Sanitize all fields — Python Pydantic rejects null for list/str fields
        const pythonPayload = {
            user_id: assetId,
            artifact_urls: Array.isArray(artifact_urls) ? artifact_urls : [],
            podcast_audio: podcast_audio || null,
            video_overview: video_overview || null,
            flashcards_url: flashcards_url || null,
            quizzes_url: quizzes_url || null,
            mindmap_url: mindmap_url || null,
            slide_deck_url: slide_deck_url || null,
            study_report_url: study_report_url || null,
            data_table_url: data_table_url || null,
            infographic_url: infographic_url || null
        };

        console.log("[submit-assets] Sending to Python engine:", JSON.stringify(pythonPayload));

        fetch(`${pythonEngineUrl}/admin/submit-assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pythonPayload)
        }).catch(err => console.error("Failed to trigger python engine:", err));
        
        res.json({ success: true, completedDirectly: false, message: "Sent to processing" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to submit assets" });
    }
});

app.get('/api/admin/task-status/:id', async (req, res) => {
    try {
        const assetId = req.params.id;

        // Poll the DB directly — the Python engine fires a webhook when done
        // which updates status to COMPLETED. No need to proxy to Python.
        const [rows] = await pool.execute(
            'SELECT id, status, assets FROM `AssetBundle` WHERE id = ?',
            [assetId]
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'Bundle not found' });
        }

        const bundle = rows[0];
        res.json({
            task_id: assetId,
            task_status: bundle.status,   // PENDING | PROCESSING | COMPLETED | FAILED
            assets: bundle.assets ? (typeof bundle.assets === 'string' ? JSON.parse(bundle.assets) : bundle.assets) : null
        });
    } catch (error) {
        console.error("Error fetching task status:", error);
        res.status(500).json({ error: "Failed to fetch task status" });
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
