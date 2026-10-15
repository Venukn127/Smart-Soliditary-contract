import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LockKeyhole, ScanSearch, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase';

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const isRegister = mode === 'register';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { user, configured } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (user) navigate('/scan');
  }, [navigate, user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }
    if (isRegister && password !== confirmPassword) {
      setError('Those passwords do not match.');
      return;
    }
    if (!supabase) {
      setError('Supabase is not configured. Add the project URL and publishable key to the app environment.');
      return;
    }

    setBusy(true);
    try {
      if (isRegister) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: `${window.location.origin}/scan` },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          navigate('/scan');
        } else {
          setNotice('Account created. Check your inbox and confirm your email before signing in.');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (signInError) throw signInError;
        navigate('/scan');
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Authentication failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <aside className="auth-story">
        <Link href="/" className="auth-brand"><span className="marketing-mark"><ScanSearch size={18} /></span> Smart Contract Scanner</Link>
        <div className="auth-story-content"><span className="section-overline">A CLEARER FIRST PASS</span><h1>Build with<br /><em>more confidence.</em></h1><p>Understand common Solidity security signals and know what to investigate in your next review.</p><div className="auth-story-note"><ShieldCheck size={18} /><span><b>Your code stays yours.</b><small>Contract scanning runs locally in your browser.</small></span></div></div>
        <div className="auth-story-footer">SMART CONTRACT SCANNER <span>·</span> SOLIDITY REVIEW</div>
      </aside>
      <main className="auth-main">
        <Link className="auth-back" href="/"><ArrowLeft size={15} /> Back to home</Link>
        <div className="auth-card-wrap"><div className="auth-card">
          <div className="auth-mobile-mark"><span className="marketing-mark"><ScanSearch size={18} /></span><span>SMART CONTRACT SCANNER</span></div>
          <div className="auth-eyebrow">{isRegister ? 'YOUR NEXT REVIEW STARTS HERE' : 'WELCOME BACK'}</div>
          <h2>{isRegister ? 'Create your account' : 'Good to see you again.'}</h2>
          <p className="auth-subtitle">{isRegister ? 'Save your place and get ready to explore.' : 'Sign in to continue to your workspace.'}</p>
          {!configured && <div className="auth-message info" role="status">Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to Replit Secrets to enable account access.</div>}
          <form onSubmit={submit} noValidate>
            <label className="auth-label" htmlFor="auth-email">Email address</label>
            <input id="auth-email" className="auth-input" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <div className="auth-password-label"><label className="auth-label" htmlFor="auth-password">Password</label></div>
            <div className="auth-password-wrap"><input id="auth-password" className="auth-input" type={showPassword ? 'text' : 'password'} autoComplete={isRegister ? 'new-password' : 'current-password'} placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} /><button className="password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
            {isRegister && <><label className="auth-label confirm-label" htmlFor="auth-confirm">Confirm password</label><input id="auth-confirm" className="auth-input" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Enter your password again" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></>}
            {error && <div className="auth-message error" role="alert">{error}</div>}
            {notice && <div className="auth-message info" role="status"><Check size={16} /> {notice}</div>}
            <button className="auth-submit" type="submit" disabled={busy || !configured}>{busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'} {!busy && <ArrowRight size={16} />}</button>
          </form>
          <div className="auth-switch">{isRegister ? 'Already have an account?' : 'New to Smart Contract Scanner?'} <Link href={isRegister ? '/login' : '/register'}>{isRegister ? 'Log in' : 'Create an account'}</Link></div>
          <div className="auth-divider"><span>BUILT FOR BUILDERS</span></div>
          <div className="auth-trust"><LockKeyhole size={14} /> <span>Email and password sign-in is handled by Supabase Auth.</span></div>
        </div><Link href="/scan" className="auth-try">Want to explore first? <b>Try the scanner</b> <ArrowRight size={14} /></Link></div>
        <div className="auth-bottom"><span>LOCAL SCAN · NO SOURCE UPLOAD</span><span>LEARNING AID · NOT A SECURITY AUDIT</span></div>
      </main>
    </div>
  );
}
