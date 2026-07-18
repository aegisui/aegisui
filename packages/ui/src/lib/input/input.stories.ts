import type { Meta, StoryObj } from '@storybook/angular-vite';
import { AegisInputComponent } from './input.component';

/**
 * Documentación viva del Input. Cubre los 3 tamaños × estados (default/disabled/
 * readonly/invalid), la etiqueta propia del componente y el mensaje de error con
 * `role="alert"`. El tema (claro/oscuro) lo conmuta el toolbar de Storybook sobre
 * `[data-theme]`; el dark vive en los tokens (capa 2).
 */
const meta: Meta<AegisInputComponent> = {
  title: 'Componentes/Input',
  component: AegisInputComponent,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'search', 'tel', 'url', 'number'],
    },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    required: { control: 'boolean' },
    invalid: { control: 'boolean' },
  },
  args: {
    label: 'Correo electrónico',
    type: 'email',
    size: 'md',
    placeholder: 'tu@empresa.com',
    disabled: false,
    readonly: false,
    required: false,
    invalid: false,
  },
  render: (args) => ({
    props: args,
    template: `<aegis-input
      [label]="label"
      [type]="type"
      [size]="size"
      [placeholder]="placeholder"
      [disabled]="disabled"
      [readonly]="readonly"
      [required]="required"
      [invalid]="invalid"
      [helpText]="helpText"
      [errorMessage]="errorMessage"
    />`,
  }),
};
export default meta;

type Story = StoryObj<AegisInputComponent>;

/** Playground: manipula todos los inputs desde los controles. */
export const Playground: Story = {};

export const ConAyuda: Story = {
  args: { helpText: 'Usaremos este correo para notificarte cambios en tu pedido.' },
};

export const Invalido: Story = {
  args: {
    invalid: true,
    errorMessage: 'Introduce un correo con formato válido (nombre@dominio.com).',
    value: 'no-es-un-correo',
  },
};

export const Requerido: Story = {
  args: { required: true },
};

export const Deshabilitado: Story = {
  args: { disabled: true, value: 'sin.edicion@empresa.com' },
};

export const SoloLectura: Story = {
  args: { readonly: true, value: 'precargado@empresa.com' },
};

/** Los 3 tamaños de un vistazo. */
export const Tamanos: Story = {
  render: () => ({
    template: `
      <div style="display:flex; flex-direction:column; gap:1rem; max-inline-size: 20rem;">
        @for (s of ['sm','md','lg']; track s) {
          <aegis-input [label]="'Tamaño ' + s" [size]="s" placeholder="Escribe aquí" />
        }
      </div>
    `,
  }),
};
