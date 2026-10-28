/**
 * TopBar component tests
 */
import { render, screen } from '@testing-library/react';
import { TopBar } from './TopBar';

describe('TopBar', () => {
  beforeEach(() => {
    // Set up default Redux store state
    Object.assign(store.getState(), {
      auth: {
        user: { id: '1', role: 'technician' as const, name: 'Test User' },
        roles: ['technician'],
      },
    });
  });

  it('renders the TopBar component', () => {
    render(<TopBar />);
    const title = screen.getByText('Ticket Queue');
    expect(title).toBeInTheDocument();
  });

  it('renders user name when user is authenticated', () => {
    render(<TopBar />);
    const userName = screen.getByText('Test User');
    expect(userName).toBeInTheDocument();
  });

  it('renders theme toggle button', () => {
    render(<TopBar />);
    const themeBtn = screen.getByRole('button', { name: /switch to light theme/i });
    expect(themeBtn).toBeInTheDocument();
  });
});
