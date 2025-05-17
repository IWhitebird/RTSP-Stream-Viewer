PYTHON = .venv/bin/python

run: run_backend run_frontend

run_backend:
	$(PYTHON) manage.py runserver &

run_frontend:
	cd ui && npm run dev
