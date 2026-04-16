FROM python:3.12-slim

WORKDIR /app

ARG ENABLE_PADDLE_OCR=0

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN if [ "$ENABLE_PADDLE_OCR" = "1" ]; then \
        pip install --no-cache-dir --timeout 120 --retries 10 paddlepaddle==3.2.0 && \
        pip install --no-cache-dir --timeout 120 --retries 10 paddleocr==3.4.0; \
    fi

COPY . .

RUN chmod +x scripts/entrypoint.sh \
    && useradd --no-create-home --shell /bin/false appuser
USER appuser

ENV PYTHONPATH=/app
