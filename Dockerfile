FROM python:3.10-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    nodejs \
    npm \
    build-essential \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server/ .

COPY client/package*.json ./client/
RUN cd client && npm install
COPY client/ ./client/

ARG REACT_APP_SUMP_API_URL
ARG API_PORT
ARG COLLECTOR_PORT

ENV REACT_APP_SUMP_API_URL=${REACT_APP_SUMP_API_URL}
ENV API_PORT=${API_PORT}
ENV COLLECTOR_PORT=${COLLECTOR_PORT}

RUN cd client && npm run build

EXPOSE ${API_PORT}
EXPOSE ${COLLECTOR_PORT}

RUN chmod +x start.sh
CMD ["./start.sh"]