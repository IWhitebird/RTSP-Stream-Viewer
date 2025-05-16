# RTSP Stream Viewer Backend

A Django backend for streaming RTSP video feeds to a web interface via WebSockets.

## Features

- Add and manage RTSP stream URLs through a REST API
- Stream video from RTSP sources to web clients using WebSockets
- Admin interface for stream management

## Requirements

- Python 3.10+
- OpenCV (for RTSP stream capture)
- Django 5.2+
- Channels for WebSocket support

## Setup

1. Install dependencies:

```bash
# Using pip
pip install -e .

# Or using uv
uv pip install -e .
```

2. Apply database migrations:

```bash
python manage.py migrate
```

3. Create a superuser (optional):

```bash
python manage.py createsuperuser
```

4. Start the development server:

```bash
python manage.py runserver
```

The server will be available at http://localhost:8000.

## API Endpoints

- `GET /api/streams/` - List all streams
- `POST /api/streams/` - Create a new stream
- `GET /api/streams/{id}/` - Get a specific stream
- `PUT /api/streams/{id}/` - Update a stream
- `DELETE /api/streams/{id}/` - Delete a stream
- `POST /api/streams/{id}/activate/` - Activate a stream
- `POST /api/streams/{id}/deactivate/` - Deactivate a stream

## WebSocket Endpoints

- `ws://localhost:8000/ws/stream/{stream_id}/` - Connect to a stream feed
