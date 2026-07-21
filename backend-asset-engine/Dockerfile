FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app

# Keep system Playwright browsers in sync with requirements.txt (playwright==1.44.0)
RUN apt-get update && apt-get install -y ffmpeg python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/*

ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Browsers already present in base image matching 1.44.0
RUN playwright install-deps chromium || true

COPY . .
RUN chmod +x start.sh

EXPOSE 8000
CMD ["./start.sh"]
