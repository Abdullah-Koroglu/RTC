import fp from 'fastify-plugin';
import websocket from '@fastify/websocket';

export const websocketPlugin = fp(async (app) => {
  await app.register(websocket, {
    options: {
      maxPayload: 1024 * 1024,
    },
  });

  app.get('/ws', { websocket: true }, (connection) => {
    connection.socket.send(JSON.stringify({ type: 'ready' }));

    connection.socket.on('message', (raw) => {
      connection.socket.send(raw.toString());
    });
  });
});
