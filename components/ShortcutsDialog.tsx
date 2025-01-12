import React from 'react';

interface ShortcutsDialogProps {
  onClose: () => void;
}

const ShortcutsDialog: React.FC<ShortcutsDialogProps> = ({ onClose }) => {
  const shortcuts = [
    { keys: ['⌘/Ctrl', 'Enter'], description: 'Execute current cell' },
    { keys: ['⌘/Ctrl', 'Shift', 'B'], description: 'Add code cell' },
    { keys: ['⌘/Ctrl', 'Shift', 'T'], description: 'Add text cell' },
    { keys: ['⌘/Ctrl', 'K'], description: 'AI code generation' },
    { keys: ['⌘/Ctrl', 'K', '{highlighted text}'], description: 'AI code edit' },
    { keys: ['⌘/Ctrl', '↑'], description: 'Move to previous cell' },
    { keys: ['⌘/Ctrl', '↓'], description: 'Move to next cell' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#242424] rounded-lg border border-[#333333] shadow-xl max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center p-6 border-b border-[#333333]">
          <h2 className="text-xl font-semibold text-white">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        
        <div className="p-6">
          <div className="grid gap-4">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex justify-between items-center">
                <div className="flex gap-2">
                  {shortcut.keys.map((key, keyIndex) => (
                    <kbd
                      key={keyIndex}
                      className="px-2 py-1 bg-[#1a1a1a] border border-[#333333] rounded text-sm text-white"
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
                <span className="text-gray-300">{shortcut.description}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-6 border-t border-[#333333] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsDialog; 