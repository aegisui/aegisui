import type { Decorator, Preview } from '@storybook/angular-vite';

// Requiere `pnpm nx run tokens:build` antes de arrancar Storybook (igual que
// apps/sandbox, que referencia el mismo artefacto por ruta relativa).
import '../dist/packages/tokens/tokens.css';
import './preview.css';

const withTheme: Decorator = (story, context) => {
  document.documentElement.setAttribute('data-theme', context.globals['theme']);
  return story();
};

const preview: Preview = {
  parameters: {
    backgrounds: { disable: true },
  },
  globalTypes: {
    theme: {
      description: 'Tema (capa 2, §5.2)',
      toolbar: {
        title: 'Tema',
        icon: 'circlehollow',
        items: [
          { value: 'light', icon: 'sun', title: 'Claro' },
          { value: 'dark', icon: 'moon', title: 'Oscuro' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  decorators: [withTheme],
};

export default preview;
