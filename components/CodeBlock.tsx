'use client';

import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { dracula } from '@uiw/codemirror-theme-dracula';

interface CodeBlockProps {
  inline: boolean;
  className?: string;
  children: React.ReactNode;
}

export function CodeBlock({ inline, className, children }: CodeBlockProps) {
  if (inline) {
    return (
      <code className="text-sm bg-gray-700 text-white px-1 py-0.5 rounded">
        {children}
      </code>
    );
  }

  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';
  
  const extensions = [
    lang === 'python' ? python() : javascript(),
  ];

  return (
    <div className="not-prose rounded-lg overflow-hidden">
      <CodeMirror
        value={String(children)}
        theme={dracula}
        extensions={extensions}
        editable={false}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: false,
          highlightActiveLine: false,
        }}
      />
    </div>
  );
}
