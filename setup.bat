@echo off

IF NOT EXIST .env (
    IF EXIST .env.template (
        copy .env.template .env
        echo Created .env from template
    ) ELSE (
        echo Warning: No .env.template found
    )
)

python -m venv venv --clear
call venv\Scripts\activate
pip install -r requirements.txt
set FLASK_APP=backend.main
flask run