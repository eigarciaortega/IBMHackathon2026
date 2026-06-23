"""Run this service's tests with: `cd room-service && python -m pytest`
(each microservice is tested in its own process since they share module
names like main.py/models.py and a shared SQLAlchemy declarative Base)."""

import os
import sys

SERVICE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT_DIR = os.path.dirname(SERVICE_DIR)

for path in (SERVICE_DIR, ROOT_DIR):
    if path not in sys.path:
        sys.path.insert(0, path)
