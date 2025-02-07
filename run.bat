@echo off
call venv\Scripts\activate
set FLASK_APP=backend.main
flask run