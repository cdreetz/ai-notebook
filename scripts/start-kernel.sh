#!/bin/bash

# Function to check Python version
check_python_version() {
    local python_cmd=$1
    local version=$($python_cmd -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
    local major=$(echo $version | cut -d. -f1)
    local minor=$(echo $version | cut -d. -f2)
    
    if [ "$major" -eq 3 ]; then
        if [ "$minor" -ge 9 ] && [ "$minor" -le 12 ]; then
            echo "compatible"
        else
            echo "incompatible"
        fi
    else
        echo "not_python3"
    fi
}

# Find Python version
PYTHON_CMD=""
TORCH_AVAILABLE=false

for cmd in "python3.12" "python3.11" "python3.10" "python3.9" "python3"; do
    if command -v $cmd >/dev/null 2>&1; then
        version_status=$(check_python_version $cmd)
        if [ "$version_status" = "compatible" ]; then
            PYTHON_CMD=$cmd
            TORCH_AVAILABLE=true
            break
        elif [ "$version_status" = "incompatible" ] && [ -z "$PYTHON_CMD" ]; then
            PYTHON_CMD=$cmd
        fi
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    echo "Error: Could not find Python 3. Please install Python 3.x."
    exit 1
fi

echo "Using Python version: $($PYTHON_CMD --version)"
if [ "$TORCH_AVAILABLE" = false ]; then
    echo "⚠️  Warning: Your Python version is not between 3.9-3.12."
    echo "   PyTorch will not be available. If you need PyTorch,"
    echo "   please install Python 3.9-3.12 and delete the 'env' directory."
fi

# Check if env directory exists
if [ ! -d "env" ]; then
    echo "Creating new virtual environment..."
    $PYTHON_CMD -m venv env || { echo "Failed to create virtual environment"; exit 1; }
    
    echo "Activating virtual environment..."
    source env/bin/activate || { echo "Failed to activate virtual environment"; exit 1; }
    
    echo "Installing dependencies..."
    pip install --upgrade pip || { echo "Failed to upgrade pip"; exit 1; }
    pip install fastapi uvicorn jupyter-client ipykernel pandas numpy matplotlib || { echo "Failed to install packages"; exit 1; }

    echo "Setting up ipykernel..."
    python -m ipykernel install --user --name=notebook-env --display-name="Notebook Environment" || { echo "Failed to install ipykernel"; exit 1; }
    
    echo "Setup completed successfully!"
else
    echo "Using existing virtual environment..."
    source env/bin/activate || { echo "Failed to activate existing environment"; exit 1; }
fi

# Export torch availability for the Python server to use
export TORCH_AVAILABLE=$TORCH_AVAILABLE

echo "Starting FastAPI server..."
cd server || { echo "Failed to change directory to server"; exit 1; }
python main.py