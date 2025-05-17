FROM python:3.12-slim-bookworm

WORKDIR /app

# Install OS dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*


# The installer requires curl (and certificates) to download the release archive
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates

# Download the latest installer
ADD https://astral.sh/uv/install.sh /uv-installer.sh

# Run the installer then remove it
RUN sh /uv-installer.sh && rm /uv-installer.sh

# Ensure the installed binary is on the `PATH`
ENV PATH="/root/.local/bin/:$PATH"

COPY . .

RUN uv pip install --system -e .

# Django management commands
# Create a script to run migrations and create superuser in a standard location
RUN echo "#!/bin/sh" > /usr/local/bin/entrypoint.sh && \
    echo "set -e" >> /usr/local/bin/entrypoint.sh && \
    echo "echo 'Running Django migrations...'" >> /usr/local/bin/entrypoint.sh && \
    echo "python manage.py makemigrations" >> /usr/local/bin/entrypoint.sh && \
    echo "python manage.py migrate" >> /usr/local/bin/entrypoint.sh && \
    echo "echo 'Creating Django superuser (if it does not exist)...'" >> /usr/local/bin/entrypoint.sh && \
    echo "echo \"from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(email='admin@gmail.com').exists() or User.objects.create_superuser('admin', 'admin@gmail.com', 'Admin@123')\" | python manage.py shell" >> /usr/local/bin/entrypoint.sh && \
    echo "echo 'Starting Django development server on 0.0.0.0:8000...'" >> /usr/local/bin/entrypoint.sh && \
    # echo "daphne -b 0.0.0.0 -p 8000 rtsppy.asgi:application" >> /usr/local/bin/entrypoint.sh && \
    echo "uv run python manage.py runserver 0.0.0.0:8000" >> /usr/local/bin/entrypoint.sh && \
    chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"] 