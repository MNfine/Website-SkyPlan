"""WSGI entry point for Gunicorn on Render."""

from backend.app import create_app

app = create_app()

if __name__ == '__main__':
    app.run()
