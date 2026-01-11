@echo off
REM Quick test runner for GalaCash API smoke tests (Windows)

echo =========================================
echo   GalaCash API - Smoke Test Runner
echo =========================================
echo.

REM Check if server is running
echo Checking API server...
curl -s -o NUL -w "%%{http_code}" "%BASE_URL%/auth/me" 2>NUL | findstr "401" >NUL
if %ERRORLEVEL% EQU 0 (
    echo [32m√[0m API server is running
) else (
    echo [33m![0m Warning: API server may not be running
    echo     Start the server with: npm run dev
    echo.
)

REM Set defaults if not provided
if not defined BASE_URL set BASE_URL=http://localhost:3000/api
if not defined USER_NIM set USER_NIM=1313600001
if not defined USER_PASSWORD set USER_PASSWORD=password123
if not defined BENDAHARA_NIM set BENDAHARA_NIM=1313699999
if not defined BENDAHARA_PASSWORD set BENDAHARA_PASSWORD=password123
if not defined VERBOSE set VERBOSE=0

echo Configuration:
echo   BASE_URL: %BASE_URL%
echo   VERBOSE:  %VERBOSE%
if defined SAVE_DIR echo   SAVE_DIR: %SAVE_DIR%
echo.

REM Run the tests
echo Running comprehensive smoke tests...
echo.
python scripts\endpoint_smoke.py

REM Exit with same code as test
exit /b %ERRORLEVEL%
