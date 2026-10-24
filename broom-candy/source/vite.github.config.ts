import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({root:'github-client',base:'./',plugins:[react()],define:{'import.meta.env.VITE_ARENA_API':JSON.stringify('https://broom-candy-arena.hp8bkn2krr.chatgpt.site/arena-api')},build:{outDir:'../github-dist',emptyOutDir:true}});
