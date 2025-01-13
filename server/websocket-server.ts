import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import cors from 'cors';
import express from 'express';

const app = express();

// Configure CORS
app.use(cors({
  origin: 'http://localhost:3000', // Your Next.js app's URL
  methods: ['GET', 'POST'],
  credentials: true
}));

// Health check endpoint
app.get('/', (req, res) => {
  res.send('WebSocket server is running');
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Track active connections
const connections = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected');
  connections.add(ws);

  // Send initial connection acknowledgment
  ws.send(JSON.stringify({
    type: 'connection_established',
    content: { status: 'success' }
  }));

  ws.on('message', async (message: Buffer) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received message:', data);

      if (data.type === 'execute') {
        try {
          const pythonResponse = await fetch('http://localhost:8000/execute', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });

          const result = await pythonResponse.json();
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'execution_result',
              content: result
            }));
          }
        } catch (error) {
          console.error('Error executing code:', error);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'execution_result',
              content: {
                status: 'error',
                error: 'Failed to execute code'
              }
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'execution_result',
          content: {
            status: 'error',
            error: 'Failed to process message'
          }
        }));
      }
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    connections.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    connections.delete(ws);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server is running on ws://localhost:${PORT}`);
}); 