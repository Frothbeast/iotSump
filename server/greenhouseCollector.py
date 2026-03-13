#
# Dedicated Greenhouse Collector using the same .env
#
import os
import sys
import socket
import binascii
import json
import mysql.connector
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

# Use a different port if the Sump collector is already running on 1883
BIND_HOST = os.getenv('BIND_HOST', '0.0.0.0')
PORT = 1884  # Dedicated port for Greenhouse
DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASS'),
    'database': os.getenv('DB_NAME'),
}


def start_greenhouse_collector():
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server_socket.bind((BIND_HOST, PORT))
    server_socket.listen(5)

    print(f"Greenhouse Collector monitoring port {PORT}...")

    while True:
        try:
            conn, addr = server_socket.accept()
            with conn:
                data = conn.recv(1024)
                if data:
                    raw_str = data.decode('ascii').strip()

                    if raw_str.startswith("payload="):
                        hex_str = raw_str.split("payload=")[1]
                        # Decode Hex ASCII
                        plain_text = binascii.unhexlify(hex_str).decode('utf-8')
                        # Parse: id=DISH_UNIT&temp=22.50&rssi=-60
                        payload_dict = dict(item.split("=") for item in plain_text.split("&"))

                        # Add timestamp
                        payload_dict['datetime'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                        # Inject into Database
                        conn_db = mysql.connector.connect(**DB_CONFIG)
                        cursor = conn_db.cursor()
                        # Assuming you want to store it in the greenhouse_log table
                        query = f"INSERT INTO {DB_CONFIG['database']}.greenhouse_log (payload) VALUES (%s)"
                        cursor.execute(query, (json.dumps(payload_dict),))

                        conn_db.commit()
                        cursor.close()
                        conn_db.close()

                        conn.sendall(b"ACK")
                        print(f"Logged from {addr[0]}: {payload_dict['id']} | RSSI: {payload_dict['rssi']}")
                    else:
                        conn.sendall(b"ERR_INVALID_FORMAT")
        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    start_greenhouse_collector()