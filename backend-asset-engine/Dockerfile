FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app

# Install system dependencies for pydub/ffmpeg
RUN apt-get update && apt-get install -y ffmpeg python3-pip python3-venv

# Set up virtual environment
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt


# Installs chromium browser binaries without triggering missing apt packages
RUN playwright install chromium

COPY . .

RUN chmod +x start.sh

# Expose FastAPI port
EXPOSE 8000

CMD ["./start.sh"]
