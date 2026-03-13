CREATE DATABASE IF NOT EXISTS frothbeast;
USE frothbeast;

CREATE TABLE IF NOT EXISTS sumpData (
    ID INT AUTO_INCREMENT PRIMARY KEY, 
    payload JSON
);
CREATE TABLE IF NOT EXISTS greenhouse_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payload JSON,
    ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE VIEW v_greenhouse_summary AS
SELECT 
    id,
    CAST(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.temp_avg')) AS DECIMAL(10,2)) as temp_avg,
    CAST(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.temp_high')) AS DECIMAL(10,2)) as temp_high,
    CAST(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.temp_low')) AS DECIMAL(10,2)) as temp_low,
    CAST(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.rssi_best')) AS SIGNED) as rssi_best,
    CAST(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.minute_mark')) AS DATETIME) as time_mark
FROM greenhouse_log
ORDER BY time_mark DESC;