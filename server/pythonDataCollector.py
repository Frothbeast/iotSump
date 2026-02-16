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
                    print(f"Received {decoded_data}")
                    sys.stderr.write(f"DEBUG:Received {decoded_data}\n")
                    sys.stderr.flush()
                    # 1. Parse the incoming JSON string into a dictionary
                    payload_dict = json.loads(decoded_data)

                    # 2. Add the current timestamp
                    payload_dict['datetime'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                    # 3. Calculate duty cycle (with +1 safety to prevent division by zero)
                    t_on = int(payload_dict.get("timeOn", 0))
                    t_off = int(payload_dict.get("timeOff", 0))
                    payload_dict['duty'] = str(round(100 * t_on / (t_on + t_off + 1)))

                    # 4. Establish DB connection
                    conn_db = mysql.connector.connect(**db_config)
                    cursor = conn_db.cursor()

                    # 5. Insert the MODIFIED dictionary as a JSON string
                    query = f"INSERT INTO {db_config['database']}.sumpData (payload) VALUES (%s)"
                    cursor.execute(query, (json.dumps(payload_dict),))
                    conn_db.commit()
                    sys.stderr.write(f"DEBUG: Current location environment variable: {location}\n")
                    sys.stderr.flush()
                    if location == 'home':
                        now = datetime.now()
                        if lastRunTime is None or now >= (lastRunTime + timedelta(hours=2)):
                            cursor = conn_db.cursor(dictionary=True)
                            week_query = f"""
                                                    SELECT payload 
                                                    FROM {db_config['database']}.sumpData 
                                                    WHERE STR_TO_DATE(payload->>'$.datetime', '%Y-%m-%d %H:%M:%S') >= NOW() - INTERVAL 7 DAY
                                                """
                            cursor.execute(week_query)
                            rows = cursor.fetchall()
                            weekly_data_list = [json.loads(row['payload']) for row in rows]
                            weekly_json_output = json.dumps(weekly_data_list)

                            url = "https://api.cl1p.net/frothbeast"
                            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

                            # cl1p.net requires the token for both POST/PUT and GET to maintain private clipboards
                            headers = {
                                "Content-Type": "text/plain",
                                "cl1papitoken": cl1pToken
                            }

                            try:
                                # response = requests.put(
                                #     url,
                                #     data=weekly_json_output,
                                #     headers=headers,
                                #     verify=False
                                # )
                                # Use POST as cl1p often prefers it for standard clipboard updates via API
                                response = requests.post(url, data=weekly_json_output, headers=headers, verify=False)

                                if response.status_code == 200 or response.status_code == 201:
                                    lastRunTime = now
                                    # sys.stderr.write(f"Successfully pushed to cl1p.net. Response: {response.text}\n")
                                    sys.stderr.write(
                                        f"Successfully pushed {len(weekly_data_list)} rows to cl1p. Response: {response.status_code}\n")
                                else:
                                    # sys.stderr.write(
                                    #     f"Failed to push data. Status code: {response.status_code}, API Response: {response.text}\n")
                                    sys.stderr.write(
                                        f"ERROR: cl1p push failed. Status: {response.status_code} Response: {response.text}\n")
                                sys.stderr.flush()
                            except Exception as e:
                                sys.stderr.write(f"An error occurred during the upload: {e}\n")
                                sys.stderr.flush()

                        # This was likely being accidentally captured in your error logs
                    sys.stderr.write(f"LOCAL DB: Inserted into {db_config['database']}.sumpData\n")
                    sys.stderr.flush()
                    cursor.close()
                    conn_db.close()
        except Exception as e:
            sys.stderr.write(f"Error: {e}")
            sys.stderr.flush()
            time.sleep(2)

if __name__ == "__main__":
    start_collector()