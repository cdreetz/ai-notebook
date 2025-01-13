from jupyter_client import KernelManager as JupyterKernelManager
from queue import Empty
import asyncio

class KernelManager:
    def __init__(self):
        self.kernels = {}  # session_id -> kernel mapping
        
    async def start_kernel(self, session_id: str):
        km = JupyterKernelManager()
        km.start_kernel()
        client = km.client()
        client.start_channels()
        
        self.kernels[session_id] = {
            'manager': km,
            'client': client
        }
        return self
        
    async def stop_kernel(self, session_id: str):
        if session_id in self.kernels:
            kernel = self.kernels[session_id]
            kernel['client'].stop_channels()
            kernel['manager'].shutdown_kernel()
            del self.kernels[session_id]
            
    async def execute_code(self, session_id: str, code: str):
        if session_id not in self.kernels:
            raise ValueError(f"No kernel found for session {session_id}")
            
        client = self.kernels[session_id]['client']
        msg_id = client.execute(code)
        
        # Collect output
        outputs = []
        while True:
            try:
                msg = client.get_iopub_msg(timeout=1)
                msg_type = msg['header']['msg_type']
                
                if msg_type == 'execute_result':
                    outputs.append(msg['content']['data'].get('text/plain', ''))
                elif msg_type == 'stream':
                    outputs.append(msg['content']['text'])
                elif msg_type == 'error':
                    return {
                        'status': 'error',
                        'error': '\n'.join(msg['content']['traceback'])
                    }
                    
                if msg_type == 'status' and msg['content']['execution_state'] == 'idle':
                    break
                    
            except Empty:
                break
                
        return {
            'status': 'success',
            'output': '\n'.join(outputs)
        } 