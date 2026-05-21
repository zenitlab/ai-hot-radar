import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
})
export class HotspotGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected:', client.id);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, keywords: string[]): void {
    keywords.forEach(kw => client.join(`keyword:${kw}`));
    console.log(`Socket ${client.id} subscribed to:`, keywords);
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket, keywords: string[]): void {
    keywords.forEach(kw => client.leave(`keyword:${kw}`));
  }
}
