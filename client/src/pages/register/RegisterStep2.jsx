import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import TextField from '../../components/ui/TextField.jsx';
import Button from '../../components/ui/Button.jsx';
import { useAuth } from '../../context/useAuth.js';
import styles from '../../styles/AuthLayout.module.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterStep2({ formData, onChange, onBack }) {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const issues = {};
    if (!formData.name.trim()) issues.name = 'Add your full name';
    if (!EMAIL_RE.test(formData.email)) issues.email = 'Enter a valid email address.';
    setErrors(issues);
    return Object.keys(issues).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const created = await register({
        name: formData.name.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        // Password is stored in `website` per the assignment's auth scheme.
        website: formData.password,
        address: { city: formData.city.trim() || null },
        company: { name: formData.company.trim() || null },
      });
      toast(`Welcome to Pulse, ${created.name.split(' ')[0]}!`);
      navigate('/home', { replace: true });
    } catch (err) {
      setErrors({ _form: err.message || 'Could not create your account.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <TextField
        name="name"
        label="Full name"
        placeholder="e.g. Maya Cohen"
        value={formData.name}
        onChange={onChange}
        error={errors.name}
        autoFocus
      />
      <TextField
        name="email"
        type="email"
        label="Email"
        placeholder="you@example.com"
        value={formData.email}
        onChange={onChange}
        error={errors.email}
      />
      <div className={styles.formGrid}>
        <TextField name="phone" label="Phone" placeholder="Optional" value={formData.phone} onChange={onChange} />
        <TextField name="city" label="City" placeholder="Optional" value={formData.city} onChange={onChange} />
      </div>
      <TextField name="company" label="Company" placeholder="Optional" value={formData.company} onChange={onChange} />

      {errors._form && (
        <div role="alert" className={styles.formError}>{errors._form}</div>
      )}

      <div className={styles.actionRow}>
        <Button variant="secondary" type="button" onClick={onBack}>← Back</Button>
        <Button type="submit" loading={submitting} fullWidth>
          {submitting ? 'Creating account…' : 'Create my account'}
        </Button>
      </div>
    </form>
  );
}
