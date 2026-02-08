# Server entry point - imports from main.py
import sys
import os

# Add parent directory to path to import main
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

# Re-export app for uvicorn
__all__ = ['app']
