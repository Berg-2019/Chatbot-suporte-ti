# Intent Classification Service

FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Download spaCy Portuguese model (using direct pip install for reliability)
RUN pip install --no-cache-dir https://github.com/explosion/spacy-models/releases/download/pt_core_news_sm-3.7.0/pt_core_news_sm-3.7.0-py3-none-any.whl

# Copy app files
COPY . .

# Expose port
EXPOSE 5000

# Run the service
CMD ["python", "app.py"]
