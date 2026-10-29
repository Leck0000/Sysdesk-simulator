/**
 * LoginForm component — simple login form with email/password fields
 * 
 * Consumes: auth slice (login thunk, status, user), authApi (loginMutationThunk)
 * Produces: UI component with email/password inputs, submit button, error display
 * 
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
 * Accessibility: WCAG 2.1 AA — focus visible, ARIA labels, keyboard navigation.
 */

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { z } from 'zod';
import { login } from './slice';
import { selectIsLoggingIn } from './api';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Zod schema for form validation (boundary — never pass raw input downstream)
// ---------------------------------------------------------------------------

const LoginFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginFormValues = z.infer<typeof LoginFormSchema>;

// ---------------------------------------------------------------------------
// LoginForm component
// ---------------------------------------------------------------------------

export const LoginForm: React.FC = () => {
  const dispatch = useDispatch();

  // Read form state from Redux
  const isLoggingIn = useSelector(selectIsLoggingIn);

  // Local form state
  const [form, setForm] = useState<LoginFormValues>({
    email: '',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle input changes
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setError(null); // clear error on input change
  };

  // Handle form submission
  const onSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Validate with zod before dispatching
    const validationResult = LoginFormSchema.safeParse(form);
    if (!validationResult.success) {
      setError('Please enter a valid email and password.');
      setSubmitting(false);
      return;
    }

    try {
      // Dispatch the login thunk
      await login(validationResult.data)(dispatch);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="login-form" aria-label="Authentication">
      {/* Focus visible state is managed by CSS variables --fg, --bg, --accent, --border, --card */}
      <h2 className="login-form__title" aria-labelledby="login-title">
        Sign in
      </h2>

      {error && <p className="login-form__error" role="alert">{error}</p>}

      <div className="login-form__field-group" aria-label="Email address">
        <label htmlFor="email" className="login-form__label">
          Email<span className="login-form__required">*</span>
        </label>
        <input
          id="email"
          type="email"
          name="email"
          value={form.email}
          onChange={onChange}
          required
          aria-describedby="email-help-text"
          className="login-form__input"
        />
      </div>

      <div className="login-form__field-group" aria-label="Password">
        <label htmlFor="password" className="login-form__label">
          Password<span className="login-form__required">*</span>
        </label>
        <input
          id="password"
          type="password"
          name="password"
          value={form.password}
          onChange={onChange}
          required
          aria-describedby="password-help-text"
          className="login-form__input"
        />
      </div>

      <button
        type="submit"
        disabled={isLoggingIn || submitting}
        className="login-form__submit"
        aria-disabled={isLoggingIn || submitting}
      >
        {isLoggingIn || submitting ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
};
