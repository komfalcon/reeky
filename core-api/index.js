import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import axios from 'axios';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// =======================
// VALIDATION: Startup checks
// =======================

const REQUIRED_ENV_VARS = [
  { key: 'DATABASE_URL', name: 'Database URL' },
  { key: 'JWT_SECRET', name: 'JWT Secret' },
];

for (const { key, name } of REQUIRED_ENV_VARS) {
  if (!process.env[key]) {
    console.error(`FATAL: ${name} (${key}) is not set.`);
    process.exit(1);
  }
}

if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters long for security.');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

// =======================
// VALIDATION: Schemas
// =======================

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const generateAssetsSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  originalFileUrl: z.string().url('Must be a valid URL').max(2000),
  customInstructions: z.string().max(2000).optional().nullable(),
  assetsRequested: z.array(z.string()).optional(),
});

const submitAssetsSchema = z.object({
  assetId: z.string().min(1, 'assetId is required'),
  artifact_urls: z.array(z.string()).optional().default([]),
  podcast_audio: z.string().max(2000).optional().nullable(),
  video_overview: z.string().max(2000).optional().nullable(),
  infographic: z.string().max(2000).optional().nullable(),
  slide_deck: z.string().max(2000).optional().nullable(),
  study_report: z.string().max(2000).optional().nullable(),
  data_table: z.string().max(2000).optional().nullable(),
  notebook_session_url: z.string().max(2000).optional().nullable(),
});

const preferencesSchema = z.object({
  explanationDepth: z.enum(['simple', 'executive', 'detailed']).optional().nullable(),
  learningStyle: z.enum(['visual', 'auditory', 'textual']).optional().nullable(),
  tone: z.enum(['academic', 'conversational', 'elif5']).optional().nullable(),
  examPacing: z.enum(['fast', 'deep-dive']).optional().nullable(),
});

// =======================
// RATE LIMITING
// =======================

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

const assetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 generation requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Asset generation limit reached. Please wait and try again.' },
});

app.use('/api', globalLimiter);

// =======================
// DATABASE POOL
// =======================

const dbUrl = process.env.DATABASE_URL;
const pool = mysql.createPool({
  uri: dbUrl,
  ssl: dbUrl && !dbUrl.includes('localhost')
    ? { rejectUnauthorized: true }
    : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

const PYTHON_ENGINE_URL = process.env.PYTHON_ENGINE_URL || '';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';

// =======================
// UTILITY FUNCTIONS
// =======================

function parseJsonField(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'string') {
      try {
        return JSON.parse(parsed);
      } catch {
        return parsed;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

function parseJsonArray(value) {
  const parsed = parseJsonField(value);
  return Array.isArray(parsed) ? parsed : [];
}

function mergeAssetPayload(existing, incoming) {
  const base = parseJsonField(existing) || {};
  const next = incoming && typeof incoming === 'object' ? incoming : {};
  const { _celeryTaskId, ...cleanNext } = next;
  return {
    ...base,
    ...cleanNext,
    ...(_celeryTaskId ? { _celeryTaskId } : {}),
  };
}

// Asset bundle status constants
const STATUS = Object.freeze({
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
});

// =======================
// SCHEMA MIGRATION
// =======================

async function ensureSchema() {
  const migrations = [
    `ALTER TABLE \`User\` ADD COLUMN IF NOT EXISTS \`preferences\` JSON NULL`,
    `ALTER TABLE \`AssetBundle\` MODIFY COLUMN \`originalFileUrl\` TEXT NOT NULL`,
    `ALTER TABLE \`AssetBundle\` ADD COLUMN IF NOT EXISTS \`customInstructions\` TEXT NULL`,
    `ALTER TABLE \`AssetBundle\` ADD COLUMN IF NOT EXISTS \`assetsRequested\` JSON NULL`,
    // Phase 1: One-notebook-per-student + content dedup
    `ALTER TABLE \`User\` ADD COLUMN IF NOT EXISTS \`notebooklm_url\` TEXT NULL AFTER \`password\`,
                                     ADD COLUMN IF NOT EXISTS \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
    `ALTER TABLE \`AssetBundle\` ADD COLUMN IF NOT EXISTS \`notebook_source_url\` TEXT NULL AFTER \`originalFileUrl\`,
                                     ADD COLUMN IF NOT EXISTS \`content_hash\` VARCHAR(64) NULL AFTER \`notebook_source_url\`,
                                     ADD INDEX IF NOT EXISTS idx_notebook_source (notebook_source_url(255)),
                                     ADD INDEX IF NOT EXISTS idx_content_hash (content_hash),
                                     ADD INDEX IF NOT EXISTS idx_user_id (user_id)`,
    // Phase 3: Version trackin
    `ALTER TABLE \`AssetBundle\` ADD COLUMN IF NOT EXISTS \`version\` INT NOT NULL DEFAULT 1,
                                     ADD COLUMN IF NOT EXISTS \`parent_id\` CHAR(36) NULL,
                                     ADD INDEX IF NOT EXISTS idx_parent_id (parent_id)`,
  ];

  for (const sql of migrations) {
    try {
      await pool.execute(sql);
    } catch (_) {
      // Column/index likely already exists — safe to ignore
    }
  }

  try {
    const [tables] = await pool.execute("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = (SELECT DATABASE())");
    const tableNames = tables.map(t => t.TABLE_NAME);
    if (!tableNames.includes('User') || !tableNames.includes('AssetBundle')) {
      console.error('Required tables (User, AssetBundle) are missing. Run setup_db.js first.');
    }
  } catch (err) {
    console.error('Failed to verify schema:', err.message);
  }
}

ensureSchema().catch((err) => console.error('Schema ensure failed:', err.message));

// =======================
// AUTHENTICATION MIDDLEWARE
// =======================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
      }
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const authenticateAdmin = (req, res, next) => {
  if (!ADMIN_API_KEY) {
    console.warn('ADMIN_API_KEY is not set — admin routes are open');
    return next();
  }
  const key = req.headers['x-admin-key'];
  if (!key) {
    return res.status(401).json({ error: 'Admin API key is required (x-admin-key header)' });
  }
  if (key !== ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized admin access' });
  }
  next();
};

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  req.validatedBody = result.data;
  next();
};

// =======================
// HEALTH CHECK
// =======================

app.get('/api/health', async (req, res) => {
  const checks = {
    database: false,
    pythonEngine: false,
  };
  const errors = {};

  try {
    await pool.execute('SELECT 1');
    checks.database = true;
  } catch (error) {
    errors.database = error.message;
  }

  if (PYTHON_ENGINE_URL) {
    try {
      const response = await fetch(`${PYTHON_ENGINE_URL}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      checks.pythonEngine = response.ok;
    } catch (error) {
      errors.pythonEngine = error.message;
    }
  } else {
    checks.pythonEngine = null; // Not configured
  }

  const allHealthy = Object.values(checks).every((v) => v === true || v === null);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
    ...(Object.keys(errors).length > 0 && { errors }),
  });
});

// =======================
// AUTHENTICATION ROUTES
// =======================

app.post('/api/auth/signup', authLimiter, validate(signupSchema), async (req, res) => {
  try {
    const { name, email, password } = req.validatedBody;

    const [existing] = await pool.execute('SELECT id FROM `User` WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const id = crypto.randomUUID();

    await pool.execute(
      'INSERT INTO `User` (id, name, email, password) VALUES (?, ?, ?, ?)',
      [id, name, email, hashedPassword]
    );

    const token = jwt.sign({ userId: id, email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id, name, email } });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

app.post('/api/auth/login', authLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.validatedBody;

    const [users] = await pool.execute('SELECT * FROM `User` WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        preferences: parseJsonField(user.preferences),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to authenticate. Please try again.' });
  }
});

app.post('/api/auth/google', authLimiter, async (req, res) => {
  try {
    const { idToken, accessToken, email, name } = req.body;
    let googleEmail, googleName;

    if (idToken) {
      const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
      if (!googleRes.ok) {
        return res.status(401).json({ error: 'Invalid Google token' });
      }
      const payload = await googleRes.json();
      googleEmail = (payload.email || email || '').toLowerCase();
      googleName = payload.name || name || 'Student';
    } else if (accessToken) {
      const googleUserRes = await axios.get(
        `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`
      );
      googleEmail = (googleUserRes.data.email || email || '').toLowerCase();
      googleName = googleUserRes.data.name || name || 'Student';
    } else {
      return res.status(400).json({ error: 'Either idToken or accessToken is required' });
    }

    if (!googleEmail) {
      return res.status(400).json({ error: 'Failed to retrieve email from Google' });
    }

    // Check if user exists
    const [users] = await pool.execute('SELECT * FROM `User` WHERE email = ?', [googleEmail]);
    let user;

    const parseJsonField = (field) => {
      if (!field) return null;
      if (typeof field === 'object') return field;
      try {
        return JSON.parse(field);
      } catch {
        return null;
      }
    };

    if (users.length === 0) {
      // Create a new user
      const id = crypto.randomUUID();
      const dummyPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(dummyPassword, 12);

      await pool.execute(
        'INSERT INTO `User` (id, name, email, password) VALUES (?, ?, ?, ?)',
        [id, googleName, googleEmail, hashedPassword]
      );
      user = { id, name: googleName, email: googleEmail };
    } else {
      const dbUser = users[0];
      user = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        preferences: parseJsonField(dbUser.preferences),
      };
    }

    // Sign JWT
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// =======================
// USER PROFILE / PREFS
// =======================

app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, email, preferences, createdAt FROM `User` WHERE id = ?',
      [req.user.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const u = rows[0];
    res.json({
      id: u.id,
      name: u.name,
      email: u.email,
      preferences: parseJsonField(u.preferences),
      createdAt: u.createdAt,
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.post('/api/user/preferences', authenticateToken, validate(preferencesSchema), async (req, res) => {
  try {
    const preferences = req.validatedBody;
    await pool.execute(
      'UPDATE `User` SET preferences = ? WHERE id = ?',
      [JSON.stringify(preferences), req.user.userId]
    );
    res.json({ success: true, preferences });
  } catch (error) {
    console.error('Preferences save error:', error);
    res.status(500).json({ error: 'Failed to save preferences' });
  }
});

// =======================
// VIDEO PROCESSING  (NotebookLM video URL → trimmed S3 URL)
// =======================

app.post('/api/video/process', authenticateToken, async (req, res) => {
  try {
    const { videoUrl, assetId } = req.validatedBody || req.body;

    if (!videoUrl || !assetId) {
      return res.status(400).json({ error: 'videoUrl and assetId are required' });
    }

    // Forward to Python engine for processing
    const engineHeaders = { 'Content-Type': 'application/json' };
    if (ADMIN_API_KEY) engineHeaders['x-admin-key'] = ADMIN_API_KEY;

    const engineRes = await axios.post(
      `${PYTHON_ENGINE_URL}/video/process`,
      { video_url: videoUrl, asset_id: assetId },
      { headers: engineHeaders, timeout: 600000 } // 10 min timeout for video processing
    );

    res.json(engineRes.data);
  } catch (error) {
    console.error('Video processing error:', error);
    res.status(500).json({ error: 'Video processing failed', details: error.message });
  }
});

// =======================
// ASSET GENERATION ROUTES
// =======================

app.post('/api/assets/generate', authenticateToken, assetLimiter, validate(generateAssetsSchema), async (req, res) => {
  try {
    const { title, originalFileUrl, customInstructions, assetsRequested } = req.validatedBody;
    const id = crypto.randomUUID();

    await pool.execute(
      `INSERT INTO \`AssetBundle\`
        (id, title, originalFileUrl, status, userId, customInstructions, assetsRequested)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        title,
        originalFileUrl,
        STATUS.PENDING,
        req.user.userId,
        customInstructions || null,
        assetsRequested ? JSON.stringify(assetsRequested) : null,
      ]
    );

    res.status(201).json({ message: 'Asset generation queued successfully', id });
  } catch (error) {
    console.error('Asset generation error:', error);
    try {
      const { title, originalFileUrl } = req.body;
      const id = crypto.randomUUID();
      await pool.execute(
        'INSERT INTO `AssetBundle` (id, title, originalFileUrl, status, userId) VALUES (?, ?, ?, ?, ?)',
        [id, title, originalFileUrl, STATUS.PENDING, req.user.userId]
      );
      return res.status(201).json({ message: 'Asset generation queued successfully', id });
    } catch (fallbackErr) {
      console.error('Fallback error:', fallbackErr);
      res.status(500).json({ error: 'Failed to queue generation' });
    }
  }
});

app.get('/api/assets', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [[{ total }], [assets]] = await Promise.all([
      pool.execute('SELECT COUNT(*) as total FROM `AssetBundle` WHERE userId = ?', [req.user.userId]),
      pool.query(
        'SELECT * FROM `AssetBundle` WHERE userId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?',
        [req.user.userId, limit, offset]
      ),
    ]);

    res.json({
      assets: assets.map((row) => ({
        ...row,
        assets: parseJsonField(row.assets),
        assetsRequested: parseJsonArray(row.assetsRequested),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Assets fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch assets', assets: [] });
  }
});

// =======================
// ADMIN ROUTES
// =======================

app.post('/api/admin/scrape-notebooklm', authenticateAdmin, async (req, res) => {
  try {
    const { notebook_url } = req.body;
    if (!notebook_url || !/^https?:\/\/.+/i.test(notebook_url)) {
      return res.status(400).json({ error: 'notebook_url is required and must be a valid URL' });
    }

    const engineHeaders = { 'Content-Type': 'application/json' };
    if (ADMIN_API_KEY) engineHeaders['x-admin-key'] = ADMIN_API_KEY;

    const engineRes = await fetch(`${PYTHON_ENGINE_URL}/scrape-notebooklm`, {
      method: 'POST',
      headers: engineHeaders,
      body: JSON.stringify({ notebook_url }),
      signal: AbortSignal.timeout(120000),
    });

    const data = await engineRes.json();
    if (!engineRes.ok) {
      return res.status(engineRes.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Proxy scrape-notebooklm error:', error);
    res.status(500).json({ error: 'Failed to reach asset engine for notebook scraping' });
  }
});

app.get('/api/admin/queue', authenticateAdmin, async (req, res) => {
  try {
    const [queue] = await pool.execute(
      `SELECT
          ab.*,
          u.name AS studentName,
          u.email AS studentEmail,
          u.preferences AS studentPreferences
       FROM \`AssetBundle\` ab
       LEFT JOIN \`User\` u ON u.id = ab.userId
       WHERE ab.status = ? OR ab.status = ?
       ORDER BY ab.createdAt ASC`,
      [STATUS.PENDING, STATUS.PROCESSING]
    );
    res.json({
      queue: queue.map((row) => ({
        ...row,
        assets: parseJsonField(row.assets),
        studentPreferences: parseJsonField(row.studentPreferences),
        assetsRequested: parseJsonArray(row.assetsRequested),
      })),
    });
  } catch (error) {
    console.error('Admin queue fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

app.get('/api/admin/queue/completed', authenticateAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [[{ total }], [queue]] = await Promise.all([
      pool.execute("SELECT COUNT(*) as total FROM `AssetBundle` WHERE status = ?", [STATUS.COMPLETED]),
      pool.query(
        `SELECT
            ab.*,
            u.name AS studentName,
            u.email AS studentEmail,
            u.preferences AS studentPreferences
         FROM \`AssetBundle\` ab
         LEFT JOIN \`User\` u ON u.id = ab.userId
         WHERE ab.status = ?
         ORDER BY ab.createdAt DESC
         LIMIT ? OFFSET ?`,
        [STATUS.COMPLETED, limit, offset]
      ),
    ]);

    res.json({
      queue: queue.map((row) => ({
        ...row,
        assets: parseJsonField(row.assets),
        studentPreferences: parseJsonField(row.studentPreferences),
        assetsRequested: parseJsonArray(row.assetsRequested),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Admin completed queue fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch completed queue' });
  }
});

app.post('/api/admin/submit-assets', authenticateAdmin, validate(submitAssetsSchema), async (req, res) => {
  try {
    const {
      assetId,
      artifact_urls,
      podcast_audio,
      video_overview,
      infographic,
      slide_deck,
      study_report,
      data_table,
      notebook_session_url,
    } = req.validatedBody;

    const staticAssets = {
      podcast_audio: podcast_audio || null,
      video_overview: video_overview || null,
      infographic: infographic || null,
      slide_deck: slide_deck || null,
      study_report: study_report || null,
      data_table: data_table || null,
    };

    let cleanUrls = (artifact_urls || []).filter(
      (url) => typeof url === 'string' && url.trim().startsWith('http')
    );

    // Auto-scrape artifacts from a single NotebookLM session URL if provided
    if (notebook_session_url && String(notebook_session_url).trim()) {
      try {
        const engineHeaders = { 'Content-Type': 'application/json' };
        if (ADMIN_API_KEY) engineHeaders['x-admin-key'] = ADMIN_API_KEY;

        const scrapeRes = await fetch(`${PYTHON_ENGINE_URL}/scrape-notebooklm`, {
          method: 'POST',
          headers: engineHeaders,
          body: JSON.stringify({ notebook_url: notebook_session_url.trim() }),
          signal: AbortSignal.timeout(120000),
        });

        if (scrapeRes.ok) {
          const scrapeData = await scrapeRes.json();
          const artifacts = scrapeData?.artifacts || {};
          const scrapedUrls = [
            artifacts.flashcards_url,
            artifacts.quizzes_url,
            artifacts.mindmap_url,
            artifacts.audio_url,
            artifacts.video_url,
          ].filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u));

          const existing = new Set(cleanUrls.map((u) => u.trim()));
          for (const u of scrapedUrls) {
            const trimmed = u.trim();
            if (!existing.has(trimmed)) {
              cleanUrls.push(trimmed);
            }
          }

          if (artifacts.video_url && !staticAssets.video_overview) {
            staticAssets.video_overview = artifacts.video_url;
          }
          if (artifacts.audio_url && !staticAssets.podcast_audio) {
            staticAssets.podcast_audio = artifacts.audio_url;
          }

          console.info(`NotebookLM scrape complete: ${scrapedUrls.length} artifact URLs found`);
        } else {
          console.warn('NotebookLM auto-scrape failed:', await scrapeRes.text().catch(() => ''));
        }
      } catch (err) {
        console.error('NotebookLM auto-scrape error:', err);
      }
    }

    if (cleanUrls.length === 0 && !staticAssets.video_overview) {
      await pool.execute(
        'UPDATE `AssetBundle` SET status = ?, assets = ? WHERE id = ?',
        [STATUS.COMPLETED, JSON.stringify(staticAssets), assetId]
      );
      return res.json({
        success: true,
        completedDirectly: true,
        message: 'Asset bundle completed directly',
      });
    }

    await pool.execute(
      'UPDATE `AssetBundle` SET status = ?, assets = ? WHERE id = ?',
      [STATUS.PROCESSING, JSON.stringify(staticAssets), assetId]
    );

    let taskId = null;

    // If video_overview is a NotebookLM artifact URL, trigger video processing
    if (video_overview && (video_overview.includes('notebooklm.google.com/notebook') || video_overview.includes('artifact'))) {
      try {
        const engineHeaders = { 'Content-Type': 'application/json' };
        if (ADMIN_API_KEY) engineHeaders['x-admin-key'] = ADMIN_API_KEY;

        const videoRes = await fetch(`${PYTHON_ENGINE_URL}/video/process`, {
          method: 'POST',
          headers: engineHeaders,
          body: JSON.stringify({ video_url: video_overview, asset_id: assetId }),
          signal: AbortSignal.timeout(600000),
        });

        if (videoRes.ok) {
          const videoData = await videoRes.json();
          taskId = videoData.task_id || null;
        } else {
          console.error('Video processing initiation failed:', videoRes.status);
        }
      } catch (err) {
        console.error('Failed to initiate video processing:', err);
      }
    }

    // Submit to scraper if there are NotebookLM URLs
    if (cleanUrls.length > 0) {
      try {
        const engineHeaders = { 'Content-Type': 'application/json' };
        if (ADMIN_API_KEY) engineHeaders['x-admin-key'] = ADMIN_API_KEY;

        const engineRes = await fetch(`${PYTHON_ENGINE_URL}/admin/submit-assets`, {
          method: 'POST',
          headers: engineHeaders,
          body: JSON.stringify({
            user_id: assetId,
            artifact_urls: cleanUrls,
            ...staticAssets,
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (engineRes.ok) {
          const engineData = await engineRes.json();
          if (!taskId) taskId = engineData.task_id || null;
        } else {
          const errText = await engineRes.text().catch(() => '');
          console.error('Python engine submit failed:', engineRes.status, errText);
          await pool.execute(
            'UPDATE `AssetBundle` SET status = ?, assets = ? WHERE id = ?',
            [STATUS.PENDING, JSON.stringify(staticAssets), assetId]
          );
          return res.status(502).json({
            error: `Asset engine rejected submit (${engineRes.status})`,
          });
        }
      } catch (err) {
        console.error('Failed to trigger python engine:', err);
        await pool.execute(
          'UPDATE `AssetBundle` SET status = ?, assets = ? WHERE id = ?',
          [STATUS.PENDING, JSON.stringify(staticAssets), assetId]
        );
        return res.status(502).json({ error: 'Failed to reach asset engine' });
      }
    }

    if (!taskId) {
      await pool.execute(
        'UPDATE `AssetBundle` SET status = ?, assets = ? WHERE id = ?',
        [STATUS.COMPLETED, JSON.stringify(staticAssets), assetId]
      );
      return res.json({
        success: true,
        completedDirectly: true,
        message: 'Asset bundle completed (no scraping needed)',
      });
    }

    res.json({
      success: true,
      completedDirectly: false,
      taskId,
      message: 'Sent to processing',
    });
  } catch (error) {
    console.error('Submit assets error:', error);
    res.status(500).json({ error: 'Failed to submit assets' });
  }
});

app.get('/api/admin/task-status/:id', authenticateAdmin, async (req, res) => {
  try {
    const taskId = req.params.id;
    const assetId = req.query.assetId || null;

    const statusHeaders = {};
    if (ADMIN_API_KEY) statusHeaders['x-admin-key'] = ADMIN_API_KEY;

    const response = await fetch(`${PYTHON_ENGINE_URL}/status/${taskId}`, {
      headers: statusHeaders,
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      throw new Error(`Python engine status returned ${response.status}`);
    }

    const data = await response.json();

    if (data.task_status === 'SUCCESS' && assetId) {
      const [rows] = await pool.execute(
        'SELECT assets, status FROM `AssetBundle` WHERE id = ?',
        [assetId]
      );
      if (rows.length > 0 && rows[0].status !== STATUS.COMPLETED) {
        const existing = parseJsonField(rows[0].assets) || {};
        const interactive = data.interactive_assets || {};
        const downloadable = data.downloadable_files || {};
        const merged = {
          ...existing,
          flashcards: interactive.flashcards || existing.flashcards || [],
          quizzes: interactive.quizzes || existing.quizzes || [],
          mindmap: interactive.mindmap ?? existing.mindmap ?? null,
          podcast_audio: downloadable.podcast_audio || existing.podcast_audio || null,
          video_overview: downloadable.video_overview || existing.video_overview || null,
          infographic: downloadable.infographic || existing.infographic || null,
          slide_deck: downloadable.slide_deck || existing.slide_deck || null,
          study_report: downloadable.study_report || existing.study_report || null,
          data_table: downloadable.data_table || existing.data_table || null,
        };
        delete merged._celeryTaskId;

        await pool.execute(
          'UPDATE `AssetBundle` SET status = ?, assets = ? WHERE id = ?',
          [STATUS.COMPLETED, JSON.stringify(merged), assetId]
        );
        data.autoCompleted = true;
      }
    }

    res.json(data);
  } catch (error) {
    console.error('Error proxying task status:', error);
    res.status(500).json({ error: 'Failed to fetch task status from engine' });
  }
});

app.post('/api/assets/webhook/complete', authenticateAdmin, async (req, res) => {
  try {
    const { assetId, assets } = req.body;
    if (!assetId) {
      return res.status(400).json({ error: 'assetId is required' });
    }

    const [rows] = await pool.execute(
      'SELECT assets FROM `AssetBundle` WHERE id = ?',
      [assetId]
    );
    const existing = rows[0]?.assets;
    const merged = mergeAssetPayload(existing, assets || {});
    delete merged._celeryTaskId;

    await pool.execute(
      'UPDATE `AssetBundle` SET status = ?, assets = ? WHERE id = ?',
      [STATUS.COMPLETED, JSON.stringify(merged), assetId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook failed' });
  }
});

// =======================
// GLOBAL ERROR HANDLER
// =======================

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred' });
});

// =======================
// SERVER START
// =======================

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Core API listening on port ${PORT}`);
  });
}

export default app;