import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '../context/useAuth.js';
import PulseLogo from '../components/ui/PulseLogo.jsx';
import Button from '../components/ui/Button.jsx';
import TextField from '../components/ui/TextField.jsx';
import styles from '../styles/AuthLayout.module.css';

export default function Login() {
  const { login, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from?.pathname || '/home';

  const [creds, setCreds] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // If the user is already logged in, bounce them straight to home.
  useEffect(() => {
    if (isLoggedIn) navigate('/home', { replace: true });
  }, [isLoggedIn, navigate]);

  function onChange(e) {
    setCreds((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined, _form: undefined }));
  }

  function validate() {
    const issues = {};
    if (!creds.username.trim()) issues.username = 'Enter a username';
    if (!creds.password) issues.password = 'Enter a password';
    setErrors(issues);
    return Object.keys(issues).length === 0;
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const u = await login(creds.username, creds.password);
      toast(`Welcome back, ${u.name?.split(' ')[0] || u.username}!`);
      navigate(fromPath, { replace: true });
    } catch (err) {
      setErrors({ _form: err.message || 'Could not log in.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.heroPane}>
        <PulseLogo variant="hero" size={140} />
      </div>

      <div className={styles.formPane}>
        <div className={styles.card}>
          <header className={styles.cardHeader}>
            <h1 className={styles.cardTitle}>Welcome back</h1>
            <p className={styles.cardSubtitle}>Log in to continue.</p>
          </header>

          <form onSubmit={onSubmit} className={styles.form} noValidate>
            <TextField
              name="username"
              label="Username"
              placeholder="Enter your username"
              autoComplete="username"
              value={creds.username}
              onChange={onChange}
              error={errors.username}
              autoFocus
            />
            <TextField
              name="password"
              type="password"
              label="Password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={creds.password}
              onChange={onChange}
              error={errors.password}
            />

            {errors._form && (
              <div role="alert" className={styles.formError}>
                {errors._form}
              </div>
            )}

            <Button type="submit" loading={submitting} fullWidth>
              {submitting ? 'Logging in…' : 'Log in'}
            </Button>
          </form>

          <footer className={styles.cardFooter}>
            Don't have an account?{' '}
            <Link to="/register" className={styles.link}>Sign up</Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
