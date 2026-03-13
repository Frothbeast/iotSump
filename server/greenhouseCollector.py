#
# Dedicated Greenhouse Collector - 1-Minute Aggregator
#
import os
import socket
import json
import binascii
import mysql.connector
from urllib.parse import parse_qs
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

BIND_HOST = os.getenv('BIND_HOST', '0.0.0.0')
PORT = 1884
DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASS'),
    'database': os.getenv('DB_NAME'),
}

# Global buffer for aggregation
buffer = {
    "count": 0,
    "temps": [],
    "rssis": [],
    "current_minute": None,
    "device_id": None
}


def flush_to_db():
    global buffer
    if buffer["count"] == 0:
        return

    try:
        # Calculate stats
        summary_payload = {
            "id": buffer["device_id"],
            "readings_count": buffer["count"],
            "temp_high": max(buffer["temps"]),
            "temp_low": min(buffer["temps"]),
            "temp_avg": round(sum(buffer["temps"]) / buffer["count"], 2),
            "rssi_best": max(buffer["rssis"]),
            "rssi_worst": min(buffer["rssis"]),
            "minute_mark": buffer["current_minute"],
            "ts_flushed": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        conn_db = mysql.connector.connect(**DB_CONFIG)
        cursor = conn_db.cursor()
        query = f"INSERT INTO {DB_CONFIG['database']}.greenhouse_log (payload) VALUES (%s)"
        cursor.execute(query, (json.dumps(summary_payload),))
        conn_db.commit()
        cursor.close()
        conn_db.close()

        print(f"Flushed 1-minute summary for {buffer['device_id']}: {buffer['count']} readings.")
    except Exception as e:
        print(f"Database Flush Error: {e}")
    finally:
        # Reset buffer
        buffer["count"] = 0
        buffer["temps"] = []
        buffer["rssis"] = []


def start_greenhouse_collector():
    global buffer
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server_socket:
        server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server_socket.bind((BIND_HOST, PORT))
        server_socket.listen(5)

        print(f"Greenhouse Collector (Aggregator) on port {PORT}...")

        while True:
            try:
                conn, addr = server_socket.accept()
                with conn:
                    data = conn.recv(1024)
                    if data:
                        hex_str = data.decode('ascii').strip()
                        if hex_str:
                            plain_text = binascii.unhexlify(hex_str).decode('utf-8')
                            parsed = parse_qs(plain_text)

                            # Extract data
                            d_id = parsed.get('id', ['Unknown'])[0]
                            temp = float(parsed.get('temp', [0])[0])
                            rssi = int(parsed.get('rssi', [0])[0])
                            this_minute = datetime.now().strftime("%Y-%m-%d %H:%M")

                            # Check if minute has changed to flush old data
                            if buffer["current_minute"] is not None and this_minute != buffer["current_minute"]:
                                flush_to_db()

                            # Update buffer
                            buffer["current_minute"] = this_minute
                            buffer["device_id"] = d_id
                            buffer["temps"].append(temp)
                            buffer["rssis"].append(rssi)
                            buffer["count"] += 1

                            conn.sendall(b"ACK\n")
            except Exception as e:
                print(f"Global Error: {e}")


if __name__ == "__main__":
    start_greenhouse_collector()