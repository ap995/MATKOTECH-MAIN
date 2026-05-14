@echo off
echo Starting local web server on port 3030...
echo.
echo If this fails, try installing Python or Node.js.
echo.
python -m http.server 3030 || npx http-server -p 3030 || echo "Neither Python nor Node.js is available. Just double-click index.html to open it directly!"
pause
