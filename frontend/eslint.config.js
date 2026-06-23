import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // El patrón de cargar datos al montar (useEffect → fetch → setState) es
      // legítimo en este MVP sin librería de fetching. La regla de la v7 lo marca
      // de más; se desactiva de forma consciente y acotada al proyecto.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
