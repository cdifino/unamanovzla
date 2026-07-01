import { defineConfig } from 'vitest/config'

// Configuracion dedicada para pruebas unitarias. No carga el plugin de React
// porque las pruebas actuales cubren funciones puras (sin DOM ni JSX).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
})
