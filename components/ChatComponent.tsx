'use client';

import React, { useState, useEffect } from 'react';
import { useChat } from 'ai/react';
import { CodeBlock } from './CodeBlock';

interface ChatComponentProps {
  contextToAdd: string | null;
  clearContext: () => void;
}

const ChatComponent: React.FC<ChatComponentProps> = ({ contextToAdd, clearContext }) => {
  const { messages, input, handleInputChange, handleSubmit, setMessages } = useChat();
  const [context, setContext] = useState<string | null>(null);

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

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-gray-50">
        <h2 className="text-lg font-semibold">AI Assistant</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`${
            message.role === 'user' 
              ? 'text-right' 
              : message.role === 'system' 
                ? 'text-left bg-gray-100 p-2 rounded-lg border border-gray-300' 
                : 'text-left'
          }`}>
            {message.role === 'system' && (
              <div className="text-xs text-gray-500 mb-1">Added to conversation:</div>
            )}
            <div className={`inline-block p-2 rounded-lg max-w-full ${
              message.role === 'user' 
                ? 'bg-blue-500 text-white' 
                : message.role === 'system'
                  ? 'bg-gray-100'
                  : 'bg-gray-200 text-gray-800'
            }`}>
              <div className="w-full overflow-x-auto">
                {message.content.split('```').map((block, index) => {
                  if (index % 2 === 1) {  // Code block
                    const [lang, ...code] = block.split('\n');
                    return (
                      <CodeBlock
                        key={index}
                        inline={false}
                        className={`language-${lang}`}
                      >
                        {code.join('\n')}
                      </CodeBlock>
                    );
                  }
                  return <p key={index}>{block}</p>;  // Regular text
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 border-t">
        <form onSubmit={handleFormSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            className="flex-1 p-2 border rounded-lg"
            placeholder={contextToAdd ? "Ask about the added context..." : "Type your message..."}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatComponent;
