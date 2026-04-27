"""Gunicorn configuration for Render deployment."""
import os
import multiprocessing

bind = "0.0.0.0:8000"
backlog = 2048
workers = max(2, multiprocessing.cpu_count())
worker_class = "sync"
worker_connections = 1000

# Critical: Timeout must be longer than blockchain operations (300s × 3 + retries)
timeout = 600  # 10 minutes
graceful_timeout = 30
keepalive = 2

accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" (%(D)s)'

daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

keyfile = None
certfile = None

wsgi_app = "backend.app:create_app()"
preload_app = False
proc_name = "skyplan-backend"

def on_starting(server):
    print("[Gunicorn] Starting SkyPlan backend - timeout=600s for blockchain operations")
