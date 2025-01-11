#!/bin/bash

# Check if env directory exists
if [ ! -d "env" ]; then
    echo "Creating new virtual environment..."
    python3 -m venv env
    
    # Activate and install base packages
    source env/bin/activate
    pip install --upgrade pip
    pip install fastapi uvicorn jupyter-client ipykernel pandas numpy matplotlib

    # Install the ipykernel for our environment
    python -m ipykernel install --user --name=notebook-env --display-name="Notebook Environment"
else
    source env/bin/activate
fi

# Start the FastAPI server
cd server
python main.py