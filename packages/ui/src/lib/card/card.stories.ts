// `moduleMetadata` sale de `@storybook/angular-vite`, NUNCA de `@storybook/angular`:
// esa segunda es la vía webpack deprecada y no está instalada (ADR-017).
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { AegisCardComponent } from './card.component';
import { AegisButtonComponent } from '../button/button.component';

/**
 * Documentación viva de la Card. Contenedor puro: sin rol ARIA, sin foco, sin
 * estados. El tema (claro/oscuro) lo conmuta el toolbar de Storybook sobre
 * `[data-theme]`; el dark vive en los tokens (capa 2), nunca aquí.
 */
const meta: Meta<AegisCardComponent> = {
  title: 'Componentes/Card',
  component: AegisCardComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [AegisButtonComponent] })],
  argTypes: {
    padding: { control: 'inline-radio', options: ['none', 'sm', 'md', 'lg'] },
    elevation: { control: 'inline-radio', options: ['flat', 'raised'] },
  },
  args: { padding: 'md', elevation: 'flat' },
  render: (args) => ({
    props: args,
    template: `<aegis-card [padding]="padding" [elevation]="elevation" style="max-width: 22rem">
      <h3 style="margin: 0 0 0.5rem">Plan Pro</h3>
      <p style="margin: 0">Todo lo del plan gratuito, más colaboración en equipo.</p>
    </aegis-card>`,
  }),
};
export default meta;

type Story = StoryObj<AegisCardComponent>;

export const Default: Story = {};

export const Elevada: Story = { args: { elevation: 'raised' } };

/** Los cuatro pasos de padding. `none` existe para contenido a sangre (una imagen
 * de cabecera): la responsabilidad del espaciado pasa entonces al consumidor. */
export const Padding: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: start">
        <aegis-card padding="none"><div style="padding: .25rem">none</div></aegis-card>
        <aegis-card padding="sm">sm</aegis-card>
        <aegis-card padding="md">md</aegis-card>
        <aegis-card padding="lg">lg</aegis-card>
      </div>`,
  }),
};

/**
 * La semántica la aporta el CONSUMIDOR, no la Card: aquí, envolviéndola en una
 * `<section>` con su encabezado. La Card no aplica `role="region"` a propósito —
 * ocho tarjetas de feature serían ocho landmarks anónimos.
 */
export const SemanticaDelConsumidor: Story = {
  render: () => ({
    template: `
      <section aria-labelledby="precio-titulo">
        <aegis-card style="max-width: 22rem">
          <h3 id="precio-titulo" style="margin: 0 0 0.5rem">Plan Equipo</h3>
          <p style="margin: 0">La Card no decide el nivel del encabezado: lo decide tu página.</p>
        </aegis-card>
      </section>`,
  }),
};

/**
 * Card con contenido interactivo dentro. Es la alternativa a la "card clicable
 * entera", que queda fuera de alcance en v1 por sus trampas de a11y. El anillo de
 * foco del botón NO se recorta: la Card no aplica `overflow: hidden`.
 */
export const ConContenidoInteractivo: Story = {
  render: () => ({
    template: `
      <aegis-card elevation="raised" style="max-width: 22rem">
        <h3 style="margin: 0 0 0.5rem">Invita a tu equipo</h3>
        <p style="margin: 0 0 1rem">Comparte el espacio de trabajo con quien quieras.</p>
        <aegis-button>Enviar invitación</aegis-button>
      </aegis-card>`,
  }),
};
