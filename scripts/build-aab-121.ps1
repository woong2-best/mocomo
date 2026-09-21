$ErrorActionPreference = "Continue"
$env:TEMP = "C:\dev\tmp-expo"
$env:TMP = $env:TEMP
$env:GRADLE_USER_HOME = "C:\dev\gradle-home"
if (Test-Path "C:\Android\Sdk") {
  $env:ANDROID_HOME = "C:\Android\Sdk"
  $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
}
if (Test-Path "C:\Program Files\Android\Android Studio\jbr") {
  $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
}
$env:CI = "1"
New-Item -ItemType Directory -Force -Path C:\dev\tmp-expo, C:\dev\gradle-home | Out-Null

Set-Location C:\dev\mocomo
"=== SOURCE VERSIONS ===" | Tee-Object -FilePath C:\dev\tmp-expo\aab-121.txt
Select-String -Path apps\mobile\android\app\build.gradle -Pattern 'versionCode|versionName' | ForEach-Object { $_.Line } | Tee-Object -FilePath C:\dev\tmp-expo\aab-121.txt -Append

cmd /c "npm run mobile:build:play:aab > C:\dev\tmp-expo\aab-121-build.log 2>&1"
$buildExit = $LASTEXITCODE
Get-Content C:\dev\tmp-expo\aab-121-build.log | Tee-Object -FilePath C:\dev\tmp-expo\aab-121.txt -Append
"EXIT=$buildExit" | Tee-Object -FilePath C:\dev\tmp-expo\aab-121.txt -Append

if ($buildExit -ne 0) { exit $buildExit }

if (Test-Path MoCoMo-1.0.121-play.aab) {
  $f = Get-Item MoCoMo-1.0.121-play.aab
  "AAB=$($f.FullName) SIZE=$($f.Length) TIME=$($f.LastWriteTime)" | Tee-Object -FilePath C:\dev\tmp-expo\aab-121.txt -Append
} else {
  "AAB_MISSING" | Tee-Object -FilePath C:\dev\tmp-expo\aab-121.txt -Append
  exit 1
}
