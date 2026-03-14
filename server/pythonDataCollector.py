#
# This file captures IOT data from the network and puts it in the database
#
import os
import sys
from dotenv import load_dotenv
import socket
import mysql.connector
import time
import json
from datetime import datetime, timedelta
import requests
import urllib3

cwd = os.getcwd()
print(f"INFO: Current Working Directory: {cwd}", file=sys.stderr)
sys.stderr.flush()
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
lastRunTime = None

# New global variables to track state for packet comparison
last_payload_data = None
last_packet_timestamp = None

BIND_HOST = os.getenv('BIND_HOST', '0.0.0.0')
PORT = int(os.getenv('COLLECTOR_PORT', 1883))
location = os.getenv('LOCATION')
cl1pToken = os.getenv('CL1P_TOKEN')
cl1pURL = os.getenv('CL1P_URL')

db_config = {
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASS'),
    'database': os.getenv('DB_NAME'),
}


def start_collector():
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server_socket.bind((BIND_HOST, PORT))
    server_socket.listen(5)
    print(f"Monitoring port {PORT} for incoming raw ASCII data...")
    global lastRunTime
    # Access global tracking variables
    global last_payload_data, last_packet_timestamp

    while True:
        try:
            conn, addr = server_socket.accept()
            with conn:
                data = conn.recv(1024)
                if data:
                    decoded_data = data.decode('ascii').strip()

                    # NEW VALIDATION LOGIC: Detect 20-char Hex String
                    is_valid_hex = len(decoded_data) == 20 and all(c in '0123456789ABCDEFabcdef' for c in decoded_data)

                    if is_valid_hex:
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
                            conn.sendall(b"ERR")
                            payload_dict = None

                    if payload_dict:
                        # Check if the data packet is identical to the previous one
                        current_time = datetime.now()

                        if last_payload_data is not None and last_packet_timestamp is not None:
                            # Create copies for comparison to avoid checking dynamic metadata like 'datetime' or 'duty'
                            # if they were already appended in the previous loop iteration.
                            comp_current = {k: v for k, v in payload_dict.items() if k not in ['datetime', 'duty']}
                            comp_previous = {k: v for k, v in last_payload_data.items() if
                                             k not in ['datetime', 'duty']}

                            if comp_current == comp_previous:
                                # Packet is identical.
                                # Calculate difference in time between this run and last run in seconds.
                                run_time_diff = (current_time - last_packet_timestamp).total_seconds()

                                # Check if ontime plus offtime is within 10% of the difference in run time.
                                t_on = int(payload_dict.get("timeOn", 0))
                                t_off = int(payload_dict.get("timeOff", 0))
                                total_sensor_time = t_on + t_off

                                # Logic: 0.9 * diff <= sensor_time <= 1.1 * diff
                                if run_time_diff >= 0.9 * total_sensor_time:
                                    sys.stderr.write(
                                        "DEBUG: Duplicate packet detected. Timing is within 10% tolerance.\n")
                                else:
                                    sys.stderr.write(
                                        f"DEBUG: Duplicate packet detected. Timing ({total_sensor_time}s) is OUTSIDE 10% tolerance of run diff ({run_time_diff}s).\n")
                                    continue
                        # Update tracking variables for next iteration
                        last_payload_data = payload_dict.copy()
                        last_packet_timestamp = current_time

                        payload_dict['datetime'] = current_time.strftime("%Y-%m-%d %H:%M:%S")
                        t_on = int(payload_dict.get("timeOn", 0))
                        t_off = int(payload_dict.get("timeOff", 0))
                        payload_dict['duty'] = str(round(100 * t_on / (t_on + t_off + 1)))
                        conn_db = mysql.connector.connect(**db_config)
                        cursor = conn_db.cursor()
                        query = f"INSERT INTO {db_config['database']}.sumpData (payload) VALUES (%s)"
                        cursor.execute(query, (json.dumps(payload_dict),))
                        conn_db.commit()
                        sys.stderr.flush()
                        cursor.close()
                        conn_db.close()
        except KeyboardInterrupt:
            sys.stderr.write("Shutdown signal received.\n")
            break
        except Exception as e:
            sys.stderr.write(f"Error: {e}\n")
            sys.stderr.flush()
            time.sleep(2)


if __name__ == "__main__":
    start_collector()