#!/bin/bash
# Candela RMS - Docker Runner Script

echo "========================================="
echo "  Candela RMS - Docker Runner"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed!${NC}"
    echo "Please install Docker first:"
    echo "Ubuntu/Debian: curl -fsSL https://get.docker.com | sh"
    echo "Windows: https://docs.docker.com/desktop/install/windows-install/"
    echo "Mac: https://docs.docker.com/desktop/install/mac-install/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker is installed${NC}"

# Create necessary directories
echo "Creating directories..."
mkdir -p database/backups
mkdir -p backend/uploads/products
mkdir -p backend/uploads/receipts
mkdir -p backend/uploads/temp
mkdir -p nginx/ssl
mkdir -p nginx/logs

# Generate SSL certificates for development
if [ ! -f nginx/ssl/cert.pem ]; then
    echo "Generating SSL certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=PK/ST=Punjab/L=Lahore/O=Candela/CN=localhost"
fi

# Create .env file if not exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    
    # Generate secure passwords
    DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    JWT_SECRET=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    
    # Update .env file
    sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" .env
    
    echo -e "${GREEN}✓ Environment file created${NC}"
fi

# Pull latest images
echo "Pulling Docker images..."
docker-compose pull

# Build and start containers
echo "Building and starting containers..."
docker-compose up -d --build

# Wait for database
echo "Waiting for database to be ready..."
sleep 15

# Run database migrations
echo "Running database migrations..."
docker exec candela_backend npx prisma migrate deploy

# Seed database
echo "Seeding database with sample data..."
docker exec candela_backend node prisma/seed.js

# Check if services are running
echo "Checking service status..."
if [ $(docker ps | grep candela_ | wc -l) -ge 4 ]; then
    echo -e "${GREEN}✓ All services are running${NC}"
else
    echo -e "${RED}✗ Some services failed to start${NC}"
    docker-compose logs --tail=50
    exit 1
fi

# Display information
echo ""
echo "========================================="
echo -e "${GREEN}  Candela RMS is now running!${NC}"
echo "========================================="
echo ""
echo -e "📱 ${YELLOW}Frontend:${NC} http://localhost"
echo -e "🔧 ${YELLOW}Backend API:${NC} http://localhost:5000/api"
echo -e "📚 ${YELLOW}API Documentation:${NC} http://localhost:5000/api-docs"
echo -e "🗄️ ${YELLOW}Database:${NC} postgresql://localhost:5432"
echo -e "📊 ${YELLOW}Redis:${NC} redis://localhost:6379"
echo ""
echo "========================================="
echo "  Default Login Credentials"
echo "========================================="
echo -e "📧 ${GREEN}Email:${NC} admin@candelarms.com"
echo -e "🔑 ${GREEN}Password:${NC} admin123"
echo ""
echo -e "👤 Manager: manager@candelarms.com / admin123"
echo -e "💵 Cashier: cashier@candelarms.com / admin123"
echo ""
echo "========================================="
echo "  Useful Commands"
echo "========================================="
echo "📋 View logs:     docker-compose logs -f"
echo "🔄 Restart:       docker-compose restart"
echo "⏹️  Stop:         docker-compose down"
echo "🗑️  Reset DB:     docker-compose down -v && docker-compose up -d"
echo "💾 Backup DB:     docker exec candela_backend npm run backup"
echo "📥 Restore DB:    docker exec candela_backend npm run restore"
echo ""
echo -e "${YELLOW}Access the application at: http://localhost${NC}"
echo ""