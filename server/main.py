from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import jupyter_client
import asyncio
from typing import Dict, Optional
from queue import Empty

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

class ExecuteRequest(BaseModel):
    type: str
    content: str
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
                elif msg_type == 'error':
                    raise Exception('\n'.join(content['traceback']))
                elif msg_type == 'status' and content['execution_state'] == 'idle':
                    break
            except Empty:
                break

        kc.stop_channels()
        
        final_output = ''.join(output_parts)
        print(f"Final output: {final_output}")  # Debug log
        
        return {
            "status": "success",
            "output": final_output
        }
    
    except Exception as e:
        print(f"Error executing code: {str(e)}")  # Debug log
        return {
            "status": "error",
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 