#!/bin/bash
# Complete installation script for Candela RMS

echo "========================================="
echo "  Candela RMS - Installation Script"
echo "========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "Please run as root (sudo ./install.sh)"
  exit 1
fi

# Detect OS
OS="unknown"
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
fi

echo "Detected OS: $OS"
echo ""

# Install Docker
echo "Installing Docker..."
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    apt-get update
    apt-get install -y apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/$OS/gpg | apt-key add -
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/$OS $(lsb_release -cs) stable"
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ] || [ "$OS" = "fedora" ]; then
    yum install -y yum-utils
    yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl start docker
    systemctl enable docker
fi

# Install Node.js
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PostgreSQL client
echo "Installing PostgreSQL client..."
apt-get install -y postgresql-client

# Clone repository
echo "Cloning Candela RMS..."
git clone https://github.com/yourusername/candela-rms.git /opt/candela-rms
cd /opt/candela-rms

# Create .env file
echo "Creating environment configuration..."
cp .env.example .env

# Generate secure passwords
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)

sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env

# Install dependencies
echo "Installing dependencies..."
cd /opt/candela-rms/backend
npm install

cd /opt/candela-rms/frontend
npm install

# Setup database
echo "Setting up database..."
docker-compose up -d postgres
sleep 10
cd /opt/candela-rms/backend
npx prisma migrate deploy
npx prisma db seed

# Build frontend
echo "Building frontend..."
cd /opt/candela-rms/frontend
npm run build

# Start services
echo "Starting Candela RMS..."
cd /opt/candela-rms
docker-compose up -d

# Setup systemd service
echo "Creating systemd service..."
cat > /etc/systemd/system/candela-rms.service << EOF
[Unit]
Description=Candela RMS
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/candela-rms
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
ExecReload=/usr/bin/docker-compose restart
StandardOutput=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable candela-rms
systemctl start candela-rms

# Setup automatic backups
echo "Setting up automatic backups..."
echo "0 2 * * * root /opt/candela-rms/scripts/backup.sh" > /etc/cron.d/candela-backup

echo ""
echo "========================================="
echo "  Installation Complete!"
echo "========================================="
echo ""
echo "Access the application at: http://localhost"
echo ""
echo "Default Admin Credentials:"
echo "  Email: admin@candelarms.com"
echo "  Password: admin123"
echo ""
echo "Database Password: $DB_PASSWORD"
echo "JWT Secret: $JWT_SECRET"
echo ""
echo "Please change the default password immediately!"
echo ""