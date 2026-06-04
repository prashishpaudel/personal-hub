"use client";

import { useState } from "react";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  // Surface middleware redirect errors (e.g. ?error=unauthorized)
  const initialError =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("error")
      : null;

  async function sendLink(event: React.FormEvent) {
    event.preventDefault();

    if (!isSupabaseConfigured || !supabase) {
      setStatus("error");
      setMessage("Auth is not configured yet. Add Supabase env vars.");
      return;
    }

    setStatus("sending");
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-lg font-semibold text-white">
            ph
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Personal Hub
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Sign in with a magic link.
          </p>
        </div>

        {status === "sent" ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-bg-elevated px-6 py-8 text-center">
            <CheckCircle2 size={28} className="text-accent-text" />
            <p className="text-sm font-medium">Check your inbox</p>
            <p className="text-sm text-text-muted">
              We sent a sign-in link to{" "}
              <span className="text-text">{email}</span>.
            </p>
          </div>
        ) : (
          <form
            onSubmit={sendLink}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-bg-elevated p-5"
          >
            <label className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2.5 focus-within:border-border-strong">
              <Mail size={18} className="text-text-faint" />
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-transparent text-sm outline-none placeholder:text-text-faint"
              />
            </label>

            <button
              type="submit"
              disabled={status === "sending"}
              className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {status === "sending" && (
                <Loader2 size={16} className="animate-spin" />
              )}
              Send magic link
            </button>

            {(status === "error" || initialError) && (
              <p className="text-center text-sm text-accent-text">
                {message ||
                  (initialError === "unauthorized"
                    ? "That account isn't allowed here."
                    : "Something went wrong. Try again.")}
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
