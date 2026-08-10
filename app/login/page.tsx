import { login, signInWithGoogle, signup } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const query = await searchParams;
  return (
    <main className="login-shell">
      <section className="login-brand">
        <p className="eyebrow">BALL PIT MOTORSPORTS</p>
        <h1>THE<br />GRID</h1>
        <p className="lede">Your track days, cars and questionable decisions—organized.</p>
        <div className="race-stripe" />
      </section>
      <section className="login-panel">
        <div className="login-card">
          <p className="eyebrow">PRIVATE MVP</p>
          <h2>Get on grid.</h2>
          <p className="muted">Sign in to the Ball Pit Motorsports workspace.</p>
          {query.error && <p className="alert">That did not work. Please try again.</p>}
          {query.message && <p className="success">Check your email to confirm your account.</p>}
          <form action={signInWithGoogle}>
            <button className="button google" type="submit">
              <span className="google-mark" aria-hidden="true">G</span>
              Continue with Google
            </button>
          </form>
          <div className="login-divider"><span>or use email</span></div>
          <form className="stack-form">
            <label>Email<input name="email" type="email" autoComplete="email" required /></label>
            <label>Password<input name="password" type="password" autoComplete="current-password" minLength={8} required /></label>
            <button className="button primary" formAction={login}>Log in</button>
            <button className="button ghost" formAction={signup}>Create account</button>
          </form>
          <p className="fine-print">Professional Ball Handlers only. For now.</p>
        </div>
      </section>
    </main>
  );
}
