import { BaseWidget, BaseWidgetData } from './base-widget';
import './chat-widget.scss';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: Date;
  id: string;
}

export interface ChatData extends BaseWidgetData {
  id?: string;
  messages?: ChatMessage[];
  error?: string;
}

export class ChatWidget extends BaseWidget<ChatData> {
  protected data: ChatData;
  private messages: ChatMessage[] = [];
  private chatId: string | null = null;

  constructor(data?: ChatData) {
    super('Chat');
    this.data = {
      title: 'Chat',
      messages: [],
      ...data
    };
    this.messages = this.data.messages || [];
    this.chatId = this.data.id || null;
    this.loadChatHistory();
  }

  async render(data: ChatData = this.data): Promise<string> {
    // Store chat ID if provided in data
    if (data?.id) {
      this.chatId = data.id;
      this.loadChatHistory();
    }

    return `
      <div class="chat-widget flex flex-col h-full">
        <div class="chat-messages flex-1 overflow-y-auto p-4 space-y-4 prose prose-sm max-w-none">
          ${this.messages.length === 0 ? this.renderEmptyState() : this.renderMessages()}
        </div>
        <div class="chat-input border-t border-base-200 bg-base-200/50 backdrop-blur-sm p-4">
          <form class="chat-form join w-full" onsubmit="return (window as any).app.sendChatMessage(event)">
            <div class="join-item relative flex-1">
              <input type="text" 
                     class="input input-bordered w-full text-base-content placeholder:text-base-content/50" 
                     placeholder="Type your message..."
                     name="message"
                     required>
              <div class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/30 text-sm typing-indicator"></div>
            </div>
            <button type="submit" class="join-item btn btn-primary">
              <span class="material-symbols-outlined">send</span>
            </button>
          </form>
          <div class="flex justify-between items-center mt-2 text-xs text-base-content/50">
            <span class="flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">history</span>
              ${this.messages.length} messages
            </span>
            <div class="space-x-2">
              <button onclick="(window as any).app.clearChat('${this.chatId}')" 
                      class="btn btn-ghost btn-xs">
                Clear Chat
              </button>
              <button onclick="(window as any).app.exportChat('${this.chatId}')"
                      class="btn btn-ghost btn-xs">
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
      <div class="flex flex-col items-center justify-center h-full text-base-content/50 space-y-4">
        <span class="material-symbols-outlined text-4xl">chat</span>
        <div class="text-center">
          <h3 class="font-medium">Start a conversation</h3>
          <p class="text-sm">Type a message to begin chatting with the assistant</p>
        </div>
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
        ? '<div class="avatar placeholder"><div class="bg-primary text-primary-content w-8 rounded-full"><span>You</span></div></div>'
        : '<div class="avatar placeholder"><div class="bg-accent text-accent-content w-8 rounded-full"><span>AI</span></div></div>';

      return `
        <div class="chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'}">
          <div class="chat-image">
            ${avatar}
          </div>
          <div class="chat-header opacity-50">
            ${msg.role === 'user' ? 'You' : 'Assistant'}
            <time class="text-xs">${timestamp}</time>
          </div>
          <div class="chat-bubble ${this.getChatBubbleClass(msg.role)}">
            ${this.formatMessageContent(msg.content)}
          </div>
          <div class="chat-footer opacity-50 text-xs">
            ${msg.role === 'user' ? 'Sent' : 'Delivered'}
          </div>
        </div>
      `;
    }).join('');
  }

  private getChatBubbleClass(role: 'user' | 'assistant' | 'error'): string {
    if (role === 'user') {
      return 'chat-bubble-primary';
    } else if (role === 'assistant') {
      return 'chat-bubble-accent';
    } else if (role === 'error') {
      return 'chat-bubble-error';
    }
    return '';
  }

  private formatMessageContent(content: string): string {
    // Convert URLs to clickable links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    content = content.replace(urlRegex, url => `<a href="${url}" target="_blank" class="link link-hover">${url}</a>`);
    
    // Convert code blocks
    const codeRegex = /`([^`]+)`/g;
    content = content.replace(codeRegex, (_, code) => `<code class="kbd kbd-sm">${code}</code>`);
    
    // Convert bold text
    const boldRegex = /\*\*([^*]+)\*\*/g;
    content = content.replace(boldRegex, (_, text) => `<strong>${text}</strong>`);
    
    return content;
  }

  addMessage(role: 'user' | 'assistant' | 'error', content: string): void {
    const message: ChatMessage = { 
      role, 
      content, 
      timestamp: new Date(),
      id: Date.now().toString()
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
    const countElement = this.element?.querySelector('.text-base-content/50 span');
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
          timestamp: new Date(msg.timestamp)
        }));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }

  saveChatHistory() {
    if (!this.chatId) return;
    
    try {
      localStorage.setItem(`chat_${this.chatId}`, JSON.stringify({
        id: this.chatId,
        messages: this.messages
      }));
    } catch (error) {
      console.error('Error saving chat history:', error);
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
} 