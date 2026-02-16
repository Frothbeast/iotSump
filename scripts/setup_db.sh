
sudo apt install -y mysql-server

sudo sed -i 's/bind-address.*/bind-address = 127.0.0.1/' /etc/mysql/mysql.conf.d/mysqld.cnf
sudo systemctl restart mysql
sudo systemctl enable mysql

if [ -f ../server/.env ]; then
    export $(grep -v '^#' ../server/.env | xargs)
else
    echo ".env file not found in ../server directory. Please create one from ../server/.env.example"
    exit 1
fi

sudo mysql -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;"
sudo mysql -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';"
sudo mysql -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

sudo mysql $DB_NAME < ../database/schema.sql