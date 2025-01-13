'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface NotebookContextProps {
  context: {
    methods: {
      name: string;
      inputs: string[];
      output: string;
      description: string;
    }[];
    variables: { [key: string]: string };
  };
  onClose: () => void;
}

const NotebookContext: React.FC<NotebookContextProps> = ({ context, onClose }) => {
  const { theme } = useTheme();

  const themeStyles = {
    dialog: theme === 'dark' ? 'bg-[#242424] border-[#333333]' : 'bg-white border-gray-200',
    section: theme === 'dark' ? 'bg-[#1e1e1e] border-[#333333]' : 'bg-gray-50 border-gray-200',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className={`${themeStyles.dialog} p-6 rounded-lg border shadow-xl w-[800px]`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Notebook Context</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Methods Section */}
          <div>
            <h3 className="text-lg font-medium mb-2">Methods</h3>
            <div className={`${themeStyles.section} border rounded-lg overflow-hidden`}>
              {context.methods.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={`${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-100'}`}>
                      <tr>
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-4 py-2 text-left">Inputs</th>
                        <th className="px-4 py-2 text-left">Output</th>
                        <th className="px-4 py-2 text-left">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {context.methods.map((method, index) => (
                        <tr 
                          key={index}
                          className={`
                            border-t
                            ${theme === 'dark' ? 'border-[#333333]' : 'border-gray-200'}
                            ${index % 2 === 0 ? '' : theme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-gray-50'}
                          `}
                        >
                          <td className="px-4 py-3 font-mono text-blue-400">{method.name}</td>
                          <td className="px-4 py-3 font-mono text-sm">
                            {method.inputs.length > 0 ? method.inputs.join(', ') : '-'}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm">
                            {method.output || 'void'}
                          </td>
                          <td className="px-4 py-3 text-sm italic text-gray-400">
                            {method.description || 'No description'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400 p-4">No methods defined yet</p>
              )}
            </div>
          </div>

          {/* Variables Section */}
          <div>
            <h3 className="text-lg font-medium mb-2">Variables</h3>
            <div className={`${themeStyles.section} border rounded-lg overflow-hidden`}>
              {Object.keys(context.variables).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={`${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-100'}`}>
                      <tr>
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-4 py-2 text-left">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(context.variables).map(([name, value], index) => (
                        <tr 
                          key={index}
                          className={`
                            border-t
                            ${theme === 'dark' ? 'border-[#333333]' : 'border-gray-200'}
                            ${index % 2 === 0 ? '' : theme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-gray-50'}
                          `}
                        >
                          <td className="px-4 py-3 font-mono text-blue-400">{name}</td>
                          <td className="px-4 py-3 font-mono text-sm">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400 p-4">No variables defined yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotebookContext; 