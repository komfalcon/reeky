# REEKY ACADEMIC HUB — Deploy Guide

## Prerequisites
- Render account with a Postgres/MySQL database and a Redis instance.
- Vercel account for frontend deployments.
- Supabase project for Storage + DB.
- Python engine service on Render (Docker or native).

## Services

| Service | Platform | Path | Notes |
|---------|----------|------|-------|
| Core API | Vercel | `core-api/` | Node 18+, vercel.json included. |
| Backend Asset Engine | Render | `backend-asset-engine/` | Dockerfile included. |
| Admin Frontend | Vercel | `frontend-admin/` | Vite build. |
| Student Frontend | Vercel | `frontend-student/` | Vite build + PWA. |

## Environment Variables

### Core API (Vercel)
- `PORT=5000`
- `JWT_SECRET` — 32+ chars
- `DATABASE_URL` — mysql://...
- `PYTHON_ENGINE_URL` — https://reeky-backend-engine.onrender.com
- `ADMIN_API_KEY` — shared secret for admin/webhook routes

### Python Engine (Render)
- `ADMIN_API_KEY` — same as core-api
- `CORS_ORIGINS` — comma-separated allowed origins
- `CELERY_BROKER_URL` — redis://...
- `CELERY_RESULT_BACKEND` — redis://...

### Frontends (Vercel)
- `VITE_API_URL` — https://reeky-core-api.vercel.app

## Steps

1. Push repo to GitHub.
2. Create Render services for Python engine using `backend-asset-engine/Dockerfile`.
3. Create Vercel projects for `core-api`, `frontend-admin`, `frontend-student`.
4. Set env vars in Render and Vercel.
5. Run DB migration: `node core-api/migrations/run.js` against your DB.
6. Verify `/api/health` on core-api and `/health` on Python engine.
7. Test admin notebook scrape flow in `frontend-admin`.

## Rollback
- Vercel: rollback to previous deployment from dashboard.
- Render: rollback worker/service from dashboard.