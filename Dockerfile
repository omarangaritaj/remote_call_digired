# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --upgrade pip

# Create data directory
RUN mkdir -p /app/data

# Copy requirements files
COPY requirements*.txt ./

# Install base requirements first
RUN pip install --no-cache-dir -r requirements.txt

# Install GPIO support if needed
ARG INSTALL_GPIO=true
RUN if [ "$INSTALL_GPIO" = "true" ] ; then \
        echo "Installing GPIO support..." && \
        pip install --no-cache-dir RPi.GPIO==0.7.1 ; \
    fi

# Verify critical packages
RUN python -c "import uvicorn, fastapi; print('✅ Critical packages verified')"

# Copy application code
COPY . .


# Expose port
EXPOSE 3000

# Set environment variables
ENV PYTHONPATH=/app
ENV PORT=3000

# Run the application
CMD ["python", "main.py"]
