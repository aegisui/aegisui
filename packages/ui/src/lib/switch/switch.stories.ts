import type { Meta, StoryObj } from '@storybook/angular-vite';
import { AegisSwitchComponent } from './switch.component';

/**
 * Documentación viva del Switch. Cubre los 3 tamaños × estados (off/on/disabled),
 * la etiqueta propia del componente y el pulgar bicolor. El tema (claro/oscuro) lo
 * conmuta el toolbar de Storybook sobre `[data-theme]`; el dark vive en los tokens
 * (capa 2), nunca aquí.
 */
const meta: Meta<AegisSwitchComponent> = {
  title: 'Componentes/Switch',
  component: AegisSwitchComponent,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    label: 'Notificaciones',
    size: 'md',
    checked: false,
    disabled: false,
  },
  render: (args) => ({
    props: args,
    template: `<aegis-switch
      [label]="label"
      [size]="size"
      [checked]="checked"
      [disabled]="disabled"
    />`,
  }),
};
export default meta;

type Story = StoryObj<AegisSwitchComponent>;

export const Default: Story = {};

export const Encendido: Story = { args: { checked: true } };

/** Los tres tamaños. El objetivo táctil es ≥24×24 px en los tres (2.5.8), aunque
 * la pista pintada de `sm` sea menor: el objetivo es el `<button>`, no el ornamento. */
export const Tamanos: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; align-items: start">
        <aegis-switch size="sm" label="Pequeño (sm)" checked />
        <aegis-switch size="md" label="Mediano (md)" checked />
        <aegis-switch size="lg" label="Grande (lg)" checked />
      </div>`,
  }),
};

/**
 * El pulgar cambia de color con el estado, y no es decoración: un pulgar blanco
 * sobre la pista apagada da 1.16:1 y falla 1.4.11. Off usa `border-strong`
 * (3.89:1) y on usa `accent.on-solid` (5.09:1). La pista apagada lleva además
 * borde obligatorio, porque su relleno da 1.16:1 contra el lienzo.
 */
export const PulgarBicolor: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 2rem">
        <aegis-switch label="Apagado" />
        <aegis-switch label="Encendido" checked />
      </div>`,
  }),
};

/** `disabled` es ortogonal a `checked`: una opción activa que no se puede cambiar
 * (p. ej. incluida en el plan) es una combinación válida. */
export const Deshabilitado: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 2rem">
        <aegis-switch label="Apagado y bloqueado" disabled />
        <aegis-switch label="Encendido y bloqueado" checked disabled />
      </div>`,
  }),
};
