import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { db } from './db';
import { deviceTokens } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface ClientConnection {
  ws: WebSocket;
  userId: string;
  lastPing: number;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ClientConnection> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  initialize(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      console.log('New WebSocket connection');

      // Extract userId from query string or headers
      const url = new URL(req.url || '', 'http://localhost');
      const userId = url.searchParams.get('userId');

      if (!userId) {
        console.warn('WebSocket connection without userId, closing');
        ws.close(1008, 'User ID required');
        return;
      }

      const connection: ClientConnection = {
        ws,
        userId,
        lastPing: Date.now(),
      };

      this.clients.set(userId, connection);

      ws.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(userId, data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log(`WebSocket connection closed for user ${userId}`);
        this.clients.delete(userId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for user ${userId}:`, error);
        this.clients.delete(userId);
      });

      // Send ping to keep connection alive
      ws.send(JSON.stringify({ type: 'connected', userId }));
    });

    // Ping clients every 30 seconds to keep connections alive
    this.pingInterval = setInterval(() => {
      this.pingClients();
    }, 30000);

    console.log('WebSocket server initialized');
  }

  private handleMessage(userId: string, data: any): void {
    if (data.type === 'ping') {
      const connection = this.clients.get(userId);
      if (connection) {
        connection.lastPing = Date.now();
        connection.ws.send(JSON.stringify({ type: 'pong' }));
      }
    }
  }

  private pingClients(): void {
    const now = Date.now();
    const timeout = 60000; // 60 seconds

    for (const [userId, connection] of this.clients.entries()) {
      if (now - connection.lastPing > timeout) {
        console.log(`Closing stale connection for user ${userId}`);
        connection.ws.close();
        this.clients.delete(userId);
      } else if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.ping();
      }
    }
  }

  /**
   * Send message to a specific user
   */
  sendToUser(userId: string, message: any): boolean {
    const connection = this.clients.get(userId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      try {
        connection.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error(`Error sending message to user ${userId}:`, error);
        return false;
      }
    }
    return false;
  }

  /**
   * Broadcast message to multiple users
   */
  sendToUsers(userIds: string[], message: any): { sent: number; failed: number } {
    let sent = 0;
    let failed = 0;

    for (const userId of userIds) {
      if (this.sendToUser(userId, message)) {
        sent++;
      } else {
        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(message: any): void {
    for (const connection of this.clients.values()) {
      if (connection.ws.readyState === WebSocket.OPEN) {
        try {
          connection.ws.send(JSON.stringify(message));
        } catch (error) {
          console.error('Error broadcasting message:', error);
        }
      }
    }
  }

  shutdown(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    for (const connection of this.clients.values()) {
      connection.ws.close();
    }

    this.clients.clear();

    if (this.wss) {
      this.wss.close();
    }
  }
}

export const wsManager = new WebSocketManager();

