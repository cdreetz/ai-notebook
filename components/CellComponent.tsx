import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { Cell } from '@/types/notebook';
import { ArrowRightCircleIcon } from '@heroicons/react/24/outline';
// import { useTheme } from '@/contexts/ThemeContext';

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
  // const { theme } = useTheme();
  
  //const themeStyles = {
  //  cell: theme === 'dark' ? 'bg-[#242424] border-[#333333]' : 'bg-white border-gray-200',
  //  button: theme === 'dark' ? 'bg-[#2a2a2a] hover:bg-[#333333]' : 'bg-gray-100 hover:bg-gray-200',
  //};

  const renderOutput = (output: string) => {
    // Check if the output is a base64 image (matplotlib output)
    if (output.includes('data:image/png;base64,')) {
      return (
        <img 
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
    <div className="mb-8 relative group">
      <div className="flex gap-2 flex-col">
        <div className="flex items-center justify-between text-gray-400 text-sm pr-8">
          <span>In [{index + 1}]:</span>
          <div className="space-x-2">
            <button
              onClick={moveCellUp}
              className="px-2 py-1 bg-[#2a2a2a] rounded hover:bg-[#333333] transition-colors"
            >
              ↑
            </button>
            <button
              onClick={moveCellDown}
              className="px-2 py-1 bg-[#2a2a2a] rounded hover:bg-[#333333] transition-colors"
            >
              ↓
            </button>
            <button
              onClick={() => deleteCell(cell.id)}
              className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
            {cell.type === 'code' && (
              <button
                onClick={() => executeCell(cell.id)}
                className="px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
              >
                Run
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2 items-stretch">
          <div className="flex-1">
            <div className="flex gap-2">
              <div className="flex-1 border border-[#333333] rounded-lg overflow-hidden bg-[#242424]">
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
              <div className="pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => addContextToChat(cell.content, 'code')}
                  className="text-green-500 hover:text-green-600 transition-colors"
                  title="Add code to chat context"
                >
                  <ArrowRightCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            {cell.output && (
              <div className="mt-2">
                <div className="text-gray-400 text-sm mb-1">Out [{index + 1}]:</div>
                <div className="flex gap-2">
                  <div className={`flex-1 p-3 rounded-lg text-sm overflow-x-auto border ${
                    cell.output.startsWith('Error') 
                      ? 'bg-red-900/30 text-red-200 border-red-900/50' 
                      : 'bg-[#242424] text-gray-100 border-[#333333]'
                  }`}>
                    {renderOutput(cell.output)}
                  </div>
                  <div className="pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => addContextToChat(cell.output, 'output')}
                      className="text-green-500 hover:text-green-600 transition-colors"
                      title="Add output to chat context"
                    >
                      <ArrowRightCircleIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CellComponent;
