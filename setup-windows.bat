@echo off
title Candela RMS Installer
color 0A

echo =========================================
echo    Candela RMS - Windows Installation
echo =========================================
echo.

:: Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting administrator privileges...
    powershell start -verb runas '%0'
    exit /b
)

:: Check for Docker
echo Checking Docker installation...
docker --version >nul 2>&1
if %errorLevel% neq 0 (
    echo Docker is not installed!
    echo Downloading Docker Desktop...
    powershell Invoke-WebRequest -Uri "https://desktop.docker.com/win/stable/Docker%20Desktop%20Installer.exe" -OutFile "%TEMP%\DockerInstaller.exe"
    start /wait "" "%TEMP%\DockerInstaller.exe" install --quiet
    echo Please restart your computer and run this installer again.
    pause
    exit /b
)

:: Check for Git
echo Checking Git installation...
git --version >nul 2>&1
if %errorLevel% neq 0 (
    echo Git is not installed!
    echo Downloading Git...
    powershell Invoke-WebRequest -Uri "https://github.com/git-for-windows/git/releases/download/v2.42.0.windows.2/Git-2.42.0.2-64-bit.exe" -OutFile "%TEMP%\GitInstaller.exe"
    start /wait "" "%TEMP%\GitInstaller.exe" /VERYSILENT
)

:: Clone repository
echo Downloading Candela RMS...
if not exist "C:\candela-rms" (
    git clone https://github.com/yourusername/candela-rms.git C:\candela-rms
)
cd C:\candela-rms

:: Create .env file
echo Creating configuration...
copy .env.example .env

:: Generate random passwords
powershell -Command "$password = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | %% {[char]$_}); (Get-Content .env) -replace 'DB_PASSWORD=.*', \"DB_PASSWORD=$password\" | Set-Content .env"
powershell -Command "$jwt = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | %% {[char]$_}); (Get-Content .env) -replace 'JWT_SECRET=.*', \"JWT_SECRET=$jwt\" | Set-Content .env"

:: Start Docker services
echo Starting Candela RMS...
docker-compose up -d

:: Wait for services
echo Waiting for services to start...
timeout /t 30 /nobreak >nul

:: Run migrations
docker exec candela_backend npx prisma migrate deploy
docker exec candela_backend node prisma/seed.js

:: Create desktop shortcut
echo Creating desktop shortcut...
powershell -Command "$WScriptShell = New-Object -ComObject WScript.Shell; $Shortcut = $WScriptShell.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Candela RMS.lnk'); $Shortcut.TargetPath = 'http://localhost'; $Shortcut.Save()"

:: Open browser
start http://localhost

echo.
echo =========================================
echo    Installation Complete!
echo =========================================
echo.
echo Access Candela RMS at: http://localhost
echo.
echo Default Login:
echo   Email: admin@candelarms.com
echo   Password: admin123
echo.
echo IMPORTANT: Please change the default password!
echo.
pause