import { getApiUrl } from './query-client';
import { getState } from './store';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

type MessageHandler = (message: WebSocketMessage) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private isConnecting = false;

  connect(userId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    try {
      const apiUrl = getApiUrl();
      // Convert HTTP/HTTPS URL to WebSocket URL
      let wsUrl: string;
      if (apiUrl.startsWith('https://')) {
        wsUrl = apiUrl.replace('https://', 'wss://');
      } else if (apiUrl.startsWith('http://')) {
        wsUrl = apiUrl.replace('http://', 'ws://');
      } else {
        // Fallback: assume HTTPS if protocol not specified
        wsUrl = 'wss://' + apiUrl.replace(/^\/\//, '');
      }
      wsUrl = wsUrl.replace(/\/$/, '') + '/ws?userId=' + encodeURIComponent(userId);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnecting = false;
        this.ws = null;

        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => {
            const currentState = getState();
            if (currentState.currentUser) {
              this.connect(currentState.currentUser.id);
            }
          }, this.reconnectDelay);
        }
      };
    } catch (error) {
      console.error('Error connecting WebSocket:', error);
      this.isConnecting = false;
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  private handleMessage(message: WebSocketMessage): void {
    const handlers = this.messageHandlers.get(message.type) || [];
    handlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error(`Error in message handler for ${message.type}:`, error);
      }
    });

    // Also call handlers for 'all' type
    const allHandlers = this.messageHandlers.get('all') || [];
    allHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in "all" message handler:', error);
      }
    });
  }

  on(messageType: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    this.messageHandlers.get(messageType)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(messageType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsClient = new WebSocketClient();

