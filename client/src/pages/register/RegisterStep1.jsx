import { useState } from 'react';

import TextField from '../../components/ui/TextField.jsx';
import Button from '../../components/ui/Button.jsx';
import { checkUsernameAvailable } from '../../services/authService.js';
import styles from '../../styles/AuthLayout.module.css';

const USERNAME_RE = /^[a-zA-Z0-9._]{3,20}$/;

export default function RegisterStep1({ formData, onChange, setStep }) {
  const [errors, setErrors] = useState({});

  async function validate() {
    const issues = {};
    if (!USERNAME_RE.test(formData.username.trim())) {
      issues.username =
        'Username can only include letters, numbers, dots, and underscores. 3-20 characters.';
    }
    if (formData.password.length < 6) issues.password = 'At least 6 characters.';
    if (formData.password !== formData.verify) issues.verify = "Passwords don't match.";

    // Only check the server when local validation passes — keeps requests low.
    // The endpoint returns just `{ available: boolean }`, never any user data.
    if (Object.keys(issues).length === 0) {
      const available = await checkUsernameAvailable(formData.username.trim()).catch(() => true);
      if (!available) issues.username = 'That username is already taken. Try another one.';
    }

    setErrors(issues);
    return Object.keys(issues).length === 0;
  }

  async function handleNext(e) {
    e.preventDefault();
    if (await validate()) setStep(2);
  }

  return (
    <form onSubmit={handleNext} className={styles.form} noValidate>
      <TextField
        name="username"
        label="Username"
        placeholder="e.g. shaked.h"
        value={formData.username}
        onChange={onChange}
        hint="3-20 chars · letters, numbers, dots, _"
        error={errors.username}
        autoFocus
      />
      <TextField
        name="password"
        type="password"
        label="Password"
        value={formData.password}
        onChange={onChange}
        hint="At least 6 characters."
        error={errors.password}
        autoComplete="new-password"
      />
      <TextField
        name="verify"
        type="password"
        label="Confirm password"
        value={formData.verify}
        onChange={onChange}
        error={errors.verify}
        autoComplete="new-password"
      />
      <Button type="submit" fullWidth>Continue →</Button>
    </form>
  );
}
