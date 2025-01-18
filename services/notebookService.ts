import { Cell, NotebookState, ExecutionResult } from '@/types/notebook';

export class NotebookService {
  static async executeCell(cell: Cell, state: NotebookState): Promise<{
    result: ExecutionResult;
    stateUpdate: Partial<NotebookState>;
  }> {
    if (cell.type !== 'code') {
      return { result: {}, stateUpdate: {} };
    }

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cell.content }),
      });

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      return {
        result: {
          output: result.output,
          rawOutput: result.rawOutput,
        },
        stateUpdate: {},
      };
    } catch (error) {
      return {
        result: {
          error: error instanceof Error ? error.message : 'Error executing cell',
        },
        stateUpdate: {},
      };
    }
  }
} 