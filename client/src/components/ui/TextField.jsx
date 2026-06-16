import { forwardRef } from 'react';
import styles from '../../styles/TextField.module.css';

const TextField = forwardRef(function TextField(
  { label, hint, error, id, className = '', ...rest },
  ref
) {
  const fieldId = id || rest.name;
  return (
    <div className={`${styles.field} ${className}`}>
      {label ? (
        <label htmlFor={fieldId} className={styles.label}>
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={fieldId}
        className={`${styles.input} ${error ? styles.inputError : ''}`}
        aria-invalid={!!error || undefined}
        aria-describedby={hint || error ? `${fieldId}-hint` : undefined}
        {...rest}
      />
      {(hint || error) && (
        <div
          id={`${fieldId}-hint`}
          className={`${styles.hint} ${error ? styles.hintError : ''}`}
        >
          {error || hint}
        </div>
      )}
    </div>
  );
});

export default TextField;
