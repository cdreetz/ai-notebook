const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require("socket.io");
const fetch = require('node-fetch');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Track active executions
const activeExecutions = new Map();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
      methods: ["GET", "POST"],
      credentials: true,
      transports: ['websocket', 'polling']
    },
    pingTimeout: 120000,
    pingInterval: 30000,
    connectTimeout: 60000,
    allowEIO3: true
  });

  // Create notebook namespace
  const notebookNamespace = io.of('/notebook');

  notebookNamespace.on('connection', (socket) => {
    console.log('Notebook client connected:', socket.id);

    // Handle reconnection - resend any pending results
    const pendingResults = Array.from(activeExecutions.entries())
      .filter(([_, data]) => data.socketId === socket.id)
      .map(([executionId, data]) => ({ executionId, result: data.result }));

    if (pendingResults.length > 0) {
      console.log(`Resending ${pendingResults.length} pending results for socket ${socket.id}`);
    }

    pendingResults.forEach(({ executionId, result }) => {
      socket.emit(`execution_result_${executionId}`, result);
      socket.emit('execution_result', result);
      activeExecutions.delete(executionId);
    });

    socket.on('execute', async (data) => {
      console.log(`Received execute request from ${socket.id}:`, data);
      
      if (!data.content) {
        const errorResponse = {
          status: 'error',
          error: 'No code content provided'
        };
        socket.emit('execution_result', errorResponse);
        return;
      }

      // Store the execution request
      const executionId = data.executionId || Date.now().toString();
      activeExecutions.set(executionId, { socketId: socket.id });

      try {
        const pythonResponse = await fetch('http://localhost:8000/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'execute',
            content: data.content,
            session_id: socket.id
          }),
        });

        if (!pythonResponse.ok) {
          throw new Error(`Python server error: ${pythonResponse.statusText}`);
        }

        const result = await pythonResponse.json();
        console.log('Raw Python response:', result);  // Debug log

        // Store the result
        activeExecutions.set(executionId, { 
          socketId: socket.id, 
          result 
        });

        // Emit both specific and general results
        if (socket.connected) {
          console.log('Emitting result to client:', result);  // Debug log
          socket.emit(`execution_result_${executionId}`, result);
          socket.emit('execution_result', result);
        } else {
          console.log(`Socket ${socket.id} disconnected before receiving result`);
        }
      } catch (error) {
        console.error(`Error executing code for ${socket.id}:`, error);
        const errorResponse = {
          status: 'error',
          error: error.message || 'Failed to execute code'
        };
        
        if (socket.connected) {
          socket.emit(`execution_result_${executionId}`, errorResponse);
          socket.emit('execution_result', errorResponse);
        }
      } finally {
        // Clean up after sending the response
        setTimeout(() => {
          activeExecutions.delete(executionId);
        }, socket.connected ? 5000 : 30000); // Keep longer if disconnected
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`Client ${socket.id} disconnected. Reason:`, reason);
      
      if (reason === 'transport close' || reason === 'ping timeout') {
        const clientExecutions = Array.from(activeExecutions.entries())
          .filter(([_, data]) => data.socketId === socket.id);
          
        if (clientExecutions.length > 0) {
          console.log(`Preserving ${clientExecutions.length} executions for ${socket.id}`);
        }

        clientExecutions.forEach(([executionId, data]) => {
          setTimeout(() => {
            if (activeExecutions.has(executionId)) {
              console.log(`Cleaning up execution ${executionId} for ${socket.id}`);
              activeExecutions.delete(executionId);
            }
          }, 30000);
        });
      } else {
        // Clean up immediately for intentional disconnects
        const clientExecutions = Array.from(activeExecutions.entries())
          .filter(([_, data]) => data.socketId === socket.id)
          .forEach(([executionId, _]) => activeExecutions.delete(executionId));
      }
    });

    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  server.listen(3000, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3000');
  });
});