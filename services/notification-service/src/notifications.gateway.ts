import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/ws' })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  handleConnection(client: Socket) { this.logger.log(`Client connected: ${client.id}`); }
  handleDisconnect(client: Socket) { this.logger.log(`Client disconnected: ${client.id}`); }

  @SubscribeMessage('join-tenant')
  joinTenant(@MessageBody() tenantId: string, @ConnectedSocket() client: Socket) {
    client.join(`tenant:${tenantId}`);
    return { event: 'joined', data: tenantId };
  }

  @SubscribeMessage('join-kitchen')
  joinKitchen(@MessageBody() tenantId: string, @ConnectedSocket() client: Socket) {
    client.join(`kitchen:${tenantId}`);
    return { event: 'joined-kitchen', data: tenantId };
  }

  emitToTenant(tenantId: string, event: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
  }
}
