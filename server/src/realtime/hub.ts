import { IncomingMessage, Server } from 'http';
import { Duplex } from 'stream';
import { WebSocket, WebSocketServer } from 'ws';
import { userFromToken } from '../middleware/auth';

/**
 * Живые обновления: новые сообщения и уведомления приходят сразу,
 * без опроса. Клиент подключается к /api/ws и первым сообщением
 * присылает {type: 'auth', token} — токен не попадает в адрес и логи.
 * Если сокет недоступен, клиент продолжает работать опросом.
 */
const sockets = new Map<string, Set<WebSocket>>();
const AUTH_TIMEOUT_MS = 5000;
const HEARTBEAT_MS = 30000;

type Payload = Record<string, unknown> & { type: string };

export const pushTo = (userIds: Iterable<string>, payload: Payload) => {
  const data = JSON.stringify(payload);
  for (const userId of new Set(userIds)) {
    for (const socket of sockets.get(userId) ?? []) {
      if (socket.readyState === WebSocket.OPEN) socket.send(data);
    }
  }
};

/** Принудительно закрыть сокеты пользователя — например, при блокировке */
export const disconnectUser = (userId: string) => {
  for (const socket of sockets.get(userId) ?? []) socket.close(4001, 'logged out');
};

export const connectedCount = () => [...sockets.values()].reduce((sum, set) => sum + set.size, 0);

export const attachRealtime = (server: Server) => {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });
  const alive = new WeakMap<WebSocket, boolean>();

  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (!request.url?.startsWith('/api/ws')) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request));
  });

  wss.on('connection', (ws: WebSocket) => {
    let userId: string | null = null;
    alive.set(ws, true);
    ws.on('pong', () => alive.set(ws, true));

    const timer = setTimeout(() => {
      if (!userId) ws.close(4001, 'auth timeout');
    }, AUTH_TIMEOUT_MS);

    ws.on('message', async (raw) => {
      if (userId) return; // после входа клиент ничего не шлёт
      let message: { type?: string; token?: string } = {};
      try {
        message = JSON.parse(String(raw));
      } catch {
        // не JSON — закроем ниже
      }
      const user = message.type === 'auth' ? await userFromToken(message.token) : null;
      if (!user || user.isBlocked) {
        ws.close(4001, 'unauthorized');
        return;
      }
      clearTimeout(timer);
      userId = user.id;
      const set = sockets.get(user.id) ?? new Set<WebSocket>();
      set.add(ws);
      sockets.set(user.id, set);
      ws.send(JSON.stringify({ type: 'ready' }));
    });

    ws.on('close', () => {
      clearTimeout(timer);
      if (!userId) return;
      const set = sockets.get(userId);
      set?.delete(ws);
      if (set && !set.size) sockets.delete(userId);
    });
  });

  // Пинг выкидывает «мёртвые» соединения — телефон ушёл из сети, не закрыв сокет
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!alive.get(ws)) {
        ws.terminate();
        continue;
      }
      alive.set(ws, false);
      ws.ping();
    }
  }, HEARTBEAT_MS);
  heartbeat.unref();

  return wss;
};
