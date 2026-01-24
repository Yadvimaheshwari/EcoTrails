#!/bin/bash
# Start EcoAtlas Backend Server

cd "$(dirname "$0")"

# Activate virtual environment
if [ -d ".venv" ]; then
    source .venv/bin/activate
else
    echo "Virtual environment not found. Creating..."
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
fi

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check for API key
if [ -z "$API_KEY" ]; then
    echo "Warning: API_KEY not set. Set it in .env file or export it."
fi

# Initialize database
echo "Initializing database..."
python3 -c "import sys; sys.path.insert(0, '.'); from backend.database import init_db; init_db()"

# Start server
echo "Starting EcoAtlas backend server..."
echo "Backend will be available at: http://localhost:8000"
echo "API docs at: http://localhost:8000/docs"
echo ""
.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload
