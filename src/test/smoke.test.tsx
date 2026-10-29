import { render, screen } from '@testing-library/react';
import { App } from '../app/App';

test('app mounts', () => {
  render(<App />);
  expect(screen.getByTestId('app-root')).toBeInTheDocument();
});