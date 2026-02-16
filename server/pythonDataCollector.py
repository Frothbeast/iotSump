# pythonDataCollector.py
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
# Load environment variables
cwd = os.getcwd()
print(f"INFO: Current Working Directory: {cwd}", file=sys.stderr)
sys.stderr.flush()
load_dotenv()
lastRunTime = None
BIND_HOST = os.getenv('BIND_HOST', '0.0.0.0')
PORT = int(os.getenv('COLLECTOR_PORT', 1883))
location = os.getenv('LOCATION')
cl1pToken = os.getenv('CL1P_TOKEN')

db_config = {
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASS'),
    'database': os.getenv('DB_NAME'),
}
def start_collector():
    # Regular TCP socket without any SSL wrapping
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    # Ensure no ssl.wrap_socket calls exist here
    server_socket.bind((BIND_HOST, PORT))
    server_socket.listen(5)

    print(f"Monitoring port {PORT} for incoming raw ASCII data...")
    global lastRunTime

    while True:
        try:
            conn, addr = server_socket.accept()
            with conn:
                data = conn.recv(1024)
                if data:
                    decoded_data = data.decode('ascii').strip()
                    payload_dict = json.loads(decoded_data)
                    payload_dict['datetime'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                    # Duty cycle calculation
                    t_on = int(payload_dict.get("timeOn", 0))
                    t_off = int(payload_dict.get("timeOff", 0))
                    payload_dict['duty'] = str(round(100 * t_on / (t_on + t_off + 1)))

                    conn_db = mysql.connector.connect(**db_config)
                    cursor = conn_db.cursor()
                    query = f"INSERT INTO {db_config['database']}.sumpData (payload) VALUES (%s)"
                    cursor.execute(query, (json.dumps(payload_dict),))
                    conn_db.commit()

                    # COUPLED LOGIC: Only runs after a pump event
                    if location == 'home':
                        now = datetime.now()
                        if lastRunTime is None or now >= (lastRunTime + timedelta(hours=2)):
                            cursor_fetch = conn_db.cursor(dictionary=True)
                            week_query = f"""
                                    SELECT payload 
                                    FROM {db_config['database']}.sumpData 
                                    WHERE STR_TO_DATE(payload->>'$.datetime', '%%Y-%%m-%%d %%H:%%i:%%s') >= NOW() - INTERVAL 7 DAY
                                """
                            cursor_fetch.execute(week_query)
                            rows = cursor_fetch.fetchall()

                            # Convert list of objects to a raw JSON text string
                            weekly_data_list = [
                                json.loads(row['payload']) if isinstance(row['payload'], str) else row['payload'] for
                                row in rows]
                            raw_text_payload = json.dumps(weekly_data_list)

                            url = "https://api.cl1p.net/frothbeast"
                            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
                            headers = {"Content-Type": "text/plain", "cl1papitoken": cl1pToken}

                            try:
                                # Sending as raw text
                                response = requests.post(url, data=raw_text_payload, headers=headers, verify=False)
                                if 200 <= response.status_code < 300:
                                    lastRunTime = now
                                    sys.stderr.write(f"Successfully pushed week of data to cl1p.\n")
                                else:
                                    sys.stderr.write(f"Push failed: {response.status_code}\n")
                            except Exception as e:
                                sys.stderr.write(f"Upload error: {e}\n")

                            cursor_fetch.close()

                    cursor.close()
                    conn_db.close()
                    sys.stderr.flush()
                    cursor.close()
                    conn_db.close()
        except KeyboardInterrupt:
             sys.stderr.write("Shutdown signal received.\n")
             break
        except Exception as e:
            sys.stderr.write(f"Error: {e}")
            sys.stderr.flush()
            time.sleep(2)

if __name__ == "__main__":
    start_collector()