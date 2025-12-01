import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// REMPLACEZ 'NOM-DU-REPO' par le nom exact de votre dépôt GitHub (ex: 'TekNika-Portfolio')
const repoName = 'TekNika-Portfolio';

export default defineConfig({
  plugins: [react()],
  base: `/${repoName}/`, // Point de départ des ressources
});