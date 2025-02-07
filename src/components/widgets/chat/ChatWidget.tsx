import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BaseWidget, BaseWidgetData } from '../base/base-widget';
import { GenerativeContentBlob } from '@google/generative-ai';
import './chat-widget.scss';

interface MessagePart {
  text?: string;
  inlineData?: {
    data: string;
    mimeType: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: Date;
  id: string;
  attachments?: Array<{
    type: 'image' | 'document';
    url: string;
    name: string;
  }>;
  audioUrl?: string; // URL for audio blob
}

export interface ChatData extends BaseWidgetData {
  id?: string;
  messages?: ChatMessage[];
  error?: string;
  liveAPIClient?: any; // LiveAPI client instance
}

export class ChatWidget extends BaseWidget<ChatData> {
  protected data: ChatData;
  private messages: ChatMessage[] = [];
  private chatId: string | null = null;
  private fileInput: HTMLInputElement | null = null;
  private liveAPIClient: any;
  private audioContext: AudioContext | null = null;
  private audioQueue: Array<{ buffer: AudioBuffer; url: string }> = [];
  private isPlayingAudio = false;

  constructor(data?: ChatData) {
    super('Chat');
    this.data = {
      title: 'Chat',
      messages: [],
      ...data
    };
    this.messages = this.data.messages || [];
    this.chatId = this.data.id || null;
    this.liveAPIClient = this.data.liveAPIClient;
    this.loadChatHistory();
    this.setupFileInput();
    this.setupMessageHandler();
    this.setupAudioHandling();
  }

  private setupMessageHandler() {
    // Add global handler for chat message sending
    (window as any).app.sendChatMessage = async (event: Event) => {
      event.preventDefault();
      const form = event.target as HTMLFormElement;
      const messageInput = form.querySelector('input[name="message"]') as HTMLInputElement;
      const message = messageInput.value.trim();
      
      if (!message) return;

      try {
        if (!this.liveAPIClient) {
          throw new Error('LiveAPI client not initialized');
        }
        
        // Add message to UI immediately
        this.addMessage('user', message);
        
        // Clear input
        messageInput.value = '';
        
        // Send as client content with turn
        await this.liveAPIClient.send([{
          text: message
        }], true); // turnComplete = true
      } catch (error) {
        console.error('Error sending message:', error);
        this.addMessage('error', 'Failed to send message. Please try again.');
      }
    };

    // Add global handlers for chat actions
    (window as any).app.clearChat = () => {
      this.clearHistory();
      this.updateMessages();
    };

    (window as any).app.exportChat = () => {
      this.exportHistory();
    };
  }

  private setupFileInput() {
    // Create file input element for handling uploads
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.multiple = true;
    this.fileInput.accept = 'image/*,.pdf,.doc,.docx,.txt';
    this.fileInput.style.display = 'none';
    
    this.fileInput.addEventListener('change', this.handleFileSelection.bind(this));
    
    // Add global handler for file uploads
    (window as any).app.handleFileUpload = () => {
      this.fileInput?.click();
    };
  }

  private async handleFileSelection(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    if (!files || files.length === 0) return;

    try {
      if (!this.liveAPIClient) {
        throw new Error('LiveAPI client not initialized');
      }

      // Process each file
      for (const file of Array.from(files)) {
        try {
          // Convert file to base64
          const base64Data = await this.fileToBase64(file);
          const base64Content = base64Data.split(',')[1]; // Remove data URL prefix

          // Create media chunk
          const mediaChunk: GenerativeContentBlob = {
            data: base64Content,
            mimeType: file.type || this.getMimeType(file.name)
          };

          // Add message to UI immediately
          this.addMessage('user', '', [{
            type: file.type.startsWith('image/') ? 'image' : 'document',
            url: base64Data,
            name: file.name
          }]);

          // Send file as realtime input
          this.liveAPIClient.sendRealtimeInput([mediaChunk]);

          // For documents, follow up with analysis request
          if (!file.type.startsWith('image/')) {
            await this.liveAPIClient.send([{
              text: 'Please analyze the document I just sent.'
            }]);
          }

        } catch (error) {
          console.error('Error processing file:', error);
          this.addMessage('error', `Failed to process file: ${file.name}`);
        }
      }
    } catch (error) {
      console.error('Error sending files:', error);
      this.addMessage('error', 'Failed to send files. Please try again.');
    }

    // Reset file input
    if (this.fileInput) {
      this.fileInput.value = '';
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif'
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  private setupAudioHandling() {
    if (this.liveAPIClient) {
      // Listen for audio responses from the model
      this.liveAPIClient.on('audio', async (audioBuffer: ArrayBuffer) => {
        try {
          // Create audio context if not exists
          if (!this.audioContext) {
            this.audioContext = new AudioContext({
              sampleRate: 16000 // Match the PCM sample rate from the server
            });
          }

          // Convert PCM data to Float32Array
          const pcmData = new Int16Array(audioBuffer);
          const float32Data = new Float32Array(pcmData.length);
          for (let i = 0; i < pcmData.length; i++) {
            float32Data[i] = pcmData[i] / 32768.0;
          }

          // Create audio buffer
          const audioData = this.audioContext.createBuffer(
            1, // mono
            float32Data.length,
            this.audioContext.sampleRate
          );
          audioData.getChannelData(0).set(float32Data);

          // Create WAV blob with proper headers
          const wavBlob = await this.audioBufferToWav(audioData);
          const audioUrl = URL.createObjectURL(wavBlob);

          // Add audio message to chat
          this.addMessage('assistant', '', undefined, audioUrl);

          // Clean up URL when audio is loaded
          const cleanup = () => {
            URL.revokeObjectURL(audioUrl);
            document.removeEventListener('audioloaded', cleanup);
          };
          document.addEventListener('audioloaded', cleanup);

        } catch (error) {
          console.error('Error handling audio response:', error);
          this.addMessage('error', 'Failed to process audio response');
        }
      });

      // Listen for content to know when assistant responds
      this.liveAPIClient.on('content', (content: any) => {
        if (content.modelTurn?.parts) {
          const textContent = content.modelTurn.parts
            .filter((part: any) => part.text)
            .map((part: any) => part.text)
            .join('');
          
          if (textContent) {
            this.addMessage('assistant', textContent);
          }
        }
      });
    }
  }

  private async processAudioQueue() {
    if (this.isPlayingAudio || !this.audioQueue.length || !this.audioContext) return;

    this.isPlayingAudio = true;
    
    try {
      while (this.audioQueue.length) {
        const { buffer, url } = this.audioQueue.shift()!;
        
        // Create audio source
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);

        // Add audio message to chat
        this.addMessage('assistant', '', undefined, url);

        // Play audio
        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
          source.start(0);
        });
      }
    } catch (error) {
      console.error('Error processing audio:', error);
    } finally {
      this.isPlayingAudio = false;
      
      // Check if more audio arrived while playing
      if (this.audioQueue.length) {
        this.processAudioQueue();
      }
    }
  }

  // Helper function to convert AudioBuffer to WAV blob
  private audioBufferToWav(audioBuffer: AudioBuffer): Promise<Blob> {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    
    const buffer = audioBuffer.getChannelData(0);
    const dataSize = buffer.length * bytesPerSample;
    const arrayBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Audio data
    const samples = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    const offset = 44;
    for (let i = 0; i < samples.length; i++) {
      view.setInt16(offset + (i * 2), samples[i], true);
    }
    
    return Promise.resolve(new Blob([arrayBuffer], { type: 'audio/wav' }));
  }

  async render(data: ChatData = this.data): Promise<string> {
    if (data?.id) {
      this.chatId = data.id;
      this.loadChatHistory();
    }

    return `
      <div class="chat-widget flex flex-col h-full">
        <div class="chat-messages flex-1 overflow-y-auto p-4 space-y-4 prose prose-sm max-w-none">
          ${this.messages.length === 0 ? this.renderEmptyState() : this.renderMessages()}
        </div>
        <div class="chat-input">
          <form class="chat-form" onsubmit="return window.app.sendChatMessage(event)">
            <div class="input-container">
              <input type="text" 
                     placeholder="Type your message..."
                     name="message"
                     required>
              <div class="typing-indicator"></div>
            </div>
            <button type="button" class="btn btn-ghost" onclick="window.app.handleFileUpload()">
              <span class="material-symbols-outlined">attach_file</span>
            </button>
            <button type="submit" class="btn btn-primary">
              <span class="material-symbols-outlined">send</span>
            </button>
          </form>
          <div class="chat-footer">
            <div class="message-count">
              <span class="material-symbols-outlined">history</span>
              <span>${this.messages.length} messages</span>
            </div>
            <div class="actions">
              <button onclick="window.app.clearChat()" 
                      class="btn btn-ghost">
                Clear
              </button>
              <button onclick="window.app.exportChat()"
                      class="btn btn-ghost">
                Export
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderEmptyState() {
    return `
      <div class="empty-state">
        <span class="material-symbols-outlined icon">chat</span>
        <h3>Start a conversation</h3>
        <p>Type a message to begin chatting with the assistant</p>
      </div>
    `;
  }

  renderMessages() {
    return this.messages.map(msg => {
      const timestamp = new Intl.DateTimeFormat('default', {
        hour: 'numeric',
        minute: 'numeric'
      }).format(msg.timestamp);

      const avatar = msg.role === 'user' 
        ? '<div class="avatar"><span class="material-symbols-outlined">person</span></div>'
        : '<div class="avatar"><span class="material-symbols-outlined">smart_toy</span></div>';

      const attachmentsHtml = msg.attachments ? this.renderAttachments(msg.attachments) : '';
      const audioHtml = msg.audioUrl ? this.renderAudioPlayer(msg.audioUrl) : '';

      return `
        <div class="chat-message ${msg.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}">
          <div class="chat-message-header">
            ${avatar}
            <span class="name">${msg.role === 'user' ? 'You' : 'Assistant'}</span>
            <time>${timestamp}</time>
          </div>
          <div class="chat-bubble ${this.getChatBubbleClass(msg.role)}">
            ${this.formatMessageContent(msg.content)}
            ${attachmentsHtml}
            ${audioHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  private getChatBubbleClass(role: 'user' | 'assistant' | 'error'): string {
    switch (role) {
      case 'user':
        return 'chat-bubble-primary';
      case 'assistant':
        return 'chat-bubble-accent';
      case 'error':
        return 'chat-bubble-error';
      default:
        return '';
    }
  }

  private formatMessageContent(content: string): string {
    if (!content) return '';

    // Convert URLs to clickable links
    content = content.replace(
      /(https?:\/\/[^\s]+)/g, 
      url => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="link">${url}</a>`
    );
    
    // Convert code blocks
    content = content.replace(
      /`([^`]+)`/g, 
      (_, code) => `<code class="code-inline">${code}</code>`
    );
    
    // Convert bold text
    content = content.replace(
      /\*\*([^*]+)\*\*/g, 
      (_, text) => `<strong>${text}</strong>`
    );

    // Convert line breaks to <br>
    content = content.replace(/\n/g, '<br>');
    
    return content;
  }

  addMessage(
    role: 'user' | 'assistant' | 'error',
    content: string,
    attachments?: ChatMessage['attachments'],
    audioUrl?: string
  ): void {
    const message: ChatMessage = { 
      role, 
      content, 
      timestamp: new Date(),
      id: Date.now().toString(),
      attachments,
      audioUrl
    };
    this.messages.push(message);
    this.updateMessages();
    this.saveChatHistory();
  }

  updateMessages() {
    const messagesContainer = this.element?.querySelector('.chat-messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = this.messages.length === 0 
        ? this.renderEmptyState() 
        : this.renderMessages();
      
      // Smooth scroll to bottom
      messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth'
      });
    }

    // Update message count
    const countElement = this.element?.querySelector('.message-count span');
    if (countElement) {
      countElement.textContent = `${this.messages.length} messages`;
    }
  }

  loadChatHistory() {
    if (!this.chatId) return;
    
    try {
      const savedChat = localStorage.getItem(`chat_${this.chatId}`);
      if (savedChat) {
        const parsed = JSON.parse(savedChat);
        this.messages = parsed.messages.map((msg: { timestamp: string } & Omit<ChatMessage, 'timestamp'>) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
          // Don't try to load stored image/audio data
          attachments: msg.attachments?.map(att => ({
            ...att,
            url: att.url === '[Image Data]' ? '' : att.url
          })),
          audioUrl: msg.audioUrl === '[Audio Data]' ? undefined : msg.audioUrl
        }));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }

  saveChatHistory() {
    if (!this.chatId) return;
    
    try {
      // Create a copy of messages without large data URLs
      const sanitizedMessages = this.messages.map(msg => ({
        ...msg,
        // Remove data URLs from attachments
        attachments: msg.attachments?.map(attachment => ({
          ...attachment,
          url: attachment.type === 'image' 
            ? '[Image Data]'  // Don't store large image data URLs
            : attachment.url
        })),
        // Remove audio blob URLs
        audioUrl: msg.audioUrl ? '[Audio Data]' : undefined
      }));

      // Try to save with a max retry of 3 times
      let retryCount = 0;
      const maxRetries = 3;

      const tryStore = () => {
        try {
          const data = JSON.stringify({
            id: this.chatId,
            messages: sanitizedMessages
          });

          // Check if we're close to quota
          const totalSize = new Blob([data]).size;
          if (totalSize > 4.5 * 1024 * 1024) { // If close to 5MB limit
            this.pruneOldMessages();
          }

          localStorage.setItem(`chat_${this.chatId}`, data);
        } catch (error) {
          if (error instanceof Error && error.name === 'QuotaExceededError' && retryCount < maxRetries) {
            retryCount++;
            this.pruneOldMessages();
            tryStore();
          } else {
            throw error;
          }
        }
      };

      tryStore();
    } catch (error) {
      console.error('Error saving chat history:', error);
      // Notify user about storage limitation
      this.addMessage(
        'error',
        'Unable to save chat history due to storage limitations. Some message history may be lost.'
      );
    }
  }

  private pruneOldMessages() {
    // Keep only last 50 messages
    if (this.messages.length > 50) {
      this.messages = this.messages.slice(-50);
      this.updateMessages();
    }

    // Clear other chat histories if needed
    try {
      const keys = Object.keys(localStorage);
      const chatKeys = keys.filter(key => key.startsWith('chat_'));
      
      if (chatKeys.length > 5) { // Keep only 5 most recent chats
        chatKeys
          .sort((a, b) => {
            const timeA = localStorage.getItem(a) ? JSON.parse(localStorage.getItem(a)!).messages.slice(-1)[0]?.timestamp : 0;
            const timeB = localStorage.getItem(b) ? JSON.parse(localStorage.getItem(b)!).messages.slice(-1)[0]?.timestamp : 0;
            return new Date(timeB).getTime() - new Date(timeA).getTime();
          })
          .slice(5) // Keep first 5
          .forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      console.error('Error pruning old messages:', error);
    }
  }

  clearHistory() {
    this.messages = [];
    if (this.chatId) {
      localStorage.removeItem(`chat_${this.chatId}`);
    }
    this.updateMessages();
  }

  exportHistory() {
    const data = {
      id: this.chatId,
      messages: this.messages,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_${this.chatId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private renderAttachments(attachments: ChatMessage['attachments']) {
    if (!attachments || attachments.length === 0) return '';

    return `
      <div class="chat-attachments">
        ${attachments.map(attachment => {
          if (attachment.type === 'image') {
            return `
              <div class="chat-attachment-image">
                <img src="${attachment.url}" alt="${attachment.name}" loading="lazy" />
              </div>
            `;
          } else {
            return `
              <div class="chat-attachment-document">
                <span class="material-symbols-outlined">description</span>
                <span>${attachment.name}</span>
              </div>
            `;
          }
        }).join('')}
      </div>
    `;
  }

  private renderAudioPlayer(audioUrl: string): string {
    return `
      <div class="chat-audio-player">
        <div class="audio-player-header">
          <span class="material-symbols-outlined">mic</span>
          <span>Voice Message</span>
        </div>
        <audio 
          controls 
          preload="metadata" 
          onloadeddata="document.dispatchEvent(new Event('audioloaded'))"
        >
          <source src="${audioUrl}" type="audio/wav">
          Your browser does not support the audio element.
        </audio>
      </div>
    `;
  }
} 