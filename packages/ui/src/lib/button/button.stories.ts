import type { Meta, StoryObj } from '@storybook/angular-vite';
import { AegisButtonComponent } from './button.component';

/**
 * Documentación viva del Button. Cubre las 4 variantes × 3 tamaños × estados
 * (default/disabled/loading) e icono-solo. El tema (claro/oscuro) lo conmuta el
 * toolbar de Storybook sobre `[data-theme]`; el dark vive en los tokens (capa 2).
 */
const meta: Meta<AegisButtonComponent> = {
  title: 'Componentes/Button',
  component: AegisButtonComponent,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    type: { control: 'inline-radio', options: ['button', 'submit', 'reset'] },
  },
  args: {
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
    type: 'button',
  },
  render: (args) => ({
    props: args,
    template: `<aegis-button
      [variant]="variant"
      [size]="size"
      [disabled]="disabled"
      [loading]="loading"
      [type]="type"
    >Guardar cambios</aegis-button>`,
  }),
};
export default meta;

type Story = StoryObj<AegisButtonComponent>;

/** Playground: manipula todos los inputs desde los controles. */
export const Playground: Story = {};

export const Primary: Story = { args: { variant: 'primary' } };
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Danger: Story = { args: { variant: 'danger' } };

export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = { args: { disabled: true } };

/** Las 4 variantes × 3 tamaños de un vistazo. */
export const Matriz: Story = {
  render: () => ({
    template: `
      <div style="display:grid; gap:1rem;">
        @for (v of ['primary','secondary','ghost','danger']; track v) {
          <div style="display:flex; gap:.75rem; align-items:center;">
            @for (s of ['sm','md','lg']; track s) {
              <aegis-button [variant]="v" [size]="s">{{ v }} {{ s }}</aegis-button>
            }
          </div>
        }
      </div>
    `,
  }),
};

/** Icono-solo: exige `aria-label` (se reenvía al botón interno). */
export const IconoSolo: Story = {
  render: () => ({
    template: `<aegis-button variant="secondary" size="sm" aria-label="Cerrar">×</aegis-button>`,
  }),
};
