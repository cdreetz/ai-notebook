export type CellType = 'code' | 'markdown';

export interface Cell {
  id: string;
  type: CellType;
  content: string;
  output?: string;
}

export interface Notebook {
  id: string;
  name: string;
  createdAt: string;
  lastModified: string;
  cells: Cell[];
  metadata?: {
    kernelName?: string;
    kernelSpec?: {
      name: string;
      display_name: string;
      language: string;
    };
    customSettings?: {
      defaultCellType?: CellType;
      theme?: 'dark' | 'light';
    };
    context?: {
      methods: {
        name: string;
        inputs: string[];
        output: string;
        description: string;
      }[];
      variables: { [key: string]: string };
    };
  };
}
