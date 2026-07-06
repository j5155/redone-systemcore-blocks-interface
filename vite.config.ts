import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import ui from '@nuxt/ui/vite';

export default defineConfig({
  plugins: [
    vue(),
    ui({
      prose: true,
      colorMode: false,
      ui: {
        colors: {
          primary: 'teal',
          neutral: 'slate',
        },
      },
    }),
  ],
});
