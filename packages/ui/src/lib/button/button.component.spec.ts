import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { AegisButtonComponent } from './button.component';

describe('AegisButtonComponent', () => {
  it('proyecta el contenido en un aegis-button', async () => {
    await render(`<aegis-button>Hola</aegis-button>`, {
      imports: [AegisButtonComponent],
    });
    expect(screen.getByText('Hola')).toBeInTheDocument();
  });
});
