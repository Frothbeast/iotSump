#
# This file is the API handling web requests and errors
#

from flask import Flask, request, jsonify, send_from_directory
import mysql.connector
import json
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from flask_cors import CORS
import requests
import urllib3
import subprocess
import sys

lastRunTime = None
load_dotenv()
app = Flask(__name__, static_folder='../client/build', static_url_path='/')

CORS(app)
location = os.getenv('LOCATION')
sys.stderr.write(f"DEBUG: Current location environment variable: {location}\n")
sys.stderr.flush()
db_config = {
  'host': os.getenv('DB_HOST'),
  'user': os.getenv('DB_USER'),
  'password': os.getenv('DB_PASS'),
  'database': os.getenv('DB_NAME')
}

cl1pURL = os.getenv('CL1P_URL')

@app.route('/api/time', methods=['GET'])
def get_time():
    # %I is 12-hour clock, %M is minutes, %p is AM/PM
    now = datetime.now()
    server_time = now.strftime("%I:%M %p")
    return jsonify({"time": server_time})


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
  import os
  if not os.path.exists(os.path.join(app.static_folder, 'index.html')):
    return f"Error: index.html not found in {app.static_folder}", 404
  return send_from_directory(app.static_folder, 'index.html')


@app.route('/api/sumpData', methods=['GET'])
def get_sump_data():
  global lastRunTime
  global location
  if location == 'work':
    now = datetime.now()
    if lastRunTime is None or now >= (lastRunTime + timedelta(hours=2)):
      urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
      url = cl1pURL
      cl1pToken = os.getenv('CL1P_TOKEN')
      headers = {"cl1papitoken": cl1pToken}
      try:
        response = requests.get(url, headers=headers, verify=False)
        if response.status_code == 200:
          raw_text = response.text
          sys.stderr.write(f"DEBUG: Received from cl1p: {raw_text[:500]}...\n")
          try:
            cl1p_payloads = json.loads(raw_text)
            if isinstance(cl1p_payloads, list) and len(cl1p_payloads) > 0:
              conn = mysql.connector.connect(**db_config)
              cursor = conn.cursor()

              new_count = 0
              for item in cl1p_payloads:
                dt_val = item.get('datetime')
                if dt_val:
                  check_query = f"SELECT COUNT(*) FROM {db_config['database']}.sumpData WHERE payload->>'$.datetime' = %s"
                  cursor.execute(check_query, (dt_val,))
                  if cursor.fetchone()[0] == 0:
                    insert_query = f"INSERT INTO {db_config['database']}.sumpData (payload) VALUES (%s)"
                    cursor.execute(insert_query, (json.dumps(item),))
                    new_count += 1

              conn.commit()
              lastRunTime = now
              sys.stderr.write(f"DEBUG: Successfully imported {new_count} new rows\n")
          except json.JSONDecodeError as e:
            sys.stderr.write(f"ERROR: JSON Decode Failed: {str(e)}\n")
            sys.stderr.write(f"OFFENDING CONTENT: {raw_text[:200]}\n")
          finally:
            if 'cursor' in locals(): cursor.close()
            if 'conn' in locals(): conn.close()

        else:
          sys.stderr.write(f"DEBUG: Failed to retrieve data. Response: {response.json()}\n")
          sys.stderr.flush()
      except Exception as e:
        sys.stderr.write(f"DEBUG: An error occurred: {e}\n")
        sys.stderr.flush()

  try:
    hours = request.args.get('hours', default=24, type=int)

    threshold = datetime.now() - timedelta(hours=hours)
    threshold_str = threshold.strftime('%Y-%m-%d %H:%M:%S')

    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)

    query = """
            SELECT id, payload FROM sumpData 
            WHERE payload->>'$.datetime' >= %s
            ORDER BY id DESC
        """

    cursor.execute(query, (threshold_str,))
    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    for row in rows:
      if isinstance(row['payload'], str):
        row['payload'] = json.loads(row['payload'])

    return jsonify(rows)
  except Exception as e:
    sys.stderr.write(f"DEBUG: An error occurred: {e}\n")
    sys.stderr.flush()
    return jsonify({"error": str(e)}), 500


@app.route('/api/data', methods=['GET', 'POST'])
def handle_data():
  if request.method == 'POST':
    try:
      data = request.get_json()
      conn = mysql.connector.connect(**db_config)
      cursor = conn.cursor()
      query = "INSERT INTO sumpData (payload) VALUES (%s)"
      cursor.execute(query, (json.dumps(data),))
      conn.commit()
      cursor.close()
      conn.close()

      return jsonify({"status": "success"}), 200
    except Exception as e:
      sys.stderr.write(f"DEBUG: An error occurred: {e}\n")
      sys.stderr.flush()
      return jsonify({"status": "error", "message": str(e)}), 500

  try:
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, payload FROM sumpData ORDER BY id DESC LIMIT 200")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    for row in rows:
      if isinstance(row['payload'], str):
        row['payload'] = json.loads(row['payload'])
    return jsonify(rows)
  except Exception as e:
    sys.stderr.write(f"DEBUG: An error occurred: {e}\n")
    sys.stderr.flush()
    return jsonify({"error": str(e)}), 500


@app.errorhandler(404)
def not_found(e):
  import os
  if not os.path.exists(os.path.join(app.static_folder, 'index.html')):
    return "Fallback failed: index.html missing", 404
  return send_from_directory(app.static_folder, 'index.html')


if __name__ == '__main__':
  app.run(host='0.0.0.0', port=5000, debug=True)