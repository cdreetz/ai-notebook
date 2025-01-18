export type CellType = 'code' | 'markdown';

export interface Cell {
  id: string;
  type: CellType;
  content: string;
  output?: string;
  rawOutput?: any;
  hasBeenExecuted?: boolean;
  isExecuting?: boolean;
  error?: string;
}

export interface NotebookState {
  variables: { [key: string]: any };
  methods: string[];
  imports: string[];
}

export interface NotebookMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notebook {
  metadata: NotebookMetadata;
  cells: Cell[];
  state: NotebookState;
}

export interface ExecutionResult {
  output?: string;
  rawOutput?: any;
  error?: string;
}

export interface CodeAnalysis {
  variables: { [key: string]: string };
  methods: string[];
  imports: string[];
}
