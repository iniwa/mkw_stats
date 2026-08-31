FROM python:3.12-slim

ARG APP_COMMIT_SHA
ARG APP_BUILD_TIMESTAMP
ENV APP_COMMIT_SHA=${APP_COMMIT_SHA} \
    APP_BUILD_TIMESTAMP=${APP_BUILD_TIMESTAMP}

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY alembic.ini .
COPY alembic/ ./alembic/
COPY app/ ./app/

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
