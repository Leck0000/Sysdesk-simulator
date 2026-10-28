import { render, screen } from '@testing-library/react';
import { App } from '../main.tsx';

test('app mounts', () => {
  render(<App />);
  expect(screen.getByTestId('app-root')).toBeInTheDocument();
});