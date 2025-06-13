export class ModalClient {
    private baseUrl: string;
    
    constructor(baseUrl?: string) {
      // In development: localhost, in production: Modal sandbox URL
      this.baseUrl = baseUrl || (
        process.env.NODE_ENV === 'development' 
          ? 'http://localhost:8000'  // Local dev server
          : window.location.origin   // Modal sandbox serves both UI and API
      );
    }
  
    async executeCode(code: string, sandboxId?: string) {
      const response = await fetch(`${this.baseUrl}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, sandbox_id: sandboxId })
      });
      return response.json();
    }
  
    async createSandbox(config: any) {
      const response = await fetch(`${this.baseUrl}/api/sandboxes`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      return response.json();
    }
  }