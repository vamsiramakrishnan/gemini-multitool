import { withWidget } from './withWidget';
import { ChatWidget as ChatWidgetClass } from './chat-widget';
import type { ChatData } from './chat-widget';

export type ChatWidgetProps = ChatData;

export const ChatWidget = withWidget<ChatWidgetProps>(
  ChatWidgetClass,
  'ChatWidget'
); 