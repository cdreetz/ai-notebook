'use client';

import React, { useState, useEffect } from 'react';
import { useChat } from 'ai/react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { SyntaxHighlighterProps } from 'react-syntax-highlighter';
import { useTheme } from '@/contexts/ThemeContext';

interface ChatComponentProps {
  contextToAdd: string | null;
  clearContext: () => void;
}

interface CodeBlockProps {
  className?: string;
  children: React.ReactNode;
}

const CodeBlock = ({
  className,
  children,
  ...props
}: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');

  const copyToClipboard = () => {
    const code = String(children).replace(/\n$/, '');
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!match) {
    return (
      <code {...props} className={className}>
        {children}
      </code>
    );
  }

  return (
    <div className="relative">
      <SyntaxHighlighter
        {...props as SyntaxHighlighterProps}
        style={atomDark}
        language={match[1]}
        PreTag="div"
        customStyle={{
          maxWidth: '100%',
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word'
        }}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
      <button
        onClick={copyToClipboard}
        className="absolute bottom-2 right-2 p-1 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
        title="Copy code"
      >
        {copied ? (
          <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
        )}
      </button>
    </div>
  );
};

const components: Components = {
  code({ className, children, ...props }) {
    return (
      <CodeBlock
        className={className}
        {...props}
      >
        {children}
      </CodeBlock>
    );
  }
};


const ChatComponent: React.FC<ChatComponentProps> = ({ contextToAdd, clearContext }) => {
  const { messages, input, handleInputChange, handleSubmit, setMessages } = useChat();
  const [context, setContext] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (contextToAdd) {
      setMessages([
        ...messages,
        {
          id: Math.random().toString(),
          role: 'system',
          content: `\`\`\`${contextToAdd.startsWith('Code:') ? 'python' : ''}\n${contextToAdd}\n\`\`\``,
          createdAt: new Date(),
        }
      ]);
      clearContext();
    }
  }, [contextToAdd, clearContext, messages, setMessages]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const messageContent = context 
      ? `Additional Context: ${context}\n\nUser: ${input}`
      : input;
    handleSubmit(e, { options: { body: { input: messageContent } } });
    setContext(null);
  };

  const themeStyles = {
    background: theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white',
    header: theme === 'dark' ? 'bg-[#242424] border-[#333333]' : 'bg-gray-100 border-gray-200',
    message: theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-100',
    border: theme === 'dark' ? 'border-[#333333]' : 'border-gray-200',
  };

  return (
    <div className={`h-full flex flex-col ${themeStyles.background}`}>
      <div className={`p-4 border-b ${themeStyles.header}`}>
        <h2 className="text-lg font-semibold">AI Assistant</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`${
            message.role === 'user' 
              ? 'text-right' 
              : message.role === 'system' 
                ? 'text-left bg-[#242424] p-2 rounded-lg border border-[#333333]' 
                : 'text-left'
          }`}>
            {message.role === 'system' && (
              <div className="text-xs text-gray-400 mb-1">Added to conversation:</div>
            )}
            <div className={`inline-block p-2 rounded-lg max-w-full ${
              message.role === 'user' 
                ? 'bg-emerald-600 text-white' 
                : message.role === 'system'
                  ? 'bg-[#242424]'
                  : 'bg-[#2a2a2a] text-gray-100'
            }`}>
              <div className="w-full overflow-x-auto">
                <ReactMarkdown components={components}>
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 border-gray-200">
        <form onSubmit={handleFormSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder={contextToAdd ? "Ask about the added context..." : "Type your message..."}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatComponent;
