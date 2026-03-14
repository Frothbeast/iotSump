# STEP 1: Build the React Frontend
FROM node:18-alpine AS build-step
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# STEP 2: Setup the Python Flask API
FROM python:3.10-slim
WORKDIR /app

# Install system dependencies for MySQL
RUN apt-get update && apt-get install -y \
    default-libmysqlclient-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY server/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy server code
COPY server/ ./

# Copy the built React files into the static folder Flask uses
# Based on your App initialization: static_folder='../client/build'
RUN mkdir -p /app/client/build
# COPY --from=build-stage /app/client/build /app/client/build
# Corrected: Match the stage name defined in Step 1
COPY --from=build-step /app/client/build /app/client/build

EXPOSE 5000
CMD ["python", "sumpPumpWifiAPI.py"]