#!/bin/bash

# Check if env directory exists
if [ ! -d "env" ]; then
    echo "Creating new virtual environment..."
    python3 -m venv env
fi

source env/bin/activate
cd server
python main.py