import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { handleDocumentProxyRequest } from './src/lib/documentProxy';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const documentProxyTarget = env.DOCUMENT_PROXY_TARGET;
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
