FROM python:3.13-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/src
ENV HOST=0.0.0.0
ENV PORT=8011

RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock README.md ./
COPY src ./src
COPY examples ./examples

RUN uv sync --frozen

EXPOSE 8011

CMD ["uv", "run", "python", "src/server.py"]
