import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  server: {
    host: "0.0.0.0", // Allows access from external networks
    port: 5173, // Default Vite port
    strictPort: true, // Ensures the port does not change
    cors: true, // Enables CORS
    origin: "https://06ca-103-134-102-70.ngrok-free.app", // Defines the allowed origin
    hmr: {
      clientPort: 443, // Ensures HMR works with ngrok
    },
  },
  
})
