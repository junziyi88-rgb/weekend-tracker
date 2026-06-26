$ErrorActionPreference = "Stop"

$AppDir = Split-Path -Parent $PSScriptRoot
$HostAddress = "127.0.0.1"
$Port = 5173
$Url = "http://127.0.0.1:5173/"

function Test-WeekendTracker {
  $client = $null
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $connect = $client.BeginConnect($HostAddress, $Port, $null, $null)
    if (-not $connect.AsyncWaitHandle.WaitOne(600)) {
      return $false
    }

    $client.EndConnect($connect)
    return $true
  } catch {
    return $false
  } finally {
    if ($client) {
      $client.Close()
    }
  }
}

if (-not (Test-WeekendTracker)) {
  Start-Process -WindowStyle Minimized -FilePath "cmd.exe" -ArgumentList @(
    "/k",
    "cd /d `"$AppDir`" && npm run dev -- --host 127.0.0.1 --port 5173"
  )

  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 500
    if (Test-WeekendTracker) {
      break
    }
  }
}

Start-Process $Url
