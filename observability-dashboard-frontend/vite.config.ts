import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'anomaly-incidents-api',
      configureServer(server) {
        server.middlewares.use('/api/incidents', (req, res) => {
          if (req.method !== 'GET') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Method Not Allowed' }));
            return;
          }

          const incidentsFile = path.resolve(
            process.cwd(),
            '../anomaly-detection-agent/outputs/incidents_latest.json',
          );

          try {
            if (!fs.existsSync(incidentsFile)) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error: 'incidents_latest.json not found',
                  expected_path: incidentsFile,
                }),
              );
              return;
            }

            const raw = fs.readFileSync(incidentsFile, 'utf-8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(raw);
          } catch (error) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: String(error),
              }),
            );
          }
        });
      },
    },
  ],
  base: '/',
  server: {
    port: 3009
  }
});
