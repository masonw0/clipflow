import { useState } from "react";
import { supabase } from "./supabase";

export default function Login({ onAuth, isInvite, successMessage }) {
  const [mode, setMode] = useState(isInvite ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  // Invite links lock the role. Manager invites override to "manager" via localStorage.
  const [role, setRole] = useState(() => {
    if (!isInvite) return "creator";
    return localStorage.getItem("pendingInviteRole") || "clipper";
  });
  const [resetEmail, setResetEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(successMessage || "");

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    if (mode === "signup" && !fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    setLoading(true);
    setError("");
    setInfo("");

    if (mode === "signup") {
      const pendingInviteRole = localStorage.getItem("pendingInviteRole");
      const effectiveRole = pendingInviteRole || role;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role: effectiveRole } },
      });

      console.log("[signup] full response — data:", data, "| error:", signUpError);
      console.log("[signup] error code:", signUpError?.code ?? "(none)", "| message:", signUpError?.message ?? "(none)");
      console.log("[signup] data.user:", data?.user ?? "(none)", "| identities:", data?.user?.identities ?? "(none)");

      if (signUpError) {
        const isDuplicate =
          signUpError.message.toLowerCase().includes("already registered") ||
          signUpError.message.toLowerCase().includes("already in use") ||
          signUpError.message.toLowerCase().includes("email already");

        console.log("[signup] isDuplicate detected:", isDuplicate, "| raw message:", signUpError.message);

        if (isDuplicate) {
          setInfo("An account with this email already exists — signing you in instead.");
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) {
            setInfo("");
            setError(signInError.message);
            setLoading(false);
            return;
          }
          const { data: profile } = await supabase
            .from("profiles").select("role").eq("id", signInData.user.id).single();
          onAuth({ user: signInData.user, role: profile?.role || "creator" });
        } else {
          setError(signUpError.message);
          setLoading(false);
        }
        return;
      }

      if (data.user) {
        console.log("[signup] no error — proceeding with user id:", data.user.id, "| identities length:", data.user.identities?.length);

        if (data.user.identities?.length === 0) {
          console.log("[signup] identities empty — email already exists, switching to sign in");
          setInfo("Account already exists — signing you in.");
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) {
            console.log("[signup] auto sign-in failed:", signInError.message);
            setInfo("");
            setError("An account with this email already exists. Please sign in instead.");
            setLoading(false);
            return;
          }
          const { data: profile } = await supabase
            .from("profiles").select("role").eq("id", signInData.user.id).single();
          onAuth({ user: signInData.user, role: profile?.role || "creator" });
          return;
        }

        await supabase
          .from("profiles")
          .upsert({ id: data.user.id, email, full_name: fullName, role: effectiveRole });
        onAuth({ user: data.user, role: effectiveRole });
      }
    } else {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", data.user.id).single();
      onAuth({ user: data.user, role: profile?.role || "creator" });
    }

    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) return;
    setLoading(true);
    setError("");
    setInfo("");
    const redirectTo = window.location.origin + "/";
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, { redirectTo });
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
    } else {
      setInfo("Check your email for a reset link.");
    }
  };

  // ─── Forgot password mode ─────────────────────────────────────────────────────
  if (mode === "forgot") {
    return (
      <div style={outerStyle}>
        <style>{baseStyle}</style>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <Logo />
          <h1 style={headingStyle}>Reset your password</h1>
          <p style={subStyle}>Enter your email and we'll send you a reset link.</p>

          <div style={{ marginBottom: 24 }}>
            <div style={labelStyle}>Email</div>
            <input
              type="email"
              value={resetEmail}
              onChange={e => setResetEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleForgotPassword()}
              placeholder="you@example.com"
              style={inputStyle}
              autoFocus
            />
          </div>

          {info && <InfoBox>{info}</InfoBox>}
          {error && <ErrorBox>{error}</ErrorBox>}

          <button
            onClick={handleForgotPassword}
            disabled={loading || !!info}
            style={submitStyle(loading || !!info)}
          >
            {loading ? "Sending…" : info ? "Link sent" : "Send reset link"}
          </button>

          <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#9ca3af" }}>
            <button onClick={() => { setMode("login"); setError(""); setInfo(""); }} style={toggleStyle}>
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Login / Signup mode ──────────────────────────────────────────────────────
  return (
    <div style={outerStyle}>
      <style>{baseStyle}</style>
      <div style={{ width: "100%", maxWidth: 400 }}>

        <Logo />

        <h1 style={headingStyle}>
          {isInvite
            ? (mode === "login" ? "Welcome back" : "You've been invited")
            : (mode === "login" ? "Welcome back" : "Create your account")}
        </h1>
        <p style={subStyle}>
          {isInvite
            ? (mode === "login"
                ? "Sign in to join the workspace."
                : "Create an account to join the creator's workspace as a clipper.")
            : (mode === "login"
                ? "Sign in to access your workspace."
                : "Get started with ClipFlow.")}
        </p>

        {/* Full name — signup only */}
        {mode === "signup" && (
          <div style={{ marginBottom: 14 }}>
            <div style={labelStyle}>Full Name</div>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your full name"
              style={inputStyle}
            />
          </div>
        )}

        {/* Email */}
        <div style={{ marginBottom: 14 }}>
          <div style={labelStyle}>Email</div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={inputStyle}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: mode === "signup" ? 18 : 10 }}>
          <div style={labelStyle}>Password</div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="••••••••"
            style={inputStyle}
          />
        </div>

        {/* Forgot password link — login mode only */}
        {mode === "login" && (
          <div style={{ marginBottom: 24, textAlign: "right" }}>
            <button
              onClick={() => { setMode("forgot"); setResetEmail(email); setError(""); setInfo(""); }}
              style={toggleStyle}
            >
              Forgot password?
            </button>
          </div>
        )}

        {/* Role picker — signup only, hidden on invite */}
        {mode === "signup" && !isInvite && (
          <div style={{ marginBottom: 24 }}>
            <div style={labelStyle}>I am a</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[["creator", "Creator"], ["clipper", "Clipper"]].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setRole(val)}
                  style={{
                    flex: 1, padding: "10px",
                    background: role === val ? "#fff" : "#0d0d0d",
                    color: role === val ? "#000" : "#525252",
                    border: `1px solid ${role === val ? "#fff" : "#262626"}`,
                    borderRadius: 7, fontSize: 13, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: "#303030", lineHeight: 1.6 }}>
              {role === "creator"
                ? "You upload footage and review clips from your team."
                : "You create and submit clips for your creator to review."}
            </div>
          </div>
        )}

        {info && <InfoBox>{info}</InfoBox>}
        {error && <ErrorBox>{error}</ErrorBox>}

        <button onClick={handleSubmit} disabled={loading} style={submitStyle(loading)}>
          {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
        </button>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#9ca3af" }}>
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button onClick={() => { setMode("signup"); setError(""); setInfo(""); }} style={toggleStyle}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => { setMode("login"); setError(""); setInfo(""); }} style={toggleStyle}>
                Sign in
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Password reset screen (shown when user lands via recovery email link) ────

export function PasswordResetScreen({ onComplete }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!newPassword.trim()) return;
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }
    onComplete();
  };

  return (
    <div style={outerStyle}>
      <style>{baseStyle}</style>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <Logo />
        <h1 style={headingStyle}>Set new password</h1>
        <p style={subStyle}>Enter a new password for your account.</p>

        <div style={{ marginBottom: 14 }}>
          <div style={labelStyle}>New Password</div>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="••••••••"
            style={inputStyle}
            autoFocus
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={labelStyle}>Confirm Password</div>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="••••••••"
            style={inputStyle}
          />
        </div>

        {error && <ErrorBox>{error}</ErrorBox>}

        <button onClick={handleSubmit} disabled={loading} style={submitStyle(loading)}>
          {loading ? "Updating…" : "Update Password"}
        </button>
      </div>
    </div>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 40 }}>
      <div style={{
        width: 28, height: 28, background: "#fff", borderRadius: 7,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, color: "#000",
      }}>✂</div>
      <span style={{ fontSize: 17, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>ClipFlow</span>
    </div>
  );
}

function InfoBox({ children }) {
  return (
    <div style={{
      marginBottom: 14, padding: "10px 12px",
      background: "rgba(163,163,163,0.06)", border: "1px solid rgba(163,163,163,0.2)",
      borderRadius: 6, fontSize: 12, color: "#a3a3a3",
    }}>
      {children}
    </div>
  );
}

function ErrorBox({ children }) {
  return (
    <div style={{
      marginBottom: 14, padding: "10px 12px",
      background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)",
      borderRadius: 6, fontSize: 12, color: "#f97316",
    }}>
      {children}
    </div>
  );
}

const outerStyle = {
  minHeight: "100vh", background: "#000",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "'DM Sans', 'Segoe UI', sans-serif", padding: "24px",
};

const baseStyle = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap');
  * { box-sizing: border-box; }
  input::placeholder { color: #6b7280; }
`;

const headingStyle = {
  fontSize: 22, fontWeight: 900, color: "#e5e5e5",
  margin: "0 0 6px", letterSpacing: "-0.03em",
};

const subStyle = {
  color: "#9ca3af", fontSize: 13, margin: "0 0 28px", lineHeight: 1.6,
};

const labelStyle = {
  fontSize: 11, fontWeight: 700, color: "#9ca3af",
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 7,
};

const inputStyle = {
  width: "100%", background: "#0d0d0d", border: "1px solid #1f1f1f",
  borderRadius: 7, padding: "10px 13px", color: "#e5e5e5",
  fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};

const submitStyle = (disabled) => ({
  width: "100%", padding: "12px",
  background: disabled ? "#111" : "#fff",
  color: disabled ? "#404040" : "#000",
  border: `1px solid ${disabled ? "#1f1f1f" : "#fff"}`,
  borderRadius: 7, fontSize: 13, fontWeight: 800,
  cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: "inherit", transition: "all 0.15s",
});

const toggleStyle = {
  background: "none", border: "none", color: "#a3a3a3",
  cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, padding: 0,
};
