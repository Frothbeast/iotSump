
CREATE TABLE IF NOT EXISTS sumpData (
    id INT AUTO_INCREMENT PRIMARY KEY,
    datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Hadc INT,
    Ladc INT,
    timeOn INT,
    timeOff INT,
    hoursOn INT
);