#
# This file is my guide to setting up a server from scratch
#

GIT_USER="frothbeast"
GIT_EMAIL="frothbeast@gmail.com"
GIT_REPO_URL="https://github.com/Frothbeast/IOTServer.git"
TARGET_DIR="/opt/IOTServer"

## If using WSL 
## wsl --install Ubuntu
## exit
## wsl --set-default Ubuntu
## wsl --shutdown
## Ubuntu
## sudo apt update
## sudo DEBIAN_FRONTEND=noninteractive apt install openssh-server -y
## printf "[boot]\nsystemd=true\n" | sudo tee /etc/wsl.conf
## sudo systemctl enable --now ssh
## exit
## wsl --shutdown
## Start-Process "wsl.exe" -ArgumentList "-d Ubuntu", "--exec", "sleep", "infinity" -WindowStyle Hidden
## ip addr show eth0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}'
## NOW YOU CAN SSH in with the IP address that is shown
## go to users/frothbeast/.ssh/known_hosts/  get rid of all lines(keys) with this IP address if it is an issue
## skip next comment section

## If not using WSL: use USB stick to install ubuntu DO NOT USE GIT SSH KEY UNLESS YOU LIKE FAILING
## find IP of machine I used static ip <wired_IP_address> you can change this in the first file in /etc/netplan
## network:
##  version: 2
##  ethernets:
##    eno1:     ###<<<------- This may have a different name
##      dhcp4: false
##      addresses:
##        - <wired_IP_address>/24
##      routes:
##        - to: default
##          via: <wired_IP_gateway>
##      nameservers:
##        addresses: [8.8.8.8, 1.1.1.1]
## log in with laptop from local LAN
## from a local LAN computer, go to users/frothbeast/.ssh/known_hosts/  get rid of all lines(keys) with this IP address



# now cd /home/frothbeast/ or if in WSL start at default directory
# copy the contents of this file into sudo nano bootstrap.sh
# cntrl s cntrl x
# sudo chmod +x bootstrap.sh
# sudo ./bootstrap.sh
# follow the directions from the echo at the end of that execution

NEW_USER="frothbeast"
WSL_DISTRO_NAME="Ubuntu"
if [[ -n "$WSL_DISTRO_NAME" ]] || grep -iq "Microsoft" /proc/version; then
    echo "WSL environment detected ($WSL_DISTRO_NAME). Starting setup..."
    printf "[boot]\nsystemd=true\n" | sudo tee /etc/wsl.conf
    sudo adduser --gecos "" "$NEW_USER"
    sudo usermod -aG sudo "$NEW_USER"
    sudo bash -c "printf '[user]\ndefault=$NEW_USER\n' > /etc/wsl.conf"
    echo "--------------------------------------------------------"
    echo "WSL setup complete! To apply changes:"
    echo "1. Exit this terminal."
    echo "2. Run 'wsl --terminate $WSL_DISTRO_NAME' in PowerShell."
    echo "3. Re-open your WSL distribution."
    echo "--------------------------------------------------------"
else
    echo "This is NOT a WSL environment."
fi

sudo apt update
sudo apt upgrade -y
# Install Git and pull repo
sudo apt install -y git
git config --global user.name "$GIT_USER"
git config --global user.email "$GIT_EMAIL"
if [ ! -d "$TARGET_DIR" ]; then
    sudo mkdir -p "$TARGET_DIR"
    sudo chown -R $USER:$USER "$TARGET_DIR"
    git clone "$GIT_REPO_URL" "$TARGET_DIR"
else
    echo "Directory $TARGET_DIR already exists. Skipping clone."
fi
sudo chown -R frothbeast:frothbeast /opt/IOTServer
cd "$TARGET_DIR" && sudo chmod +x scripts/setup.sh && sudo chmod +x scripts/setup_db.sh

#Tell self to execute the main setup script after creating .env files
echo
echo
echo "----------------------------------------------------------"
echo "create .env files in root folder using .env.example"
echo "then go to $TARGET_DIR/scripts/ and run ./setup.sh"



