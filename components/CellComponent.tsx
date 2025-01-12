import React, { useCallback, useRef, useState, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView, keymap } from '@codemirror/view';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { Cell } from '@/types/notebook';
import { ArrowRightCircleIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { Message, useCompletion } from 'ai/react';
import { Prec } from '@codemirror/state';
import { EditorSelection } from '@codemirror/state';
import { ansiToHtml } from 'ansi-to-html';
// import { useTheme } from '@/contexts/ThemeContext';

interface CellComponentProps {
  cell: Cell;
  index: number;
  updateContent: (id: string, content: string, clearOutput?: boolean) => void;
  executeCell: (id: string) => void;
  deleteCell: (id: string) => void;
  moveCellUp: () => void;
  moveCellDown: () => void;
  addContextToChat: (content: string, type: 'code' | 'output') => void;
  cursorPosition?: number;
  isActive: boolean;
  setActiveCell: (id: string) => void;
  moveToPreviousCell?: () => void;
  moveToNextCell?: () => void;
}

const stripAnsiCodes = (str: string) => {
  // This regex matches all ANSI escape sequences including color codes, cursor movements, etc.
  return str.replace(
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, 
    ''
  ).replace(/\[38;5;\d+m/g, '') // Remove color codes like [38;5;250m
   .replace(/\[\d+;\d+;\d+m/g, '') // Remove codes like [1;32m
   .replace(/\[\d+m/g, ''); // Remove simple codes like [0m
};

const CellComponent: React.FC<CellComponentProps> = ({
  cell,
  index,
  updateContent,
  executeCell,
  deleteCell,
  moveCellUp,
  moveCellDown,
  addContextToChat,
  isActive,
  setActiveCell,
  moveToPreviousCell,
  moveToNextCell,
}) => {
  // const { theme } = useTheme();
  
  //const themeStyles = {
  //  cell: theme === 'dark' ? 'bg-[#242424] border-[#333333]' : 'bg-white border-gray-200',
  //  button: theme === 'dark' ? 'bg-[#2a2a2a] hover:bg-[#333333]' : 'bg-gray-100 hover:bg-gray-200',
  //};

  const editorRef = useRef<any>(null);
  const [cursorPos, setCursorPos] = useState<number>(0);
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [isCodeCollapsed, setIsCodeCollapsed] = useState(false);
  const [isOutputCollapsed, setIsOutputCollapsed] = useState(false);

  const { completion, input, handleInputChange, handleSubmit, isLoading: isGenerateLoading } = useCompletion({
    api: '/api/generate',
    onResponse: async (response: Response) => {
      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            if (line.startsWith('0:')) {
              try {
                const content = JSON.parse(line.slice(2));
                const editor = editorRef.current?.view;
                if (editor) {
                  // Always append to the end of the current content
                  const currentLength = editor.state.doc.length;
                  const transaction = editor.state.update({
                    changes: { from: currentLength, insert: content }
                  });
                  editor.dispatch(transaction);
                  updateContent(cell.id, editor.state.doc.toString());
                }
              } catch (e) {
                console.error('Failed to parse chunk:', e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },
    onFinish: (prompt: string, completion: string) => {
      console.log('Stream finished');
    }
  });

  const { completion: editCompletion, input: editInput, handleInputChange: handleEditInputChange, handleSubmit: handleEditSubmit, isLoading: isEditLoading } = useCompletion({
    api: '/api/edit',
    body: { selectedCode },
    onResponse: async (response: Response) => {
      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let insertPos = cursorPos; // Keep track of where to insert next token
      
      try {
        // First, delete the selected code
        const editor = editorRef.current?.view;
        if (editor) {
          const docLength = editor.state.doc.length;
          const from = Math.min(cursorPos, docLength);
          const to = Math.min(cursorPos + selectedCode.length, docLength);
          
          const deleteTransaction = editor.state.update({
            changes: { from, to, insert: '' }
          });
          editor.dispatch(deleteTransaction);
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            if (line.startsWith('0:')) {
              try {
                const content = JSON.parse(line.slice(2));
                if (editor) {
                  const transaction = editor.state.update({
                    changes: { from: insertPos, insert: content }
                  });
                  editor.dispatch(transaction);
                  insertPos += content.length; // Update insert position
                  updateContent(cell.id, editor.state.doc.toString());
                }
              } catch (e) {
                console.error('Failed to parse chunk:', e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    }
  });

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedCode) {
      // Use edit completion for selected code
      handleEditSubmit(e);
    } else {
      // Use regular completion for code generation
      handleSubmit(e);
    }
    
    setShowPromptDialog(false);
    setSelectedCode(''); // Reset selected code
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submission
    setShowPromptDialog(false);
  };

  const [showPromptDialog, setShowPromptDialog] = useState(false);

  const handleKeyDown = useCallback(async (event: React.KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey)) {
      switch (event.key) {
        case 'Enter':
          event.preventDefault();
          event.stopPropagation();
          executeCell(cell.id);
          return false;
        case 'k':
          event.preventDefault();
          const editor = editorRef.current?.view;
          if (editor) {
            // Get the current selection
            const selection = editor.state.selection.main;
            const selectedText = editor.state.sliceDoc(selection.from, selection.to);
            
            // Store both cursor position and selected text
            setCursorPos(selection.from);
            setSelectedCode(selectedText);
            
            setShowPromptDialog(true);
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          moveToPreviousCell?.();
          break;
        case 'ArrowDown':
          event.preventDefault();
          moveToNextCell?.();
          break;
      }
    }
  }, [moveToPreviousCell, moveToNextCell, executeCell, cell.id]);

  const handlePromptKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePromptSubmit(e);
    }
  };

  const renderOutput = (output: string | any) => {
    // If output is null or undefined, return empty
    if (output == null) {
      return null;
    }

    // For matplotlib plots
    if (typeof output === 'object' && output.data && output.data['image/png']) {
      return (
        <div className="flex flex-col items-center gap-2">
          {output.data['text/plain'] && (
            <div className="text-sm text-gray-400">
              {output.data['text/plain']}
            </div>
          )}
          <img 
            src={`data:image/png;base64,${output.data['image/png']}`}
            alt="Plot output" 
            className="max-w-full h-auto"
            style={{ maxHeight: '500px' }}
            onError={(e) => console.error('Image load error:', e)}
          />
        </div>
      );
    }

    // For regular string output
    if (typeof output === 'string') {
      // Handle error output
      if (output.includes('---------------------------------------------------------------------------') || 
          output.includes('Traceback')) {
        const cleanOutput = stripAnsiCodes(output)
          .replace(/Cell In\[\d+\], line \d+/, (match) => `\n${match}`)
          .replace(/File ".*?", line \d+/, (match) => `\n${match}`)
          .replace(/\n+/g, '\n')
          .trim();

        return (
          <div className="overflow-x-auto">
            <pre className="whitespace-pre font-mono text-sm text-red-400" style={{ display: 'inline-block' }}>
              {cleanOutput.split('\n').map((line, i) => {
                if (line.includes('Traceback (most recent call last)')) {
                  return <div key={i} className="text-yellow-400">{line}</div>;
                }
                if (line.startsWith('  File "') || line.startsWith('Cell In[')) {
                  return <div key={i} className="text-gray-400">{line}</div>;
                }
                if (line.match(/^[A-Za-z]+Error:/)) {
                  return <div key={i} className="text-red-500 font-bold">{line}</div>;
                }
                return <div key={i}>{line}</div>;
              })}
            </pre>
          </div>
        );
      }

      // Handle structured data output
      if (output.includes('\n') || output.includes('\t')) {
        const cleanOutput = stripAnsiCodes(output);
        return (
          <div className="overflow-x-auto">
            <pre className="whitespace-pre font-mono text-sm" style={{ display: 'inline-block' }}>
              {cleanOutput}
            </pre>
          </div>
        );
      }

      // Handle regular output with ANSI codes
      try {
        const converter = new ansiToHtml({
          newline: true,
          escapeXML: true,
          colors: {
            0: '#fff',
            1: '#fff',
            31: '#f87171',
            32: '#4ade80',
            33: '#fbbf24',
            34: '#60a5fa',
            35: '#e879f9',
            36: '#22d3ee',
          }
        });
        const htmlOutput = converter.toHtml(output);
        return (
          <div className="overflow-x-auto">
            <div 
              className="font-mono whitespace-pre inline-block"
              dangerouslySetInnerHTML={{ __html: htmlOutput }} 
            />
          </div>
        );
      } catch (e) {
        // Fallback to plain text
        const cleanOutput = stripAnsiCodes(output);
        return (
          <div className="overflow-x-auto">
            <span className="font-mono whitespace-pre inline-block">{cleanOutput}</span>
          </div>
        );
      }
    }

    // For any other type of output, stringify it
    return (
      <div className="overflow-x-auto">
        <pre className="whitespace-pre font-mono text-sm">
          {JSON.stringify(output, null, 2)}
        </pre>
      </div>
    );
  };

  // Focus the editor when the cell becomes active
  useEffect(() => {
    if (isActive) {
      setTimeout(() => {
        const editor = editorRef.current?.view;
        if (editor) {
          editor.focus();
        }
      }, 50);
    }
  }, [isActive]);

  const handlePromptInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedCode) {
      handleEditInputChange(e);
    } else {
      handleInputChange(e);
    }
  };

  const isLoading = selectedCode ? isEditLoading : isGenerateLoading;

  const clearOutput = () => {
    updateContent(cell.id, cell.content, true);
  };

  return (
    <div 
      id={`cell-${cell.id}`}
      className="mb-8 relative group max-w-full"
    >
      <div className="flex gap-2 flex-col max-w-full">
        <div className="flex items-center justify-between text-gray-400 text-sm pr-8">
          <div className="flex items-center gap-2">
            <span>In [{index + 1}]:</span>
            <button
              onClick={() => setIsCodeCollapsed(!isCodeCollapsed)}
              className="p-1 hover:bg-[#333333] rounded"
              title={isCodeCollapsed ? "Expand code" : "Collapse code"}
            >
              {isCodeCollapsed ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronUpIcon className="h-4 w-4" />
              )}
            </button>
          </div>
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
        <div className="flex gap-2 items-stretch max-w-full">
          <div className="flex-1 min-w-0">
            <div className={`flex gap-2 max-w-full ${isCodeCollapsed ? 'hidden' : ''}`}>
              <div className="flex-1 min-w-0 border border-[#333333] rounded-lg overflow-hidden bg-[#242424]">
                <CodeMirror
                  ref={editorRef}
                  value={cell.content}
                  height="auto"
                  minHeight="50px"
                  extensions={[
                    cell.type === 'code' ? python() : markdown(),
                    EditorView.lineWrapping,
                    Prec.highest(keymap.of([
                      {
                        key: 'Mod-Enter',
                        run: (view) => {
                          executeCell(cell.id);
                          return true;
                        },
                        preventDefault: true
                      }
                    ]))
                  ]}
                  onChange={(value) => updateContent(cell.id, value)}
                  theme={vscodeDark}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setActiveCell(cell.id)}
                  className={`text-sm overflow-x-auto ${isActive ? 'ring-2 ring-blue-500' : ''}`}
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
                <div className="flex items-center justify-between text-gray-400 text-sm mb-1 pr-8">
                  <div className="flex items-center gap-2">
                    <span>Out [{index + 1}]:</span>
                    <button
                      onClick={() => setIsOutputCollapsed(!isOutputCollapsed)}
                      className="p-1 hover:bg-[#333333] rounded"
                      title={isOutputCollapsed ? "Expand output" : "Collapse output"}
                    >
                      {isOutputCollapsed ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronUpIcon className="h-4 w-4" />}
                    </button>
                  </div>
                  <button
                    onClick={clearOutput}
                    className="px-2 py-1 text-xs bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition-colors"
                  >
                    Clear Output
                  </button>
                </div>
                <div className={`flex gap-2 max-w-full ${isOutputCollapsed ? 'hidden' : ''}`}>
                  <div className={`flex-1 min-w-0 p-3 rounded-lg text-sm border ${
                    typeof cell.output === 'string' && cell.output.startsWith('Error')
                      ? 'bg-red-900/30 text-red-200 border-red-900/50' 
                      : 'bg-[#242424] text-gray-100 border-[#333333]'
                  }`}>
                    <div className="overflow-x-auto">
                      {renderOutput(cell.output)}
                    </div>
                  </div>
                  <div className="pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => cell.output && addContextToChat(cell.output, 'output')}
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
      
      {showPromptDialog && (
        <div className="absolute left-0 right-8 mt-2 z-10">
          <div className="bg-[#242424] p-4 rounded-lg border border-[#333333] w-full">
            <form onSubmit={handlePromptSubmit}>
              <input
                type="text"
                value={selectedCode ? editInput : input}
                onChange={handlePromptInputChange}
                onKeyDown={handlePromptKeyDown}
                placeholder="Describe the code you want to generate..."
                className="w-full p-2 bg-[#1a1a1a] border border-[#333333] rounded mb-4"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 rounded hover:bg-emerald-700"
                >
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CellComponent;
