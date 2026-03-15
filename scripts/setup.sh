sudo chmod +x setup_db.sh
./setup_db.sh

sudo apt install -y python3-venv
cd ../server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

sudo rm -f /usr/local/bin/pm2
sudo rm -rf /usr/local/lib/node_modules/pm2
sudo rm -rf /usr/local/lib/node_modules/.pm2*

cd ../client/
sudo apt install -y npm
sudo npm install -g pm2 serve

sudo ln -sf $(npm config get prefix)/lib/node_modules/pm2/bin/pm2 /usr/local/bin/pm2
PM2_BIN="/usr/local/bin/pm2"

npm install
npm run build

mkdir -p /opt/IOTServer/client/build/pages
cp -r /opt/IOTServer/client/public/pages/. /opt/IOTServer/client/build/pages/

sudo ufw allow 3000/tcp
sudo ufw allow 5000/tcp

cd /opt/IOTServer/server
$PM2_BIN delete "iot-collector" || true
$PM2_BIN start pythonDataCollector.py --name "iot-collector" --interpreter venv/bin/python

$PM2_BIN delete "iot-api" || true
$PM2_BIN start sumpPumpWifiAPI.py --name "iot-api" --interpreter venv/bin/python

$PM2_BIN delete "iot-frontend" || true
$PM2_BIN start "npx serve -s /opt/IOTServer/client/build -l 3000" --name "iot-frontend"

$PM2_BIN save
cd ..

pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 5
