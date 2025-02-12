export interface Message {
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp?: Date;
  id?: string;
  attachments?: Array<{
    type: 'image' | 'document';
    url: string;
    name: string;
  }>;
  audioUrl?: string;
} 