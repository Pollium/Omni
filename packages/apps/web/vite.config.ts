import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import typia from '@typia/unplugin/vite';
import { lingui } from '@lingui/vite-plugin';
import basicSsl from '@vitejs/plugin-basic-ssl';

const api = 'http://localhost:3001';

export default defineConfig({
    plugins: [
        typia({ tsconfig: './tsconfig.app.json', cache: true }),
        react(),
        babel({ plugins: ['@lingui/babel-plugin-lingui-macro'] }),
        lingui(),
        tailwindcss(),
        basicSsl()
    ],
    server: {
        port: 5176,
        proxy: {
            '/api': {
                target: api,
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, '')
            },
            '^/auth/oauth/[a-z]+/callback': {
                target: api,
                changeOrigin: true
            }
        }
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    }
});
