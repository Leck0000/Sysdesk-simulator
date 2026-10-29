/**
 * Toaster component tests
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Toaster } from './Toaster';

describe('Toaster', () => {
  it('renders the Toaster component', () => {
    // Sonner mounts an aria-live "Notifications" region; individual toasts
    // only appear once toast() is called.
    const { container } = render(<Toaster />);
    const region = container.querySelector('section[aria-label^="Notifications"]');
    expect(region).not.toBeNull();
  });
});
