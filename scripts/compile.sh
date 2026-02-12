#!/bin/bash
# Compilation script for creating distributable package

echo "========================================="
echo "  Candela RMS - Compilation Script"
echo "========================================="
echo ""

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf dist
mkdir -p dist

# Version
VERSION=$(node -p "require('./package.json').version")
echo "Building version: $VERSION"

# Build backend
echo "Building backend..."
cd backend
npm install --production
npm prune --production
cd ..

# Build frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
npm prune --production
cd ..

# Create distribution structure
echo "Creating distribution package..."
mkdir -p dist/candela-rms-$VERSION
mkdir -p dist/candela-rms-$VERSION/backend
mkdir -p dist/candela-rms-$VERSION/frontend
mkdir -p dist/candela-rms-$VERSION/database
mkdir -p dist/candela-rms-$VERSION/scripts
mkdir -p dist/candela-rms-$VERSION/installer

# Copy backend files
cp -r backend/node_modules dist/candela-rms-$VERSION/backend/
cp -r backend/prisma dist/candela-rms-$VERSION/backend/
cp -r backend/src dist/candela-rms-$VERSION/backend/
cp backend/package.json dist/candela-rms-$VERSION/backend/
cp backend/server.js dist/candela-rms-$VERSION/backend/
cp backend/Dockerfile dist/candela-rms-$VERSION/backend/

# Copy frontend files (built)
cp -r frontend/.next dist/candela-rms-$VERSION/frontend/
cp -r frontend/node_modules dist/candela-rms-$VERSION/frontend/
cp -r frontend/public dist/candela-rms-$VERSION/frontend/
cp -r frontend/src dist/candela-rms-$VERSION/frontend/
cp frontend/package.json dist/candela-rms-$VERSION/frontend/
cp frontend/next.config.js dist/candela-rms-$VERSION/frontend/
cp frontend/tailwind.config.js dist/candela-rms-$VERSION/frontend/
cp frontend/Dockerfile dist/candela-rms-$VERSION/frontend/

# Copy configuration files
cp docker-compose.yml dist/candela-rms-$VERSION/
cp docker-compose.prod.yml dist/candela-rms-$VERSION/
cp .env.example dist/candela-rms-$VERSION/
cp README.md dist/candela-rms-$VERSION/
cp LICENSE dist/candela-rms-$VERSION/

# Copy scripts
cp scripts/*.sh dist/candela-rms-$VERSION/scripts/
cp scripts/*.bat dist/candela-rms-$VERSION/scripts/
chmod +x dist/candela-rms-$VERSION/scripts/*.sh

# Copy nginx configuration
cp -r nginx dist/candela-rms-$VERSION/

# Copy database migrations
cp -r database/migrations dist/candela-rms-$VERSION/database/

# Create installer packages
echo "Creating installer packages..."

# Linux installer
tar -czf dist/candela-rms-$VERSION-linux-x64.tar.gz -C dist candela-rms-$VERSION

# Windows installer (with NSIS)
if command -v makensis &> /dev/null; then
    makensis installer/windows/installer.nsi
    cp installer/windows/CandelaRMS-Setup.exe dist/
fi

# macOS installer
hdiutil create -volname "Candela RMS" -srcfolder dist/candela-rms-$VERSION -ov -format UDZO dist/candela-rms-$VERSION-macos.dmg

# Generate checksums
cd dist
md5sum candela-rms-$VERSION-linux-x64.tar.gz > checksums.txt
sha256sum candela-rms-$VERSION-linux-x64.tar.gz >> checksums.txt
cd ..

echo ""
echo "========================================="
echo "  Compilation Complete!"
echo "========================================="
echo ""
echo "Distribution packages created in ./dist/"
echo ""
echo "Files:"
ls -lh dist/
echo ""