import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    base: '/', // Important: ensures correct public path
    server: {
        port: 5173
    }
});