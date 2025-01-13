import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';

interface ExecuteMessage {
  type: 'execute';
  content: string;
}

interface ExecutionResult {
  type: 'execution_result';
  content: {
    status: 'success' | 'error';
    output?: string;
    error?: string;
  };
}

// Initialize WebSocket server if it doesn't exist
let wss: WebSocketServer;
if (!(global as any).wss) {
  (global as any).wss = new WebSocketServer({ 
    port: 3001
  });

  // Set up WebSocket server event handlers
  (global as any).wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    console.log('Client connected');

    ws.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString()) as ExecuteMessage;
        if (data.type === 'execute') {
          const pythonResponse = await fetch('http://localhost:8000/execute', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });

          const result = await pythonResponse.json();
          const response: ExecutionResult = {
            type: 'execution_result',
            content: result
          };
          ws.send(JSON.stringify(response));
        }
      } catch (error) {
        console.error('Error processing message:', error);
        const errorResponse: ExecutionResult = {
          type: 'execution_result',
          content: {
            status: 'error',
            error: 'Failed to process execution request'
          }
        };
        ws.send(JSON.stringify(errorResponse));
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });

    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
    });
  });
}

export async function GET() {
  return new Response('Please connect to ws://localhost:3001 for WebSocket communication', {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}

export const dynamic = 'force-dynamic'; 