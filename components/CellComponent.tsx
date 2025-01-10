import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { Cell } from '@/types/notebook';
import { ArrowRightCircleIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

interface CellComponentProps {
  cell: Cell;
  index: number;
  updateContent: (id: string, content: string) => void;
  executeCell: (id: string) => void;
  deleteCell: (id: string) => void;
  moveCellUp: () => void;
  moveCellDown: () => void;
  addContextToChat: (content: string, type: 'code' | 'output') => void;
}

const CellComponent: React.FC<CellComponentProps> = ({
  cell,
  index,
  updateContent,
  executeCell,
  deleteCell,
  moveCellUp,
  moveCellDown,
  addContextToChat,
}) => {
  const renderOutput = (output: string) => {
    // Check if the output is a base64 image (matplotlib output)
    if (output.includes('data:image/png;base64,')) {
      return (
        <Image 
          src={output} 
          alt="Plot output" 
          className="max-w-full h-auto my-2"
          style={{ maxHeight: '500px' }} // Limit the height of matplotlib outputs
        />
      );
    }
    
    // Regular text output
    return output;
  };

  return (
    <div className="mb-8 relative">
      <div className="flex items-center justify-between text-gray-500 text-sm mb-1">
        <span>In [{index + 1}]:</span>
        <div className="space-x-2">
          <button
            onClick={moveCellUp}
            className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
          >
            ↑
          </button>
          <button
            onClick={moveCellDown}
            className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
          >
            ↓
          </button>
          <button
            onClick={() => deleteCell(cell.id)}
            className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
          {cell.type === 'code' && (
            <button
              onClick={() => executeCell(cell.id)}
              className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Run
            </button>
          )}
        </div>
      </div>
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <CodeMirror
          value={cell.content}
          height="auto"
          minHeight="50px"
          extensions={[
            cell.type === 'code' ? python() : markdown(),
            EditorView.lineWrapping,
          ]}
          onChange={(value) => updateContent(cell.id, value)}
          theme={vscodeDark}
          className="text-sm"
        />
      </div>
      <div className="absolute right-[-30px] top-1/2 transform -translate-y-1/2">
        <button
          onClick={() => addContextToChat(cell.content, 'code')}
          className="text-green-500 hover:text-green-600 transition-colors"
          title="Add code to chat context"
        >
          <ArrowRightCircleIcon className="h-6 w-6" />
        </button>
      </div>
      {cell.output && (
        <div className="mt-2 relative">
          <div className="text-gray-500 text-sm mb-1">Out [{index + 1}]:</div>
          <div className={`p-3 rounded-lg text-sm overflow-x-auto border ${
            cell.output.startsWith('Error') ? 'bg-red-100 text-red-800 border-red-300' : 'bg-white text-gray-800 border-gray-300'
          }`}>
            {renderOutput(cell.output)}
          </div>
          <div className="absolute right-[-30px] top-1/2 transform -translate-y-1/2">
            <button
              onClick={() => addContextToChat(cell.output, 'output')}
              className="text-green-500 hover:text-green-600 transition-colors"
              title="Add output to chat context"
            >
              <ArrowRightCircleIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CellComponent;
