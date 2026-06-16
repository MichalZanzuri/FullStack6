import { useState } from 'react';
import { toast } from 'sonner';

import Dialog from '../ui/Dialog.jsx';
import Button from '../ui/Button.jsx';
import TextField from '../ui/TextField.jsx';
import { useAuth } from '../../context/useAuth.js';
import { changePassword as changePasswordReq } from '../../services/authService.js';
import styles from '../../styles/ProfileSheet.module.css';

// Three modes: read-only view, edit details, change password. The Info button
// opens this; the password is never shown (only changed). (שלב ג' + מתקדם)
export default function ProfileSheet({ user, onClose }) {
  const { updateProfile } = useAuth();
  const [mode, setMode] = useState('view'); // 'view' | 'edit' | 'password'
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  async function saveDetails(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateProfile({ name: form.name, email: form.email, phone: form.phone });
      toast('Details updated');
      setMode('view');
    } catch {
      toast("Couldn't update details.");
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    if (pw.next !== pw.confirm) {
      toast("New passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await changePasswordReq(user.id, pw.current, pw.next);
      toast('Password changed');
      setPw({ current: '', next: '', confirm: '' });
      setMode('view');
    } catch (err) {
      toast(err.message || "Couldn't change password.");
    } finally {
      setBusy(false);
    }
  }

  const viewSections = [
    { title: 'Identity', rows: [['Full name', user.name], ['Username', user.username]] },
    { title: 'Contact', rows: [['Email', user.email], ['Phone', user.phone]] },
    { title: 'Account', rows: [['Role', user.role || 'user']] },
  ];

  return (
    <Dialog title="Your account" onClose={onClose} size="md">
      <div className={styles.body}>
        {mode === 'view' && (
          <>
            {viewSections.map((section) => (
              <section key={section.title} className={styles.section}>
                <h3 className={styles.sectionTitle}>{section.title}</h3>
                <dl className={styles.rows}>
                  {section.rows.map(([label, value]) => (
                    <div key={label} className={styles.row}>
                      <dt className={styles.rowLabel}>{label}</dt>
                      <dd className={styles.rowValue}>
                        {value || <span className={styles.empty}>Not set</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
            <div className={styles.actions}>
              <Button variant="secondary" onClick={() => setMode('edit')}>Edit details</Button>
              <Button variant="secondary" onClick={() => setMode('password')}>Change password</Button>
            </div>
          </>
        )}

        {mode === 'edit' && (
          <form onSubmit={saveDetails} className={styles.section}>
            <h3 className={styles.sectionTitle}>Edit details</h3>
            <TextField label="Full name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="Email" type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextField label="Phone" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <div className={styles.actions}>
              <Button type="button" variant="ghost" onClick={() => setMode('view')} disabled={busy}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        )}

        {mode === 'password' && (
          <form onSubmit={savePassword} className={styles.section}>
            <h3 className={styles.sectionTitle}>Change password</h3>
            <TextField label="Current password" type="password" value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })} />
            <TextField label="New password" type="password" value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })} />
            <TextField label="Confirm new password" type="password" value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            <div className={styles.actions}>
              <Button type="button" variant="ghost" onClick={() => setMode('view')} disabled={busy}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</Button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
}
