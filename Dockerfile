# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements*.txt ./
COPY install.sh ./

# Make install script executable
RUN chmod +x install.sh

# Install Python dependencies
# Use INSTALL_GPIO=true to install GPIO support in Docker
ARG INSTALL_GPIO=true
ENV INSTALL_GPIO=${INSTALL_GPIO}
RUN ./install.sh

# Copy application code
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Set environment variables
ENV PYTHONPATH=/app
ENV PORT=3000

# Run the application
CMD ["python", "main.py"]
