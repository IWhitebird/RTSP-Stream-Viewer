PYTHON = .venv/bin/python

run: run_backend run_frontend

run_backend:
	fuser -k 8000/tcp || true
	$(PYTHON) manage.py runserver 0.0.0.0:8000 &

run_frontend:
	fuser -k 3000/tcp || true
	cd ui && bun run dev

build: run_backend

# build: build_frontend run_backend

build_frontend:
	cd ui && bun run build


local_loop_ffmpeg:
	cd demo_rtsp_server && ffmpeg -re -stream_loop -1 -i ./samples/input_files/sample.mp4 -c copy -f rtsp rtsp://localhost:8554/local-loop
	
rtsp_docker_server:
	cd demo_rtsp_server && docker compose up -d

# install_backend:
# 	uv pip install -e .

# install_frontend:
# 	cd ui && bun install
