# Use official Apify Python image (no browser; we only call other Actors).
FROM apify/actor-python:3.11

# Copy requirements first for better layer caching.
COPY requirements.txt ./

# Install dependencies.
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code.
COPY . ./

# Run the Actor.
CMD ["python", "src/main.py"]
