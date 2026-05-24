import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://192.168.18.223:3000', 'http://192.168.18.223'],
    credentials: true,
  },
  path: '/socket.io',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`🔌 Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 Cliente desconectado: ${client.id}`);
  }

  // Porteiro entra em uma "sala" por tenant
  @SubscribeMessage('join-tenant')
  handleJoinTenant(client: Socket, tenantId: string) {
    client.join(`tenant:${tenantId}`);
    this.logger.log(`📺 Cliente ${client.id} entrou na sala tenant:${tenantId}`);
  }

  // Emitir atualização de status de visita
  emitVisitUpdated(tenantId: string, visit: any) {
    this.server.to(`tenant:${tenantId}`).emit('visit-updated', visit);
    this.logger.log(`📡 visit-updated emitido para tenant:${tenantId}`);
  }

  // Emitir aprovação — alerta sonoro na portaria
  emitVisitApproved(tenantId: string, visitId: string, visitorName: string) {
    this.server.to(`tenant:${tenantId}`).emit('visit-approved', { visitId, visitorName });
  }

  // Emitir rejeição
  emitVisitRejected(tenantId: string, visitId: string, visitorName: string, reason?: string) {
    this.server.to(`tenant:${tenantId}`).emit('visit-rejected', { visitId, visitorName, reason });
  }
}
