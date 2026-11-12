# Keeps the WSL distro running so its systemd timer (deploy/systemd/) fires: WSL stops a distro with no process attached.
# Register once, in a normal (non-elevated) PowerShell:
#   schtasks /Create /TN "grivei-keep-wsl-up" /SC ONLOGON /TR "powershell.exe -NoProfile -WindowStyle Hidden -File C:\path\to\keep-wsl-up.ps1" /F
# Remove with: schtasks /Delete /TN "grivei-keep-wsl-up" /F
param([string]$Distro = "Ubuntu")
# `sleep infinity` holds the distro open; when it exits (wsl --shutdown, an update) start it again after a minute
while ($true) {
    wsl.exe -d $Distro --exec sleep infinity
    Start-Sleep -Seconds 60
}
