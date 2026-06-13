import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { handleDocumentProxyRequest } from './api/document-proxy';
import { handleFeedbackNotificationRequest } from './api/feedback-notification';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const documentProxyTarget = env.DOCUMENT_PROXY_TARGET;
  process.env.APP_URL ||= env.APP_URL;
  process.env.TELEGRAM_BOT_TOKEN ||= env.TELEGRAM_BOT_TOKEN;
  process.env.TELEGRAM_CHAT_ID ||= env.TELEGRAM_CHAT_ID;
  process.env.TELEGRAM_MESSAGE_THREAD_ID ||= env.TELEGRAM_MESSAGE_THREAD_ID;

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'document-proxy-dev-middleware',
        configureServer(server) {
          server.middlewares.use('/api/document-proxy', async (req, res) => {
            const origin = `http://${req.headers.host ?? 'localhost:4000'}`;
            const request = new Request(new URL(req.url ?? '/api/document-proxy', origin).toString(), {
              method: req.method ?? 'GET',
              headers: req.headers as HeadersInit,
            });

            const response = await handleDocumentProxyRequest(request);
            res.statusCode = response.status;

            response.headers.forEach((value, key) => {
              res.setHeader(key, value);
            });

            if (!response.body) {
              res.end();
              return;
            }

            const buffer = Buffer.from(await response.arrayBuffer());
            res.end(buffer);
          });

          server.middlewares.use('/api/feedback-notification', async (req, res) => {
            const origin = `http://${req.headers.host ?? 'localhost:4000'}`;
            const chunks: Buffer[] = [];

            req.on('data', (chunk) => {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });

            req.on('end', async () => {
              const request = new Request(new URL(req.url ?? '/api/feedback-notification', origin).toString(), {
                method: req.method ?? 'POST',
                headers: req.headers as HeadersInit,
                body: chunks.length ? Buffer.concat(chunks).toString('utf-8') : undefined,
              });

              const response = await handleFeedbackNotificationRequest(request);
              res.statusCode = response.status;

              response.headers.forEach((value, key) => {
                res.setHeader(key, value);
              });

              const buffer = Buffer.from(await response.arrayBuffer());
              res.end(buffer);
            });
          });
        },
      },
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: documentProxyTarget
        ? {
            '/proxy/documentos': {
              target: documentProxyTarget,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/proxy\/documentos/, ''),
            },
          }
        : undefined,
    },
  };
});
