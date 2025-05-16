python = .venv/bin/python

run_backend:
	cd backend && $(python) manage.py runserver