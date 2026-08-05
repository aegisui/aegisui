import type { Meta, StoryObj } from '@storybook/angular';
import { AegisComboboxComponent } from './combobox.component';

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

const meta: Meta<AegisComboboxComponent<Pais>> = {
  title: 'Componentes/Combobox',
  component: AegisComboboxComponent,
  args: {
    label: 'País',
    placeholder: 'Busca un país',
    options: paises,
    optionLabel: 'label',
  },
};
export default meta;

type Story = StoryObj<AegisComboboxComponent<Pais>>;

export const Default: Story = {};

export const Selected: Story = {
  args: { value: paises[1] },
};

export const Filtering: Story = {
  args: { open: true },
};

export const Empty: Story = {
  args: { open: true, options: [] },
};

export const Truncated: Story = {
  args: { open: true, options: muchos, maxVisible: 100 },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const InvalidOpen: Story = {
  args: { open: true, invalid: true, errorMessage: 'Elige un país para continuar' },
};

export const Floating: Story = {
  args: { open: true, labelMode: 'floating' },
};

export const Sizes: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="display:grid;gap:1rem">
        <aegis-combobox [label]="label" [placeholder]="placeholder" [options]="options"
                        [optionLabel]="optionLabel" size="sm" />
        <aegis-combobox [label]="label" [placeholder]="placeholder" [options]="options"
                        [optionLabel]="optionLabel" size="md" />
        <aegis-combobox [label]="label" [placeholder]="placeholder" [options]="options"
                        [optionLabel]="optionLabel" size="lg" />
      </div>
    `,
  }),
};
