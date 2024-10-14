import React from 'react';
import { CellType } from '@/types/notebook';

interface ToolbarProps {
  onAddCell: (type: CellType) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onAddCell }) => {
  return (
    <div className="mb-4 space-x-2">
      <button
        onClick={() => onAddCell('code')}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
      >
        + Code
      </button>
      <button
        onClick={() => onAddCell('markdown')}
        className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
      >
        + Markdown
      </button>
    </div>
  );
};

export default Toolbar;
