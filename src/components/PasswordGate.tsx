import { FormEvent, useState } from "react";
import { verifyAccessPassword } from "../api/access";

type PasswordGateProps = {
  onSuccess: () => void;
};

export function PasswordGate({ onSuccess }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsVerifying(true);

    try {
      await verifyAccessPassword(password);
      onSuccess();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not verify password."
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <section className="password-gate">
      <div className="password-gate-card">
        <p className="eyebrow">Protected area</p>
        <h1>Enter password to search jobs</h1>
        <p className="password-gate-copy">
          The job search page is restricted. Enter the access password to continue.
        </p>

        <form className="password-gate-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter access password"
              autoComplete="current-password"
              required
            />
          </label>

          {error && <p className="password-gate-error">{error}</p>}

          <button type="submit" className="search-button" disabled={isVerifying}>
            {isVerifying ? "Verifying..." : "Unlock search"}
          </button>
        </form>
      </div>
    </section>
  );
}
