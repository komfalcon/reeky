import os
import shutil

class StorageManager:
    """
    Abstract Storage Manager for handling ephemeral local storage
    and cloud storage (S3 / Cloudflare R2) stubs.
    """
    def __init__(self, use_cloud: bool = False):
        self.use_cloud = use_cloud
        self.local_dir = "/app/data/assets"
        os.makedirs(self.local_dir, exist_ok=True)

    def save_file(self, file_bytes: bytes, filename: str) -> str:
        """
        Saves a file to local disk or cloud storage.
        """
        if self.use_cloud:
            return self._save_to_s3(file_bytes, filename)
        else:
            return self._save_to_local(file_bytes, filename)

    def _save_to_local(self, file_bytes: bytes, filename: str) -> str:
        file_path = os.path.join(self.local_dir, filename)
        with open(file_path, "wb") as f:
            f.write(file_bytes)
        return file_path

    def _save_to_s3(self, file_bytes: bytes, filename: str) -> str:
        """
        STUB: Implement boto3 logic here for AWS S3 or Cloudflare R2.
        """
        print(f"Uploading {filename} to S3/R2...")
        # s3_client.put_object(Bucket=BUCKET_NAME, Key=filename, Body=file_bytes)
        return f"https://my-bucket.s3.amazonaws.com/{filename}"
