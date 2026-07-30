@echo off
rem ===========================================================================
rem survey-client.cmd - run tools\client-survey.py without typing a command
rem ===========================================================================
rem Drag a client folder onto this file in Explorer, or run:
rem
rem   tools\survey-client.cmd "C:\Games\EternalRO" "C:\Games\Ep4Client2\data.grf"
rem
rem The second argument is optional: a stock kRO archive to compare against. Give
rem it and the report gains the list of every file that client added or changed
rem over stock, which is the part worth having (docs/eternalro-recon.md).
rem ===========================================================================
setlocal

rem The report contains Korean archive paths and Thai config text. Without this
rem the console dies partway through printing one of them.
chcp 65001 >nul 2>nul

if "%~1"=="" (
  echo.
  echo   Drag the client folder onto this file, or run:
  echo.
  echo     tools\survey-client.cmd "C:\Games\EternalRO"
  echo     tools\survey-client.cmd "C:\Games\EternalRO" "C:\Games\Ep4Client2\data.grf"
  echo.
  pause
  exit /b 1
)

if not exist "%~1\" (
  echo.
  echo   Not a folder: %~1
  echo   Point this at the folder that holds the .exe and the .grf files.
  echo.
  pause
  exit /b 1
)

set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY (
  where python >nul 2>nul && set "PY=python"
)
if not defined PY (
  echo.
  echo   Python 3 was not found on PATH.
  echo   Install it from python.org, tick "Add python.exe to PATH", and re-run.
  echo.
  pause
  exit /b 1
)

set "OUT=%~dp0..\docs\recon\%~n1"

echo.
echo   client folder : %~1
if not "%~2"=="" echo   baseline      : %~2
echo   report to     : %OUT%
echo.

if "%~2"=="" (
  %PY% "%~dp0client-survey.py" "%~1" --out "%OUT%" --extract
) else (
  %PY% "%~dp0client-survey.py" "%~1" --out "%OUT%" --extract --baseline "%~2"
)

if errorlevel 1 (
  echo.
  echo   The survey did not finish. The error is above.
  echo.
  pause
  exit /b 1
)

echo.
echo   Done. Opening the report.
echo   Send report.md back; the manifests stay on this machine.
echo.
start "" notepad "%OUT%\report.md"
pause
