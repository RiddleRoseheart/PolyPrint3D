@echo off

:: Create .env if it doesn't exist
IF NOT EXIST .env (
    IF EXIST .env.template (
        copy .env.template .env
        echo Created .env from template
    ) ELSE (
        echo Warning: No .env.template found
    )
)

:: Create and activate virtual environment
python -m venv venv --clear
call venv\Scripts\activate.bat

:: Install requirements
python -m pip install -r requirements.txt

:: Set Flask environment variables
set FLASK_APP=backend/main.py
set FLASK_ENV=development

:: Run Flask
python -m flask run