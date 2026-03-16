import os
from dotenv import load_dotenv
import socket
import mysql.connector
import time
import json
from datetime import datetime

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

last_payload_data = None
last_packet_timestamp = None

db_config = {
    'host': os.getenv('DB_HOST', '127.0.0.1'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASS'),
    'database': os.getenv('DB_NAME'),
}

def start_collector():
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server_socket.bind((os.getenv('BIND_HOST', '0.0.0.0'), int(os.getenv('COLLECTOR_PORT', 1883))))
    server_socket.listen(5)
    global last_payload_data, last_packet_timestamp

    while True:
        try:
            conn, addr = server_socket.accept()
            with conn:
                data = conn.recv(1024)
                if data:
                    decoded_data = data.decode('ascii').strip()
                    is_hex = len(decoded_data) == 20 and all(c in '0123456789ABCDEFabcdef' for c in decoded_data)

                    if is_hex:
                        payload_dict = {
                            "Hadc": str(int(decoded_data[0:4], 16)),
                            "Ladc": str(int(decoded_data[4:8], 16)),
                            "hoursOn": str(int(decoded_data[8:12], 16)),
                            "timeOn": str(int(decoded_data[12:16], 16)),
                            "timeOff": str(int(decoded_data[16:20], 16))
                        }
                        conn.sendall(b"ACK")
                    else:
                        try:
                            payload_dict = json.loads(decoded_data)
                            conn.sendall(b"ACK")
                        except:
                            payload_dict = None
                            conn.sendall(b"ERR")

                    if payload_dict:
                        now = datetime.now()
                        if last_payload_data and last_packet_timestamp:
                            comp_curr = {k: v for k, v in payload_dict.items() if k not in ['datetime', 'duty']}
                            comp_prev = {k: v for k, v in last_payload_data.items() if k not in ['datetime', 'duty']}
                            if comp_curr == comp_prev:
                                diff = (now - last_packet_timestamp).total_seconds()
                                total = int(payload_dict.get("timeOn", 0)) + int(payload_dict.get("timeOff", 0))
                                if not (diff >= 0.9 * total): continue

                        last_payload_data = payload_dict.copy()
                        last_packet_timestamp = now

                        duty = round(100 * int(payload_dict["timeOn"]) / (
                                    int(payload_dict["timeOn"]) + int(payload_dict["timeOff"]) + 1), 2)

                        conn_db = mysql.connector.connect(**db_config)
                        cursor = conn_db.cursor()
                        query = """
                            INSERT INTO sumpData (Hadc, Ladc, timeOn, timeOff, hoursOn) 
                            VALUES (%s, %s, %s, %s, %s)
                        """
                        cursor.execute(query, (payload_dict["Hadc"], payload_dict["Ladc"],
                                               payload_dict["timeOn"], payload_dict["timeOff"],
                                               payload_dict["hoursOn"]))
                        conn_db.commit()
                        cursor.close()
                        conn_db.close()
        except Exception as e:
            time.sleep(2)


if __name__ == "__main__":
    start_collector()