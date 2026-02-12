@echo off
echo =========================================
echo   Candela RMS - Windows Installation
echo =========================================
echo.

:: Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Please run as Administrator!
    pause
    exit /b 1
)

:: Install Chocolatey
echo Installing Chocolatey...
@"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -InputFormat None -ExecutionPolicy Bypass -Command "[System.Net.ServicePointManager]::SecurityProtocol = 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))" && SET "PATH=%PATH%;%ALLUSERSPROFILE%\chocolatey\bin"

:: Install Docker
echo Installing Docker...
choco install docker-desktop -y

:: Install Node.js
echo Installing Node.js...
choco install nodejs -y

:: Install Git
echo Installing Git...
choco install git -y

:: Clone repository
echo Downloading Candela RMS...
cd C:\
git clone https://github.com/yourusername/candela-rms.git
cd candela-rms

:: Install dependencies
echo Installing dependencies...
cd backend
call npm install
cd ..\frontend
call npm install
cd ..

:: Setup environment
echo Configuring environment...
copy .env.example .env

:: Generate random password
powershell -Command "$bytes = New-Object Byte[] 32; (New-Object Random).NextBytes($bytes); [Convert]::ToBase64String($bytes)" > temp.txt
set /p DB_PASSWORD=<temp.txt
del temp.txt

powershell -Command " (Get-Content .env) -replace 'DB_PASSWORD=.*', 'DB_PASSWORD=%DB_PASSWORD%' | Set-Content .env"

:: Start Docker services
echo Starting services...
docker-compose up -d

:: Create desktop shortcut
echo Creating desktop shortcut...
powershell -Command "$WScriptShell = New-Object -ComObject WScript.Shell; $Shortcut = $WScriptShell.CreateShortcut([System.Environment]::GetFolderPath('Desktop') + '\Candela RMS.lnk'); $Shortcut.TargetPath = 'http://localhost'; $Shortcut.Save()"

echo.
echo =========================================
echo   Installation Complete!
echo =========================================
echo.
echo Access the application at: http://localhost
echo.
echo Default Admin Credentials:
echo   Email: admin@candelarms.com
echo   Password: admin123
echo.
echo Database Password: %DB_PASSWORD%
echo.
pause