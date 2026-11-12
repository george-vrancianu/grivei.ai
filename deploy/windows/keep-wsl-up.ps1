# Keeps the WSL distro running so its systemd timer (deploy/systemd/) fires: WSL stops a distro with no process attached.
# Register once, in a normal (non-elevated) PowerShell:
#   schtasks /Create /TN "grivei-keep-wsl-up" /SC ONLOGON /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\path\to\keep-wsl-up.ps1" /F
# -ExecutionPolicy Bypass matters: Windows client editions default to Restricted, which refuses to run a .ps1 and, in a hidden window, shows no error.
# Remove with: schtasks /Delete /TN "grivei-keep-wsl-up" /F
param([string]$Distro = "Ubuntu")
# `sleep infinity` holds the distro open; when it exits (wsl --shutdown, an update) start it again after a minute
while ($true) {
    wsl.exe -d $Distro --exec sleep infinity
    Start-Sleep -Seconds 60
}
