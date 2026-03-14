FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create data directory for SQLite
RUN mkdir -p /data

# Expose port
EXPOSE 8080

# Run with gunicorn
CMD ["gunicorn", "server:app", "--bind", "0.0.0.0:8080", "--workers", "2", "--timeout", "120"]
