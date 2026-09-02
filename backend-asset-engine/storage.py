import os
import io
import logging
from typing import Optional

from paths import STATIC_DIR, ensure_data_dirs

logger = logging.getLogger(__name__)


class StorageManager:
    """Local asset storage with optional cloud (S3/R2) support."""

    def __init__(self, use_cloud: Optional[bool] = None):
        """
        Initialize storage manager.
        use_cloud: if None, checks AWS_ACCESS_KEY_ID / S3_ENABLED env var.
        """
        ensure_data_dirs()
        self.local_dir = STATIC_DIR

        # Auto-detect cloud availability
        if use_cloud is None:
            self.use_cloud = bool(
                os.getenv("S3_ENABLED", "").lower() in ("true", "1", "yes")
                and os.getenv("AWS_ACCESS_KEY_ID")
                and os.getenv("AWS_SECRET_ACCESS_KEY")
                and os.getenv("AWS_S3_BUCKET")
            )
        else:
            self.use_cloud = use_cloud

        # S3 configuration
        self.bucket = os.getenv("AWS_S3_BUCKET", "reeky-assets")
        self.region = os.getenv("AWS_REGION", "us-east-1")
        self.endpoint_url = os.getenv("AWS_ENDPOINT_URL")  # For R2/MinIO compatibility
        self.cloud_prefix = os.getenv("S3_PREFIX", "assets/")

        # Lazy-loaded S3 client
        self._s3_client = None

    def _get_s3_client(self):
        """Lazy initialize boto3 S3 client."""
        if self._s3_client is not None:
            return self._s3_client

        try:
            import boto3
            from botocore.config import Config

            session = boto3.Session(
                aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
                region_name=self.region,
            )

            client_kwargs = {
                "config": Config(
                    retries={"max_attempts": 3, "mode": "adaptive"},
                    connect_timeout=10,
                    read_timeout=30,
                )
            }
            if self.endpoint_url:
                client_kwargs["endpoint_url"] = self.endpoint_url

            self._s3_client = session.client("s3", **client_kwargs)
            logger.info("S3 client initialized (bucket=%s, region=%s)", self.bucket, self.region)
            return self._s3_client
        except ImportError:
            logger.warning("boto3 not installed. Falling back to local storage.")
            self.use_cloud = False
            return None
        except Exception as e:
            logger.error("Failed to initialize S3 client: %s. Falling back to local.", e)
            self.use_cloud = False
            return None

    def save_file(self, file_bytes: bytes, filename: str, content_type: str = "application/octet-stream") -> str:
        """
        Save a file to storage. Returns a URL/path to the saved file.

        Args:
            file_bytes: Raw file data
            filename: Name of the file (should be unique, e.g. UUID-prefixed)
            content_type: MIME type of the file

        Returns:
            str: URL or local file path to the saved file
        """
        if self.use_cloud:
            return self._save_to_cloud(file_bytes, filename, content_type)
        return self._save_to_local(file_bytes, filename)

    def _save_to_local(self, file_bytes: bytes, filename: str) -> str:
        """Save file to local disk and return the file path."""
        file_path = os.path.join(self.local_dir, filename)

        # Ensure subdirectories exist
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        with open(file_path, "wb") as f:
            f.write(file_bytes)

        logger.info("Saved file locally: %s (%d bytes)", file_path, len(file_bytes))
        return file_path

    def _save_to_cloud(self, file_bytes: bytes, filename: str, content_type: str) -> str:
        """
        Upload file to S3-compatible storage (AWS S3, Cloudflare R2, MinIO).
        Returns the public URL of the uploaded file.
        """
        s3 = self._get_s3_client()
        if not s3:
            logger.warning("S3 client unavailable, falling back to local storage.")
            return self._save_to_local(file_bytes, filename)

        key = f"{self.cloud_prefix}{filename}"

        try:
            extra_args = {
                "ContentType": content_type,
            }

            # Upload with stream for large files
            file_stream = io.BytesIO(file_bytes)
            s3.upload_fileobj(file_stream, self.bucket, key, ExtraArgs=extra_args)

            # Generate public URL
            if self.endpoint_url:
                # R2/MinIO compatible URL
                public_url = f"{self.endpoint_url}/{self.bucket}/{key}"
            else:
                # Standard AWS S3 URL
                public_url = f"https://{self.bucket}.s3.{self.region}.amazonaws.com/{key}"

            logger.info("Uploaded to S3: %s (%d bytes)", public_url, len(file_bytes))
            return public_url

        except Exception as e:
            logger.error("S3 upload failed for %s: %s. Falling back to local.", filename, e)
            return self._save_to_local(file_bytes, filename)

    def delete_file(self, filepath_or_url: str) -> bool:
        """Delete a file from storage."""
        if self.use_cloud and (filepath_or_url.startswith("http://") or filepath_or_url.startswith("https://")):
            return self._delete_from_cloud(filepath_or_url)
        return self._delete_from_local(filepath_or_url)

    def _delete_from_local(self, filepath: str) -> bool:
        """Delete a local file."""
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
                logger.info("Deleted local file: %s", filepath)
                return True
            return False
        except Exception as e:
            logger.error("Failed to delete local file %s: %s", filepath, e)
            return False

    def _delete_from_cloud(self, url: str) -> bool:
        """Delete a file from S3."""
        s3 = self._get_s3_client()
        if not s3:
            return False

        try:
            # Extract key from URL
            key = url.split(f"{self.bucket}/")[-1] if self.bucket in url else url
            # Remove leading cloud_prefix if present
            if key.startswith(self.cloud_prefix):
                pass  # Already has prefix
            else:
                key = f"{self.cloud_prefix}{key.split('/')[-1]}"

            s3.delete_object(Bucket=self.bucket, Key=key)
            logger.info("Deleted from S3: %s", key)
            return True
        except Exception as e:
            logger.error("S3 delete failed for %s: %s", url, e)
            return False

    def get_file_url(self, filename: str) -> str:
        """Get the URL for a stored file without actually saving."""
        if self.use_cloud:
            key = f"{self.cloud_prefix}{filename}"
            if self.endpoint_url:
                return f"{self.endpoint_url}/{self.bucket}/{key}"
            return f"https://{self.bucket}.s3.{self.region}.amazonaws.com/{key}"
        return os.path.join(self.local_dir, filename)