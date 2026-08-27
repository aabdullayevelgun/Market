# Quick test: does the WizarPOS Q2 terminal (connected on COM1 per the 1C
# config screenshot) just behave like a plain ESC/POS receipt printer over
# the same USB-serial link 1C uses? If so, no custom eKassam protocol is
# needed at all -- Zehra Market could print straight to it like any other
# receipt printer.
#
# IMPORTANT: close 1C first -- only one program can hold COM1 open at a time.
#
# Usage (from an elevated PowerShell):
#   powershell -ExecutionPolicy Bypass -File test-edv-escpos.ps1

$portName = "COM1"
$baud = 9600

Write-Host "Opening $portName at $baud baud..."
$port = New-Object System.IO.Ports.SerialPort $portName, $baud, ([System.IO.Ports.Parity]::None), 8, ([System.IO.Ports.StopBits]::One)
$port.ReadTimeout = 3000
$port.WriteTimeout = 3000

try {
    $port.Open()
} catch {
    Write-Host "COM1 acila bilmedi: $($_.Exception.Message)"
    Write-Host "Ehtimal ki, 1C (ve ya baska bir proqram) hele de portu tutub -- onu tam bagladigina emin ol."
    exit 1
}

# ESC @ = initialize printer
$init = [byte[]](0x1B, 0x40)
# Plain text line + line feed
$text = [System.Text.Encoding]::ASCII.GetBytes("ZEHRA MARKET TEST CEKI`n`n")
# GS V 0 = full cut (some printers use GS V 1 for partial cut instead)
$cut = [byte[]](0x1D, 0x56, 0x00)

Write-Host "ESC/POS test komandalari gonderilir..."
$port.Write($init, 0, $init.Length)
Start-Sleep -Milliseconds 200
$port.Write($text, 0, $text.Length)
Start-Sleep -Milliseconds 200
$port.Write($cut, 0, $cut.Length)

Start-Sleep -Milliseconds 500
Write-Host "Gonderildi. Terminal ekraninda ve ya kagizinda hansisa bir sey cixdimi?"

# Read back anything the terminal might respond with (some printers ack).
try {
    $resp = $port.ReadExisting()
    if ($resp) { Write-Host "Terminaldan cavab: $resp" }
} catch {}

$port.Close()
Write-Host "Bitdi."
