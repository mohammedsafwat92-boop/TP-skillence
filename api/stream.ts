import type { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

export default function handler(req: any, res: any) {
  if (req.headers.upgrade !== 'websocket') {
    return res.status(400).send('Expected Upgrade: websocket');
  }

  const server = res.socket?.server;
  if (!server) {
    return res.status(500).send('Socket server not found');
  }

  // Ensure we only create the WebSocket Server once per lambda instance lifecycle
  if (!server.wss) {
    console.log('[Gemini Proxy] Initializing WebSocketServer within Node context...');
    server.wss = new WebSocketServer({ noServer: true });

    server.wss.on('connection', (clientWs: WebSocket, request: IncomingMessage) => {
      const incomingUrl = request.url || "";
      const cleanPath = incomingUrl.replace(/^\/api\/stream/, '');
      const targetUrl = `wss://generativelanguage.googleapis.com${cleanPath}`;

      const parsedUrl = new URL(targetUrl);
      const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
      if (apiKey) {
        parsedUrl.searchParams.set('key', apiKey);
      }
      const finalTargetUrl = parsedUrl.toString();

      console.log('[Gemini Proxy] Establishing secure remote WebSocket connection...');

      // Overriding Origin to mask Vercel Origin and utilize Gemini directly
      const geminiWs = new WebSocket(finalTargetUrl, {
        headers: {
          'Origin': 'https://generativelanguage.googleapis.com'
        }
      });

      // Secure duplex channel piping
      geminiWs.on('open', () => {
        console.log('[Gemini Proxy] Remote gateway successfully joined');
      });

      clientWs.on('message', (data, isBinary) => {
        if (geminiWs.readyState === WebSocket.OPEN) {
          geminiWs.send(data, { binary: isBinary });
        }
      });

      geminiWs.on('message', (data, isBinary) => {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(data, { binary: isBinary });
        }
      });

      clientWs.on('close', () => {
        console.log('[Gemini Proxy] Client WebSocket closed');
        geminiWs.close();
      });

      geminiWs.on('close', () => {
        console.log('[Gemini Proxy] Remote gateway closed');
        clientWs.close();
      });

      clientWs.on('error', (err) => {
        console.error('[Gemini Proxy] Client socket exception:', err);
        geminiWs.close();
      });

      geminiWs.on('error', (err) => {
        console.error('[Gemini Proxy] Gateway exceptions occurred:', err);
        clientWs.close();
      });
    });

    server.on('upgrade', (request: any, socket: any, head: any) => {
      if (request.url?.includes('/api/stream')) {
        server.wss.handleUpgrade(request, socket, head, (ws: any) => {
          server.wss.emit('connection', ws, request);
        });
      }
    });
  }

  res.end();
}
