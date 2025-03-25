import glsl from 'vite-plugin-glsl'
import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [
    glsl(),
    {
      name: 'copy-shaders',
      generateBundle(options, bundle) {
        const shaderPath = path.resolve(__dirname, 'src/shaders');
        const files = fs.readdirSync(shaderPath);
        files.forEach(file => {
          if (file.endsWith('.glsl')) {
            const content = fs.readFileSync(path.join(shaderPath, file), 'utf-8');
            this.emitFile({
              type: 'asset',
              fileName: `assets/scripts/shaders/${file}`,
              source: content
            });
          }
        });
      }
    }
  ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          let extType = path.extname(assetInfo.name);
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(extType)) {
            return 'assets/images/[name].[ext]';
          }
          if (/\.(woff2?|eot|ttf|otf)$/i.test(extType)) {
            return 'assets/fonts/[name].[ext]';
          }
          if (/\.css$/i.test(extType)) {
            return 'assets/styles/[name].[ext]';
          }
          if (/\.(glsl|vert|frag)$/i.test(extType)) {
            return 'assets/scripts/shaders/[name].[ext]';
          }
          return 'assets/[name].[ext]';
        },
        chunkFileNames: 'assets/scripts/[name].[hash].js',
        entryFileNames: 'assets/scripts/[name].[hash].js'
      }
    },
  }
});