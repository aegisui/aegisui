import type { Meta, StoryObj } from '@storybook/angular';
import { AegisSelectComponent } from './select.component';

interface Pais {
  id: number;
  label: string;
}

const paises: Pais[] = [
  { id: 1, label: 'Argentina' },
  { id: 2, label: 'Brasil' },
  { id: 3, label: 'Chile' },
  { id: 4, label: 'Colombia' },
  { id: 5, label: 'México' },
];

const muchos: Pais[] = Array.from({ length: 150 }, (_, i) => ({
  id: i + 1,
  label: `País ${i + 1}`,
}));

const meta: Meta<AegisSelectComponent<Pais>> = {
  title: 'Componentes/Select',
  component: AegisSelectComponent,
  args: {
    label: 'País',
    placeholder: 'Elige un país',
    options: paises,
    optionLabel: 'label',
  },
};
export default meta;

type Story = StoryObj<AegisSelectComponent<Pais>>;

export const Default: Story = {};

export const Selected: Story = {
  args: { value: paises[1] },
};

export const Open: Story = {
  args: { open: true, value: paises[1] },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Invalid: Story = {
  args: { invalid: true, errorMessage: 'Elige un país para continuar' },
};

export const Sizes: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="display:grid;gap:1rem">
        <aegis-select [label]="label" [placeholder]="placeholder" [options]="options"
                      [optionLabel]="optionLabel" size="sm" />
        <aegis-select [label]="label" [placeholder]="placeholder" [options]="options"
                      [optionLabel]="optionLabel" size="md" />
        <aegis-select [label]="label" [placeholder]="placeholder" [options]="options"
                      [optionLabel]="optionLabel" size="lg" />
      </div>
    `,
  }),
};

export const DisabledOptions: Story = {
  args: { open: true, disabledOptions: [paises[1], paises[3]] },
};

export const Truncated: Story = {
  args: { open: true, options: muchos, maxVisible: 100 },
};

export const Empty: Story = {
  args: { open: true, options: [] },
};
