@echo off
rem Creates static copies of the PHP pages so the site can be hosted WITHOUT PHP (Vercel, Netlify, GitHub Pages...).
rem Run this again after you edit a page, includes\ or any file in the data folder.
rem NOTE: the quote form needs api\quote.php, which only works where PHP runs (XAMPP / a PHP host). On a static host the form
rem shows its "could not send" state and nothing is claimed as received.
set PHP="C:\xampp\php\php.exe"
%PHP% "%~dp0index.php" > "%~dp0index.html"
if errorlevel 1 goto fail
if not exist "%~dp0how-it-works" mkdir "%~dp0how-it-works"
if not exist "%~dp0truck-sizes" mkdir "%~dp0truck-sizes"
%PHP% "%~dp0how-it-works\index.php" > "%~dp0how-it-works\index.html"
if errorlevel 1 goto fail
%PHP% "%~dp0truck-sizes\index.php" > "%~dp0truck-sizes\index.html"
if errorlevel 1 goto fail
echo Created index.html, how-it-works\index.html and truck-sizes\index.html
goto end
:fail
echo Export failed. Check that PHP exists at C:\xampp\php\php.exe
:end
pause
