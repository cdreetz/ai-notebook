import { Sandbox } from '@e2b/code-interpreter';

export interface ExecutionOutput {
  output: string;
  rawOutput?: any;
  error?: string;
}

export class PythonService {
  static async executeCode(code: string): Promise<ExecutionOutput> {
    try {
      const sandbox = await Sandbox.create();
      const execution = await sandbox.runCode(code);

      return { 
        output: execution.logs.stdout?.join('') || '',
        rawOutput: execution
      };
    } catch (error) {
      console.error('Sandbox error:', error);
      return { 
        output: '',
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      };
    }
  }
} 