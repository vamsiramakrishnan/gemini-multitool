import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './chat-widget.scss';

interface ChatMessage {
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: Date;
  id: string;
  attachments?: Array<{
    type: 'image' | 'document';
    url: string;
    name: string;
  }>;
  audioUrl?: string;
}

interface ChatWidgetProps {
  liveAPIClient?: any;
  initialMessages?: ChatMessage[];
  onSendMessage?: (message: string) => Promise<void>;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  liveAPIClient,
  initialMessages = [],
  onSendMessage
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputMessage, setInputMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
      id: Date.now().toString(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      await onSendMessage?.(inputMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'error',
          content: 'Failed to send message. Please try again.',
          timestamp: new Date(),
          id: Date.now().toString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    setIsMaximized(false);
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
    setIsMinimized(false);
  };

  const renderChatBubble = (message: ChatMessage) => {
    const bubbleClass = `chat-bubble chat-bubble-${
      message.role === 'user' ? 'primary' : message.role === 'error' ? 'error' : 'accent'
    }`;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={bubbleClass}
      >
        <div className="message-content">{message.content}</div>
        {message.attachments && (
          <div className="chat-attachments">
            {message.attachments.map((attachment, index) => (
              attachment.type === 'image' ? (
                <div key={index} className="chat-attachment-image">
                  <img src={attachment.url} alt={attachment.name} />
                </div>
              ) : (
                <a
                  key={index}
                  href={attachment.url}
                  className="chat-attachment-document"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="material-symbols-outlined">description</span>
                  <span>{attachment.name}</span>
                </a>
              )
            ))}
          </div>
        )}
        {message.audioUrl && (
          <div className="chat-audio">
            <audio controls src={message.audioUrl} />
          </div>
        )}
        <div className="message-timestamp">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div
      className={`chat-widget-container ${isMinimized ? 'minimized' : ''} ${
        isMaximized ? 'maximized' : ''
      }`}
      layout
      initial={false}
      animate={{
        height: isMinimized ? '4rem' : isMaximized ? '100vh' : '32rem',
        width: isMaximized ? '100vw' : '24rem',
      }}
    >
      <div className="chat-widget-header">
        <h3>
          <span className="material-symbols-outlined">chat</span>
          Chat
        </h3>
        <div className="header-actions">
          <button
            className="btn btn-ghost"
            onClick={toggleMinimize}
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            <span className="material-symbols-outlined">
              {isMinimized ? 'expand_more' : 'remove'}
            </span>
          </button>
          <button
            className="btn btn-ghost"
            onClick={toggleMaximize}
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            <span className="material-symbols-outlined">
              {isMaximized ? 'close_fullscreen' : 'open_in_full'}
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="chat-messages"
          >
            {messages.map(message => (
              <div key={message.id} className="message-wrapper">
                {renderChatBubble(message)}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </motion.div>
        )}
      </AnimatePresence>

      {!isMinimized && (
        <div className="chat-input">
          <form onSubmit={handleSendMessage} className="chat-form">
            <div className="input-container">
              <input
                type="text"
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={isLoading}
              />
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleFileUpload}
              disabled={isLoading}
            >
              <span className="material-symbols-outlined">attach_file</span>
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!inputMessage.trim() || isLoading}
            >
              <span className="material-symbols-outlined">
                {isLoading ? 'hourglass_empty' : 'send'}
              </span>
            </button>
          </form>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={() => {}} // Add file handling logic here
          />
        </div>
      )}
    </motion.div>
  );
}; 