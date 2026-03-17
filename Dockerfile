
FROM node:18-alpine AS build-step
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./

ARG REACT_APP_SUMP_API_URL
ENV REACT_APP_SUMP_API_URL=$REACT_APP_SUMP_API_URL

RUN npm run build

FROM python:3.10-slim
WORKDIR /app

RUN apt-get update && apt-get install -y \
    default-libmysqlclient-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*


COPY server/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY server/ ./
RUN mkdir -p /app/client/build
COPY --from=build-step /app/client/build app/client/build

EXPOSE 5000
CMD ["python", "sumpPumpWifiAPI.py"]