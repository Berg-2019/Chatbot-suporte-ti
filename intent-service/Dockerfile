# Intent Classification Service

FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy Portuguese model
RUN python -m spacy download pt_core_news_sm

# Copy app files
COPY . .

# Expose port
EXPOSE 5000

# Run the service
CMD ["python", "app.py"]
