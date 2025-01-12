import { Socket, io } from 'socket.io-client';

type MessageHandler = (data: any) => void;

interface ExecutionResult {
  status: 'success' | 'error';
  output?: string;
  error?: string;
}

export class NotebookWebSocket {
  private socket: Socket | null = null;
  private messageHandlers: Map<string, MessageHandler>;

  constructor() {
    this.messageHandlers = new Map();
    this.connect();
  }

  private connect() {
    if (this.socket?.connected) return;
    
    this.socket = io('http://localhost:3000/notebook', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 5000,
      reconnectionDelayMax: 30000,
      timeout: 20000,
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('Socket.IO connected with ID:', this.socket?.id);
    });

    this.socket.on('execution_result', (result: ExecutionResult) => {
      console.log('Raw execution result received:', result);  // Debug log
      const handler = this.messageHandlers.get('execution_result');
      if (handler) {
        handler(result);
      } else {
        console.warn('No handler registered for execution_result');
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });
  }

  executeCode(code: string): void {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return;
    }

    console.log('Sending execute request:', code);
    this.socket.emit('execute', {
      type: 'execute',
      content: code,
      executionId: Date.now().toString()
    });
  }

  onExecutionResult(handler: MessageHandler): void {
    this.messageHandlers.set('execution_result', handler);
  }

  close(): void {
    if (this.socket) {
      this.messageHandlers.clear();
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }
} 