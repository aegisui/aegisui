import type { Meta, StoryObj } from '@storybook/angular';
import { AegisButtonComponent } from './button.component';

const meta: Meta<AegisButtonComponent> = {
  title: 'Componentes/Button',
  component: AegisButtonComponent,
};
export default meta;

type Story = StoryObj<AegisButtonComponent>;

export const Default: Story = {
  render: () => ({ template: `<aegis-button>Aegis Button</aegis-button>` }),
};
