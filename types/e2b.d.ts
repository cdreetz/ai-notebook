declare module '@e2b/code-interpreter' {
  export class Sandbox {
    static create(): Promise<Sandbox>;
    
    runCode(code: string): Promise<{
      logs: {
        stdout: string[];
        stderr: string[];
      };
      error?: string;
      results: any[];
      executionCount: number;
    }>;
    
    files: {
      list(path: string): Promise<string[]>;
    };
  }
} 