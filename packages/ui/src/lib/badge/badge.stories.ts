import type { Meta, StoryObj } from '@storybook/angular-vite';
import { AegisBadgeComponent } from './badge.component';

/**
 * Documentación viva del Badge. Etiqueta corta de estado o categoría: sin
 * interacción, sin foco, sin teclado. El tema (claro/oscuro) lo conmuta el
 * toolbar de Storybook sobre `[data-theme]`; el dark vive en los tokens (capa 2).
 */
const meta: Meta<AegisBadgeComponent> = {
  title: 'Componentes/Badge',
  component: AegisBadgeComponent,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['neutral', 'accent', 'success', 'warning', 'danger'],
    },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
  },
  args: { variant: 'neutral', size: 'md' },
  render: (args) => ({
    props: args,
    template: `<aegis-badge [variant]="variant" [size]="size">Activo</aegis-badge>`,
  }),
};
export default meta;

type Story = StoryObj<AegisBadgeComponent>;

export const Default: Story = {};

/**
 * Las cinco variantes son TINTE + texto oscuro, nunca sólido con texto blanco
 * (ADR-014/015). Un badge es estado, no acción: `danger` mapea a `state.danger.*`
 * y jamás a `destructive.*`, que es la acción que borra.
 */
export const Variantes: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center">
        <aegis-badge variant="neutral">Borrador</aegis-badge>
        <aegis-badge variant="accent">Beta</aegis-badge>
        <aegis-badge variant="success">Activo</aegis-badge>
        <aegis-badge variant="warning">Caduca pronto</aegis-badge>
        <aegis-badge variant="danger">Caducado</aegis-badge>
      </div>`,
  }),
};

export const Tamanos: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 0.5rem; align-items: center">
        <aegis-badge variant="success" size="sm">sm</aegis-badge>
        <aegis-badge variant="success" size="md">md</aegis-badge>
      </div>`,
  }),
};

/**
 * **Regla de uso obligatoria (1.4.1):** el color es refuerzo, nunca el portador
 * del significado. Cinco badges que solo se distinguen por color violan 1.4.1 —
 * el componente no puede impedirlo, así que se documenta.
 */
export const ElColorNoComunicaSolo: Story = {
  render: () => ({
    template: `
      <div style="display: grid; gap: 1rem">
        <div>
          <p style="margin: 0 0 .5rem"><strong>❌ Mal:</strong> solo el color distingue</p>
          <div style="display: flex; gap: 0.5rem">
            <aegis-badge variant="success">Estado</aegis-badge>
            <aegis-badge variant="warning">Estado</aegis-badge>
            <aegis-badge variant="danger">Estado</aegis-badge>
          </div>
        </div>
        <div>
          <p style="margin: 0 0 .5rem"><strong>✅ Bien:</strong> el texto distingue, el color refuerza</p>
          <div style="display: flex; gap: 0.5rem">
            <aegis-badge variant="success">Activo</aegis-badge>
            <aegis-badge variant="warning">Caduca pronto</aegis-badge>
            <aegis-badge variant="danger">Caducado</aegis-badge>
          </div>
        </div>
      </div>`,
  }),
};

/**
 * Uso decorativo: cuando el badge DUPLICA lo que ya dice el texto adyacente, el
 * consumidor lo oculta con `aria-hidden="true"`. Funciona sin ayuda del
 * componente porque el Badge no es enfocable ni contiene nada enfocable.
 * **Advertencia:** ocultar un badge con información ÚNICA la elimina para el
 * usuario de lector de pantalla. `aria-hidden` es para redundancia.
 */
export const Decorativo: Story = {
  render: () => ({
    template: `
      <p style="display: flex; gap: 0.5rem; align-items: center; margin: 0">
        Plan Pro
        <aegis-badge variant="accent" aria-hidden="true">Pro</aegis-badge>
      </p>`,
  }),
};
