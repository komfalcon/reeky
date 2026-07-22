FROM python:3.12-slim

# Install system dependencies including FFmpeg and Chromium
RUN apt-get update && apt-get install -y \
    ffmpeg \
    chromium \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browser binaries only; OS deps already installed above
RUN playwright install chromium

COPY . .

EXPOSE 8000

CMD ["sh", "start.sh"]