; Candela RMS Windows Installer
; NSIS Script

!define APPNAME "Candela RMS"
!define COMPANYNAME "Candela Solutions"
!define DESCRIPTION "Retail Management System"
!define VERSION "2.0.0"
!define SLUG "candela-rms"

; Main Install settings
Name "${APPNAME} ${VERSION}"
OutFile "CandelaRMS-Setup.exe"
InstallDir "$PROGRAMFILES64\${COMPANYNAME}\${APPNAME}"
InstallDirRegKey HKLM "Software\${COMPANYNAME}\${APPNAME}" "Install_Dir"
RequestExecutionLevel admin

; Interface settings
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "WinMessages.nsh"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "..\..\LICENSE"
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Languages
!insertmacro MUI_LANGUAGE "English"

; Sections
Section "Candela RMS" SecMain
    SectionIn RO
    SetOutPath $INSTDIR
    
    ; Copy files
    File /r "..\..\dist\candela-rms-${VERSION}\*.*"
    
    ; Create shortcuts
    CreateDirectory "$SMPROGRAMS\${COMPANYNAME}\${APPNAME}"
    CreateShortCut "$SMPROGRAMS\${COMPANYNAME}\${APPNAME}\${APPNAME}.lnk" "http://localhost"
    CreateShortCut "$DESKTOP\${APPNAME}.lnk" "http://localhost"
    
    ; Write registry keys
    WriteRegStr HKLM "Software\${COMPANYNAME}\${APPNAME}" "Install_Dir" "$INSTDIR"
    WriteRegStr HKLM "Software\${COMPANYNAME}\${APPNAME}" "Version" "${VERSION}"
    
    ; Write uninstaller
    WriteUninstaller "$INSTDIR\Uninstall.exe"
    
    ; Add to Add/Remove Programs
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayName" "${APPNAME}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayVersion" "${VERSION}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "Publisher" "${COMPANYNAME}"
SectionEnd

Section "Docker Desktop" SecDocker
    ; Check if Docker is installed
    ReadRegStr $0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Docker Desktop" "DisplayName"
    ${If} $0 == ""
        MessageBox MB_YESNO "Docker Desktop is required. Download and install now?" IDYES install_docker IDNO skip_docker
        install_docker:
            ExecShell "open" "https://www.docker.com/products/docker-desktop"
            MessageBox MB_OK "Please install Docker Desktop and run this installer again."
        skip_docker:
    ${EndIf}
SectionEnd

Section "PostgreSQL" SecPostgreSQL
    ; Check if PostgreSQL is installed
    ReadRegStr $0 HKLM "Software\PostgreSQL\Installations" "LastInstalled"
    ${If} $0 == ""
        MessageBox MB_YESNO "PostgreSQL is required. Download and install now?" IDYES install_postgres IDNO skip_postgres
        install_postgres:
            ExecShell "open" "https://www.postgresql.org/download/windows/"
            MessageBox MB_OK "Please install PostgreSQL and run this installer again."
        skip_postgres:
    ${EndIf}
SectionEnd

; Uninstaller
Section "Uninstall"
    ; Remove shortcuts
    Delete "$DESKTOP\${APPNAME}.lnk"
    Delete "$SMPROGRAMS\${COMPANYNAME}\${APPNAME}\${APPNAME}.lnk"
    RMDir "$SMPROGRAMS\${COMPANYNAME}\${APPNAME}"
    
    ; Remove registry keys
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}"
    DeleteRegKey HKLM "Software\${COMPANYNAME}\${APPNAME}"
    
    ; Remove files
    RMDir /r "$INSTDIR"
SectionEnd