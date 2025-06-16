import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    exclude: ["c2pa", "@contentauth/react-hooks"],
  },
  plugins: [react()],
});
