'use client';

import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Notebook } from '@/types/notebook';
import ShortcutsDialog from './ShortcutsDialog';

interface ToolbarProps {
  onAddCell: (type: 'code' | 'markdown') => void;
  onSaveNotebook: () => void;
  onCreateNewNotebook: () => void;
  onSelectNotebook: (notebook: string) => void;
  onManagePackages: () => void;
  notebooks: string[];
  currentNotebook: string;
  setShowContextDialog: (show: boolean) => void;
  notebook: Notebook;
  setShowSaveDialog: (show: boolean) => void;
}

interface DropdownProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Dropdown: React.FC<DropdownProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0" 
        onClick={onClose}
      />
      <div className="absolute top-full left-0 mt-1 bg-[#242424] border border-[#333333] rounded-lg shadow-lg py-1 min-w-[200px] z-50">
        {children}
      </div>
    </>
  );
};

const Toolbar: React.FC<ToolbarProps> = ({
  onAddCell,
  onSaveNotebook,
  onCreateNewNotebook,
  onSelectNotebook,
  onManagePackages,
  notebooks,
  currentNotebook,
  setShowContextDialog,
  notebook,
  setShowSaveDialog,
}) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { theme } = useTheme();
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);

  const handleDropdownClick = (dropdown: string) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  const closeDropdowns = () => {
    setActiveDropdown(null);
  };

  const handleSaveNotebook = async () => {
    try {
      const response = await fetch('/api/notebooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notebook),
      });

      if (!response.ok) throw new Error('Failed to save notebook');
      
      const data = await response.json();
      alert('Notebook saved successfully!');
    } catch (error) {
      console.error('Error saving notebook:', error);
      alert('Failed to save notebook');
    }
  };

  const handleLoadNotebook = async (filename: string) => {
    try {
      const response = await fetch(`/api/notebooks/${filename}`);
      if (!response.ok) throw new Error('Failed to load notebook');
      
      onSelectNotebook(filename);
    } catch (error) {
      console.error('Error loading notebook:', error);
      alert('Failed to load notebook');
    }
  };

  const menuItems = {
    file: [
      { label: 'New Notebook', action: onCreateNewNotebook },
      { label: 'Save Notebook', action: onSaveNotebook },
      { label: 'Save As...', action: () => setShowSaveDialog(true) },
      { 
        label: 'Open Notebook',
        submenu: notebooks.map(notebook => ({
          label: notebook.replace('.json', ''),
          action: () => handleLoadNotebook(notebook)
        }))
      },
      { label: 'Download Notebook', action: () => {} }, // TODO: Implement download
    ],
    environment: [
      { label: 'Manage Packages', action: onManagePackages },
      { label: 'View Context', action: () => setShowContextDialog(true) },
      { label: 'Environment Details', action: () => {} },
    ],
    help: [
      { 
        label: 'Keyboard Shortcuts',
        action: () => setShowShortcutsDialog(true)
      },
      { 
        label: 'Report Issue',
        action: () => window.open('https://github.com/cdreetz/ai-notebook/issues', '_blank')
      },
    ]
  };

  const renderMenuItem = (item: any) => {
    if (item.submenu) {
      return (
        <div className="relative group" key={item.label}>
          <button className="w-full text-left px-4 py-2 hover:bg-[#333333] flex items-center justify-between">
            {item.label}
            <span className="ml-2">▶</span>
          </button>
          <div className="absolute left-full top-0 bg-[#242424] border border-[#333333] rounded-lg shadow-lg py-1 min-w-[200px] hidden group-hover:block">
            {item.submenu.map((subItem: any) => (
              <button
                key={subItem.label}
                onClick={() => {
                  subItem.action();
                  closeDropdowns();
                }}
                className="w-full text-left px-4 py-2 hover:bg-[#333333]"
              >
                {subItem.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <button
        key={item.label}
        onClick={() => {
          item.action();
          closeDropdowns();
        }}
        className="w-full text-left px-4 py-2 hover:bg-[#333333]"
      >
        {item.label}
      </button>
    );
  };

  return (
    <div className="flex items-center space-x-2 relative">
      {Object.entries(menuItems).map(([key, items]) => (
        <div key={key} className="relative">
          <button
            onClick={() => handleDropdownClick(key)}
            className={`px-3 py-1 rounded hover:bg-[#333333] capitalize ${
              activeDropdown === key ? 'bg-[#333333]' : ''
            }`}
          >
            {key}
          </button>
          <Dropdown
            isOpen={activeDropdown === key}
            onClose={closeDropdowns}
          >
            {items.map(renderMenuItem)}
          </Dropdown>
        </div>
      ))}
      
      {currentNotebook && (
        <span className="ml-4 text-gray-400">
          Current: {currentNotebook}
        </span>
      )}
      
      {showShortcutsDialog && (
        <ShortcutsDialog onClose={() => setShowShortcutsDialog(false)} />
      )}
    </div>
  );
};

export default Toolbar;
