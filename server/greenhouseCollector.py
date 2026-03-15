#
# Dedicated Greenhouse Collector - Discrete Multi-Device Aggregator
#
import os
import socket
import json
import binascii
import mysql.connector
from urllib.parse import parse_qs
from dotenv import load_dotenv
from datetime import datetime

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

BIND_HOST = os.getenv('BIND_HOST', '0.0.0.0')
PORT = 1884
DB_CONFIG = {
    'host': os.getenv('DB_HOST', '127.0.0.1'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASS'),
    'database': os.getenv('DB_NAME'),
}

# Dictionary holding completely separate states for each ESP
# Key = Device ID, Value = Data for that specific device
device_states = {}


def flush_device(device_id):
    global device_states
    state = device_states[device_id]

    if not state["temps"]:
        return

    try:
        count = len(state["temps"])
        summary_payload = {
            "id": device_id,
            "readings_count": count,
            "temp_high": max(state["temps"]),
            "temp_low": min(state["temps"]),
            "temp_avg": round(sum(state["temps"]) / count, 2),
            "rssi_best": max(state["rssis"]),
            "rssi_worst": min(state["rssis"]),
            "minute_mark": state["current_minute"],
            "ts_flushed": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        # conn_db = mysql.connector.connect(**db_config)
        conn_db = mysql.connector.connect(**DB_CONFIG)
        cursor = conn_db.cursor()
        query = f"INSERT INTO {DB_CONFIG['database']}.greenhouse_log (payload) VALUES (%s)"
        cursor.execute(query, (json.dumps(summary_payload),))
        conn_db.commit()
        cursor.close()
        conn_db.close()

        print(f"DEBUG: Flushed {device_id} | Readings: {count} | Minute: {state['current_minute']}")
    except Exception as e:
        print(f"Flush Error for {device_id}: {e}")
    finally:
        # Reset ONLY this device's data lists
        state["temps"] = []
        state["rssis"] = []


def start_greenhouse_collector():
    global device_states
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server_socket:
        server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server_socket.bind((BIND_HOST, PORT))
        server_socket.listen(5)

        print(f"Collector Active on port {PORT} (Discrete Mode)...")

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

                            d_id = parsed.get('id', ['Unknown'])[0]
                            temp = float(parsed.get('temp', [0])[0])
                            rssi = int(parsed.get('rssi', [0])[0])
                            this_minute = datetime.now().strftime("%Y-%m-%d %H:%M")

                            # 1. Initialize device state if it's the first time seeing this ID
                            if d_id not in device_states:
                                device_states[d_id] = {
                                    "temps": [],
                                    "rssis": [],
                                    "current_minute": this_minute
                                }

                            # 2. Check if the minute has changed for THIS specific device
                            if this_minute != device_states[d_id]["current_minute"]:
                                flush_device(d_id)
                                device_states[d_id]["current_minute"] = this_minute

                            # 3. Add data to THIS device's bucket
                            device_states[d_id]["temps"].append(temp)
                            device_states[d_id]["rssis"].append(rssi)

                            conn.sendall(b"ACK\n")
            except Exception as e:
                print(f"Global Error: {e}")


if __name__ == "__main__":
    start_greenhouse_collector()