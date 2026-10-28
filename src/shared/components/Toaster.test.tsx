/**
 * Toaster component tests
 */
import { render, screen } from '@testing-library/react';
import { Toaster } from './Toaster';

describe('Toaster', () => {
  it('renders the Toaster component', () => {
    const { container } = render(<Toaster />);
    const toaster = container.querySelector('.sonner-toast');
    expect(toaster).not.toBeNull();
  });
});
