#
# Dedicated Greenhouse Collector - Exact Sump Mimic
#
import os
import socket
import json
import binascii
import mysql.connector
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


def start_greenhouse_collector():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server_socket:
        server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server_socket.bind((BIND_HOST, PORT))
        server_socket.listen(5)

        print(f"Greenhouse Collector (Sump Mimic) on port {PORT}...")

        while True:
            try:
                conn, addr = server_socket.accept()
                with conn:
                    data = conn.recv(1024)
                    if data:
                        # 1. Receive the raw hex string (e.g., "69643d...")
                        hex_str = data.decode('ascii').strip()

                        if hex_str:
                            # 2. Decode hex back to plain text (e.g., "id=DISH&temp=22.5...")
                            plain_text = binascii.unhexlify(hex_str).decode('utf-8')

                            # 3. Create the JSON payload for the database
                            payload_data = {
                                "raw": plain_text,
                                "src_ip": addr[0],
                                "ts": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                            }

                            # 4. Inject into Database
                            conn_db = mysql.connector.connect(**DB_CONFIG)
                            cursor = conn_db.cursor()
                            query = f"INSERT INTO {DB_CONFIG['database']}.greenhouse_log (payload) VALUES (%s)"
                            cursor.execute(query, (json.dumps(payload_data),))
                            conn_db.commit()

                            cursor.close()
                            conn_db.close()

                            conn.sendall(b"ACK\n")
                            print(f"Logged from {addr[0]}: {plain_text}")
                        else:
                            print(f"Received empty string from {addr[0]}")
            except Exception as e:
                print(f"Error: {e}")


if __name__ == "__main__":
    start_greenhouse_collector()