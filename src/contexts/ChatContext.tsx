import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Message } from '../types/chat';
import { useLiveAPIContext } from './LiveAPIContext';

interface ChatContextType {
  isVisible: boolean;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  showChat: () => void;
  hideChat: () => void;
  minimizeChat: () => void;
  clearMessages: () => void;
  shouldCleanup: boolean;
  setShouldCleanup: (cleanup: boolean) => void;
  sendMessage: (content: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [shouldCleanup, setShouldCleanup] = useState(false);
  const { client } = useLiveAPIContext();
  
  const currentMessageId = useRef<string | null>(null);
  const currentAudioChunks = useRef<Uint8Array[]>([]);

  const showChat = useCallback(() => {
    setIsVisible(true);
    setShouldCleanup(false);
  }, []);

  const hideChat = useCallback(() => {
    setIsVisible(false);
  }, []);

  const minimizeChat = useCallback(() => {
    setIsVisible(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    // Clear audio state
    currentMessageId.current = null;
    currentAudioChunks.current = [];
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!client) {
      console.error('No client available');
      return;
    }

    // Add user message immediately
    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date(),
      id: Date.now().toString()
    };
    
    setMessages(prev => [...prev, userMessage]);

    try {
      // Send to API
      await client.send([{ text: content }], true);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'error',
        content: 'Failed to send message. Please try again.',
        timestamp: new Date(),
        id: Date.now().toString()
      }]);
    }
  }, [client]);

  const handleContent = useCallback((content: any) => {
    if (content.modelTurn?.parts) {
      const textContent = content.modelTurn.parts
        .filter((part: any) => part.text)
        .map((part: any) => part.text)
        .join('');
      
      if (textContent) {
        setMessages(prev => {
          // Only create a new message if we don't have a current message ID
          if (!currentMessageId.current) {
            const messageId = Date.now().toString();
            currentMessageId.current = messageId;
            return [...prev, {
              role: 'assistant',
              content: textContent,
              timestamp: new Date(),
              id: messageId,
              isCollectingAudio: false
            }];
          }

          // Update existing message with new content
          return prev.map(msg => {
            if (msg.id === currentMessageId.current) {
              return {
                ...msg,
                content: msg.content === 'Audio message' ? textContent : msg.content + textContent
              };
            }
            return msg;
          });
        });
      }
    }
  }, []);

  const handleAudio = useCallback((data: ArrayBuffer) => {
    const chunk = new Uint8Array(data);
    console.log(`Received audio chunk of size: ${chunk.length} bytes`);
    currentAudioChunks.current.push(chunk);
    
    setMessages(prev => {
      // Create message ID if it doesn't exist yet
      if (!currentMessageId.current) {
        const messageId = Date.now().toString();
        currentMessageId.current = messageId;
        console.log('Creating new message for audio:', messageId);
        return [...prev, {
          role: 'assistant',
          content: 'Audio message',
          timestamp: new Date(),
          id: messageId,
          isCollectingAudio: true
        }];
      }

      // Update existing message to show collecting state
      return prev.map(msg => {
        if (msg.id === currentMessageId.current) {
          return {
            ...msg,
            isCollectingAudio: true
          };
        }
        return msg;
      });
    });
  }, []);

  const handleTurnComplete = useCallback(() => {
    console.log('Turn complete, processing audio...');
    console.log('Audio chunks collected:', currentAudioChunks.current.length);
    console.log('Current message ID:', currentMessageId.current);
    
    if (currentAudioChunks.current.length === 0) {
      console.log('No audio to process');
      setMessages(prev => prev.map(msg => {
        if (msg.id === currentMessageId.current) {
          return { ...msg, isCollectingAudio: false };
        }
        return msg;
      }));
      currentMessageId.current = null;
      return;
    }

    // Store message ID before processing to prevent it from being lost
    const messageId = currentMessageId.current;
    if (!messageId) {
      console.error('No message ID available for audio attachment');
      return;
    }

    try {
      const totalLength = currentAudioChunks.current.reduce((acc, chunk) => acc + chunk.length, 0);
      console.log('Total audio length:', totalLength, 'bytes');
      
      if (totalLength === 0) {
        console.log('No audio data to process');
        return;
      }

      const combinedArray = new Uint8Array(totalLength);
      let offset = 0;
      currentAudioChunks.current.forEach(chunk => {
        combinedArray.set(chunk, offset);
        offset += chunk.length;
      });

      // Create WAV header for PCM audio
      const wavHeader = new ArrayBuffer(44);
      const view = new DataView(wavHeader);
      
      // "RIFF" chunk descriptor
      view.setUint32(0, 0x52494646, false);  // "RIFF" in big-endian
      view.setUint32(4, 36 + combinedArray.length, true);  // File size in little-endian
      view.setUint32(8, 0x57415645, false);  // "WAVE" in big-endian
      
      // "fmt " sub-chunk
      view.setUint32(12, 0x666D7420, false);  // "fmt " in big-endian
      view.setUint32(16, 16, true);  // Subchunk1Size (16 for PCM) in little-endian
      view.setUint16(20, 1, true);  // AudioFormat (1 for PCM) in little-endian
      view.setUint16(22, 1, true);  // NumChannels (1 for mono) in little-endian
      view.setUint32(24, 24000, true);  // SampleRate (24000Hz) in little-endian
      view.setUint32(28, 24000 * 2, true);  // ByteRate in little-endian
      view.setUint16(32, 2, true);  // BlockAlign in little-endian
      view.setUint16(34, 16, true);  // BitsPerSample (16 bits) in little-endian
      
      // "data" sub-chunk
      view.setUint32(36, 0x64617461, false);  // "data" in big-endian
      view.setUint32(40, combinedArray.length, true);  // Subchunk2Size in little-endian
      
      // Combine WAV header with audio data
      const audioBlob = new Blob([wavHeader, combinedArray], { 
        type: 'audio/wav; sampleRate=24000; bitsPerSample=16; channels=1' 
      });
      
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('Created audio URL:', audioUrl);

      // Update message with audio URL using the stored messageId
      setMessages(prev => {
        const newMessages = prev.map(msg => {
          if (msg.id === messageId) {
            console.log('Attaching audio to message:', msg.id);
            return { 
              ...msg, 
              audioUrl,
              isCollectingAudio: false,
              // Keep existing content if it's not just "Audio message"
              content: msg.content === 'Audio message' ? 'Voice message' : msg.content
            };
          }
          return msg;
        });

        // Verify if message was found and updated
        if (!newMessages.some(msg => msg.id === messageId)) {
          console.error('Could not find message to attach audio:', messageId);
        }

        return newMessages;
      });
    } catch (error) {
      console.error('Error processing audio:', error);
      // Update message to show error state
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          return { 
            ...msg, 
            isCollectingAudio: false,
            content: 'Error processing audio message'
          };
        }
        return msg;
      }));
    } finally {
      // Clean up after processing
      currentAudioChunks.current = [];
      currentMessageId.current = null;
      console.log('Audio processing complete');
    }
  }, []);

  useEffect(() => {
    if (!client) return;

    client
      .on('content', handleContent)
      .on('audio', handleAudio)
      .on('turncomplete', handleTurnComplete);

    return () => {
      client
        .off('content', handleContent)
        .off('audio', handleAudio)
        .off('turncomplete', handleTurnComplete);
    };
  }, [client, handleTurnComplete]);

  // Handle cleanup when chat is hidden
  useEffect(() => {
    if (!isVisible && shouldCleanup) {
      clearMessages();
      setShouldCleanup(false);
    }
  }, [isVisible, shouldCleanup, clearMessages]);

  const value = {
    isVisible,
    messages,
    setMessages,
    showChat,
    hideChat,
    minimizeChat,
    clearMessages,
    shouldCleanup,
    setShouldCleanup,
    sendMessage,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}; 