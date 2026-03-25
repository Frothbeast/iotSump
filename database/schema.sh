#!/bin/bash

mysql -u root -p"${DB_ROOT_PASSWORD}" <<-EOSQL
    CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;
    USE \`${DB_NAME}\`;

    CREATE USER IF NOT EXISTS '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASS}';
    GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'%';
    FLUSH PRIVILEGES;

    CREATE TABLE IF NOT EXISTS sumpData (
        id INT AUTO_INCREMENT PRIMARY KEY,
        datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        Hadc INT,
        Ladc INT,
        timeOn INT,
        timeOff INT,
        hoursOn INT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
EOSQL