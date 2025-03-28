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
    // origin: "http:localhost:5173", // Defines the allowed origin
    // hmr: {
    //   protocol: "wss", 
    //   clientPort: 443, // Ensures HMR works with ngrok
    //   path: "/vite-hmr",
    //   host: "localhost", // Allows access from external networks
    // },
 
  },
  
})
