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
  
  // Audio handling refs
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

  // Handle API responses including audio
  useEffect(() => {
    if (!client) return;

    const handleContent = (content: any) => {
      if (content.modelTurn?.parts) {
        const textContent = content.modelTurn.parts
          .filter((part: any) => part.text)
          .map((part: any) => part.text)
          .join('');
        
        if (textContent) {
          const messageId = Date.now().toString();
          currentMessageId.current = messageId;
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: textContent,
            timestamp: new Date(),
            id: messageId
          }]);
        }
      }
    };

    const handleAudio = (data: ArrayBuffer) => {
      console.log('Received audio chunk:', data.byteLength, 'bytes');
      if (!currentMessageId.current) {
        // Create a new message for audio-only response
        const messageId = Date.now().toString();
        currentMessageId.current = messageId;
        console.log('Created new message for audio:', messageId);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '',  // Empty content for audio-only message
          timestamp: new Date(),
          id: messageId
        }]);
      }
      currentAudioChunks.current.push(new Uint8Array(data));
      console.log('Total audio chunks:', currentAudioChunks.current.length);
    };

    const handleTurnComplete = () => {
      console.log('Turn complete, processing audio...');
      if (!currentMessageId.current || currentAudioChunks.current.length === 0) {
        console.log('No audio to process');
        return;
      }

      // Combine all audio chunks
      const totalLength = currentAudioChunks.current.reduce((acc, chunk) => acc + chunk.length, 0);
      console.log('Total audio length:', totalLength, 'bytes');
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
      view.setUint32(0, 0x52494646, false);  // "RIFF"
      view.setUint32(4, 36 + combinedArray.length, true);  // File size
      view.setUint32(8, 0x57415645, false);  // "WAVE"
      
      // "fmt " sub-chunk
      view.setUint32(12, 0x666D7420, false);  // "fmt "
      view.setUint32(16, 16, true);  // Subchunk1Size (16 for PCM)
      view.setUint16(20, 1, true);  // AudioFormat (1 for PCM)
      view.setUint16(22, 1, true);  // NumChannels (1 for mono)
      view.setUint32(24, 24000, true);  // SampleRate (24000Hz)
      view.setUint32(28, 24000 * 2, true);  // ByteRate
      view.setUint16(32, 2, true);  // BlockAlign
      view.setUint16(34, 16, true);  // BitsPerSample (16 bits)
      
      // "data" sub-chunk
      view.setUint32(36, 0x64617461, false);  // "data"
      view.setUint32(40, combinedArray.length, true);  // Subchunk2Size
      
      // Combine WAV header with audio data
      const audioBlob = new Blob([wavHeader, combinedArray], { 
        type: 'audio/wav; sampleRate=24000; bitsPerSample=16; channels=1' 
      });
      
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('Created audio URL:', audioUrl);

      // Update message with audio URL
      setMessages(prev => prev.map(msg => {
        if (msg.id === currentMessageId.current) {
          console.log('Updating message with audio:', msg.id);
          return { 
            ...msg, 
            audioUrl,
            content: msg.content || 'Audio message'
          };
        }
        return msg;
      }));

      // Reset for next message
      currentAudioChunks.current = [];
      currentMessageId.current = null;
      console.log('Audio processing complete');
    };

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
  }, [client]);

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