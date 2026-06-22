FROM python:3.12-slim

# Install system dependencies for PostgreSQL, OpenCV, etc.
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

# Start gunicorn server
CMD ["gunicorn", "api.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
