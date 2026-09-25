# Local Play AAB — ASCII paths avoid prefab/CMake failures on Korean user profile paths.
$ErrorActionPreference = "Stop"
$mobile = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$root = (Resolve-Path (Join-Path $mobile "..\..")).Path
$tmp = Join-Path $root ".tmp-build"
$gradleHome = Join-Path $root ".gradle-local"

New-Item -ItemType Directory -Force -Path $tmp, $gradleHome | Out-Null

$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:GRADLE_USER_HOME = $gradleHome
$env:TEMP = $tmp
$env:TMP = $tmp
if (-not $env:ANDROID_HOME) {
  $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA "Android\Sdk"
}

Push-Location (Join-Path $mobile "android")
try {
  & .\gradlew.bat bundleRelease --no-daemon
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}

node (Join-Path $mobile "scripts\copy-play-aab.cjs")
