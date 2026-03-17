from flask import Flask, request, jsonify, send_from_directory
import mysql.connector
import json
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from flask_cors import CORS
import requests
import urllib3
import sys
import time

lastRunTime = None

docker_path = '/app/client/build'
local_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'client', 'build'))
template_dir = docker_path if os.path.exists(docker_path) else local_path

app = Flask(__name__, static_folder=template_dir, static_url_path='/')
CORS(app)
load_dotenv()
location = os.getenv('LOCATION')
cl1pToken = os.getenv('CL1P_TOKEN')
cl1pURL = os.getenv('CL1P_URL')

SUMP_USER = os.getenv('SUMP_DB_USER')
SUMP_PASS = os.getenv('SUMP_DB_PASS')
DB_HOST = os.getenv('DB_HOST')
DB_NAME = os.getenv('DB_NAME')

if not SUMP_USER or not SUMP_PASS:
    sys.stderr.write(f"ERROR: Environment Variables Missing! User: {SUMP_USER}, Pass: {'SET' if SUMP_PASS else 'MISSING'}\n")

db_config = {
    'host': DB_HOST,
    'user': SUMP_USER,
    'password': SUMP_PASS,
    'database': DB_NAME
}

def datetime_handler(x):
    if isinstance(x, datetime):
        return x.isoformat()
    raise TypeError("Unknown type")

def get_db_connection():
    retries = 5
    while retries > 0:
        try:
            conn = mysql.connector.connect(**db_config)
            return conn
        except mysql.connector.Error as err:
            sys.stderr.write(f"Connection failed, retrying in 5s... {err}\n")
            retries -= 1
            time.sleep(5)
    return None

def bootstrap_db():
    try:
        conn = get_db_connection()
        if not conn:
             raise Exception("Could not connect to database after retries")
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sumpData (
                id INT AUTO_INCREMENT PRIMARY KEY,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                Hadc INT,
                Ladc INT,
                timeOn INT,
                timeOff INT,
                hoursOn DECIMAL(10,4),
                duty DECIMAL(5,2)
            )
        """)
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        sys.stderr.write(f"Bootstrap error: {e}\n")

@app.after_request
def apply_caching(response):
    response.headers["X-Frame-Options"] = "ALLOWALL"
    return response


@app.route('/api/cl1p', methods=['POST'])
def cl1p():
    global location, cl1pURL, cl1pToken
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    headers = {"Content-Type": "text/plain", "cl1papitoken": cl1pToken}

    try:
        if location == "home":
            conn_db = get_db_connection()
            if not conn_db: return jsonify({"error": "DB Connection Timeout"}), 500
            cursor_fetch = conn_db.cursor(dictionary=True)
            query = "SELECT * FROM sumpData WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
            cursor_fetch.execute(query)
            rows = cursor_fetch.fetchall()

            for row in rows:
                row['timestamp'] = str(row['timestamp'])
                row['hoursOn'] = float(row['hoursOn'])
                row['duty'] = float(row['duty'])

            long_string_payload = json.dumps(rows)
            response = requests.post(cl1pURL, data=long_string_payload, headers=headers, verify=False)

            cursor_fetch.close()
            conn_db.close()
            return '', 204

        elif location == "work":
            response = requests.get(cl1pURL, headers=headers, verify=False)
            if response.status_code == 200:
                cl1p_payloads = json.loads(response.text)
                if isinstance(cl1p_payloads, list):

                    conn = get_db_connection()
                    if not conn: return jsonify({"error": "DB Connection Timeout"}), 500
                    cursor = conn.cursor()
                    for item in cl1p_payloads:
                        ts = item.get('timestamp')
                        cursor.execute("SELECT COUNT(*) FROM sumpData WHERE timestamp = %s", (ts,))
                        if cursor.fetchone()[0] == 0:
                            query = """
                                INSERT INTO sumpData (timestamp, Hadc, Ladc, timeOn, timeOff, hoursOn, duty)
                                VALUES (%s, %s, %s, %s, %s, %s, %s)
                            """
                            cursor.execute(query, (ts, item.get('Hadc'), item.get('Ladc'),
                                                   item.get('timeOn'), item.get('timeOff'),
                                                   item.get('hoursOn'), item.get('duty')))
                    conn.commit()
                    cursor.close()
                    conn.close()
            return '', 204
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/sumpData', methods=['GET'])
def get_sump_data():
    try:
        hours = request.args.get('hours', default=24, type=int)
        print(f"DEBUG: Fetching data for last {hours} hours", file=sys.stderr, flush=True)
        conn = get_db_connection()
        if not conn: return jsonify([]), 200
        cursor = conn.cursor(dictionary=True)
        query = "SELECT id, timestamp, Hadc, Ladc, timeOn, timeOff, hoursOn, duty FROM sumpData WHERE timestamp > NOW() - INTERVAL %s HOUR"
        cursor.execute(query, (hours,))
        rows = cursor.fetchall()

        cursor.close()
        conn.close()

        return app.response_class(
            response=json.dumps(rows, default=datetime_handler),
            status=200,
            mimetype='application/json'
        )
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr, flush=True)
        return jsonify([]), 200


@app.route('/api/time', methods=['GET'])
def get_time():
    return jsonify({"time": datetime.now().strftime("%I:%M %p")})


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')


if __name__ == '__main__':
    bootstrap_db()
    port_env = int(os.getenv('API_PORT'))
    app.run(host='0.0.0.0', port=port_env)