# Supabase Setup

1. Create a Supabase project.
2. Go to Project Settings → Storage and create a bucket.
3. Create an S3-compatible access key pair for storage.
4. Add these to backend-asset-engine/.env:


Note: The Python engine will auto-upload processed videos/audio to Supabase when S3 is enabled.
