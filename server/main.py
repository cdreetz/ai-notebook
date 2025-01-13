from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import jupyter_client
import asyncio
from typing import Dict, Optional
from queue import Empty
import subprocess
import sys
import os
from pathlib import Path
import json
import platform

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store kernel managers
kernel_managers: Dict[str, jupyter_client.KernelManager] = {}

# Get the absolute path to the virtual environment
VENV_PATH = str(Path(__file__).parent.parent / 'env')
VENV_BIN = 'Scripts' if sys.platform == 'win32' else 'bin'
VENV_PYTHON = str(Path(VENV_PATH) / VENV_BIN / ('python.exe' if sys.platform == 'win32' else 'python'))
VENV_PIP = str(Path(VENV_PATH) / VENV_BIN / ('pip.exe' if sys.platform == 'win32' else 'pip'))

# Ensure we're using the virtual environment
if not os.environ.get('VIRTUAL_ENV'):
    os.environ['VIRTUAL_ENV'] = VENV_PATH
    os.environ['PATH'] = f"{os.path.join(VENV_PATH, VENV_BIN)}{os.pathsep}{os.environ['PATH']}"
    sys.prefix = VENV_PATH

class ExecuteRequest(BaseModel):
    type: str
    content: str
    session_id: str = 'default'

class PackageRequest(BaseModel):
    package_name: str
    session_id: str = 'default'

def initialize_kernel(session_id: str = 'default'):
    if session_id not in kernel_managers:
        km = jupyter_client.KernelManager(kernel_name='python3')
        km.start_kernel()
        kernel_managers[session_id] = km
        print(f"Initialized kernel for session {session_id}")
        
        # Test the kernel
        kc = km.client()
        msg_id = kc.execute('print("Kernel test")')
        while True:
            try:
                msg = kc.get_iopub_msg(timeout=1)
                if msg['parent_header'].get('msg_id') == msg_id:
                    if msg['msg_type'] == 'stream':
                        print(f"Kernel test output: {msg['content']['text']}")
                    elif msg['msg_type'] == 'status' and msg['content']['execution_state'] == 'idle':
                        break
            except Empty:
                break
        kc.stop_channels()

@app.on_event("startup")
async def startup_event():
    initialize_kernel()
    print("Default kernel initialized")

@app.post("/execute")
async def execute_code(request: ExecuteRequest):
    try:
        # Get or create kernel manager for this session
        if request.session_id not in kernel_managers:
            initialize_kernel(request.session_id)
        
        km = kernel_managers[request.session_id]
        kc = km.client()
        
        # Execute the code
        msg_id = kc.execute(request.content)
        
        # Get the response
        output_parts = []
        display_data = None
        
        while True:
            try:
                msg = kc.get_iopub_msg(timeout=10)
                if msg['parent_header'].get('msg_id') != msg_id:
                    continue

                msg_type = msg['msg_type']
                content = msg['content']

                print(f"Message type: {msg_type}, Content: {content}")  # Debug log

                if msg_type == 'stream':
                    output_parts.append(content['text'])
                elif msg_type == 'execute_result':
                    if 'text/plain' in content.get('data', {}):
                        output_parts.append(content['data']['text/plain'])
                elif msg_type == 'display_data':
                    # For matplotlib plots, return the display_data directly
                    if 'image/png' in content.get('data', {}):
                        display_data = content
                elif msg_type == 'error':
                    raise Exception('\n'.join(content['traceback']))
                elif msg_type == 'status' and content['execution_state'] == 'idle':
                    break
            except Empty:
                break

        kc.stop_channels()
        
        # If we have display_data (matplotlib output), return that
        if display_data:
            # Extract just the data we need
            plot_data = {
                "data": display_data.get('data', {}),
                "metadata": display_data.get('metadata', {})
            }
            return {
                "status": "success",
                "output": plot_data  # FastAPI will handle the JSON serialization
            }
        
        # Otherwise return regular output
        return {
            "status": "success",
            "output": ''.join(output_parts)
        }
    
    except Exception as e:
        print(f"Error executing code: {str(e)}")  # Debug log
        return {
            "status": "error",
            "error": str(e)
        }

@app.post("/install-package")
async def install_package(request: PackageRequest):
    try:
        # Use the virtual environment's pip
        process = subprocess.Popen(
            [VENV_PIP, "install", request.package_name],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env={
                'PATH': f"{os.path.join(VENV_PATH, VENV_BIN)}{os.pathsep}{os.environ['PATH']}",
                'VIRTUAL_ENV': VENV_PATH
            }
        )
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to install package: {stderr.decode()}"
            )
            
        # Restart the kernel to make new package available
        if request.session_id in kernel_managers:
            km = kernel_managers[request.session_id]
            km.restart_kernel()
            
        return {
            "status": "success",
            "message": f"Successfully installed {request.package_name}"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error installing package: {str(e)}"
        )

@app.get("/list-packages")
async def list_packages():
    try:
        # Get installed packages
        process = subprocess.Popen(
            [VENV_PIP, "list", "--format=json"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env={
                'PATH': f"{os.path.join(VENV_PATH, VENV_BIN)}{os.pathsep}{os.environ['PATH']}",
                'VIRTUAL_ENV': VENV_PATH
            }
        )
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to list packages: {stderr.decode()}"
            )
        
        # Format package list nicely
        packages_list = json.loads(stdout.decode())
        formatted_packages = "\n".join(
            f"{pkg['name']}=={pkg['version']}" 
            for pkg in sorted(packages_list, key=lambda x: x['name'].lower())
        )
            
        return {
            "status": "success",
            "venv_path": VENV_PATH,
            "python_version": f"Python {platform.python_version()}",
            "packages": formatted_packages
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error listing packages: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 