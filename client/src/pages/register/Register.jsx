import { useState } from 'react';
import { Link } from 'react-router-dom';

import PulseLogo from '../../components/ui/PulseLogo.jsx';
import RegisterStep1 from './RegisterStep1.jsx';
import RegisterStep2 from './RegisterStep2.jsx';
import styles from '../../styles/AuthLayout.module.css';

export default function Register() {
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    verify: '',
    name: '',
    email: '',
    phone: '',
    city: '',
    company: '',
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  return (
    <div className={styles.page}>
      <div className={styles.heroPane}>
        <PulseLogo variant="hero" size={130} />
      </div>

      <div className={styles.formPane}>
        <div className={styles.card}>
          <header className={styles.cardHeader}>
            <h1 className={styles.cardTitle}>
              {step === 1 ? 'Create your Pulse account' : 'Tell us a bit about you'}
            </h1>
            <p className={styles.cardSubtitle}>
              {step === 1
                ? 'Pick a username and password to get started.'
                : 'This will appear on your profile.'}
            </p>
          </header>

          <div className={styles.steps} aria-hidden="true">
            <span className={`${styles.step} ${styles.stepActive}`}></span>
            <span className={`${styles.step} ${step === 2 ? styles.stepActive : ''}`}></span>
          </div>

          {step === 1 ? (
            <RegisterStep1
              formData={formData}
              onChange={handleChange}
              setStep={setStep}
            />
          ) : (
            <RegisterStep2
              formData={formData}
              onChange={handleChange}
              onBack={() => setStep(1)}
            />
          )}

          <footer className={styles.cardFooter}>
            Already have an account?{' '}
            <Link to="/login" className={styles.link}>Log in</Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
