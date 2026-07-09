"use client";

// In-app replacements for window.confirm / window.prompt. Both are async:
//   const ok = await confirm({ message: "Delete?" , danger: true });
//   const url = await prompt({ title: "Link URL", defaultValue: "https://" });
// A single modal is rendered here; pages call the hooks from useDialog().

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type ConfirmOptions = {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type PromptOptions = {
  title?: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
};

type DialogApi = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  prompt: (opts: PromptOptions) => Promise<string | null>;
};

type Active =
  | { kind: "confirm"; opts: ConfirmOptions }
  | { kind: "prompt"; opts: PromptOptions }
  | null;

const DialogContext = createContext<DialogApi | null>(null);

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within <DialogProvider>");
  return ctx;
}

export default function DialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [active, setActive] = useState<Active>(null);
  const [value, setValue] = useState("");
  // Resolves the promise for whichever dialog is open.
  const resolveRef = useRef<((result: unknown) => void) | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback((result: unknown) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setActive(null);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve as (r: unknown) => void;
      setActive({ kind: "confirm", opts });
    });
  }, []);

  const prompt = useCallback((opts: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      resolveRef.current = resolve as (r: unknown) => void;
      setValue(opts.defaultValue ?? "");
      setActive({ kind: "prompt", opts });
    });
  }, []);

  // Focus the input (prompt) when a dialog opens.
  useEffect(() => {
    if (active?.kind === "prompt") {
      const t = setTimeout(() => inputRef.current?.select(), 20);
      return () => clearTimeout(t);
    }
  }, [active]);

  // Esc cancels.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(active.kind === "prompt" ? null : false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close]);

  const isPrompt = active?.kind === "prompt";
  const opts = active?.opts;
  const danger = active?.kind === "confirm" && active.opts.danger;
  const cancel = () => close(isPrompt ? null : false);
  const accept = () => close(isPrompt ? value : true);

  return (
    <DialogContext.Provider value={{ confirm, prompt }}>
      {children}
      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Cancel"
            onClick={cancel}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-sm rounded-2xl border border-border bg-bg-elevated p-5 shadow-xl"
          >
            {opts?.title && (
              <h2 className="font-display text-lg font-semibold tracking-tight">
                {opts.title}
              </h2>
            )}
            {opts?.message && (
              <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                {opts.message}
              </p>
            )}

            {isPrompt && (
              <input
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") accept();
                }}
                placeholder={(opts as PromptOptions)?.placeholder}
                className="mt-3 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-border-strong"
              />
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={cancel}
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-bg-sunken hover:text-text"
              >
                {(!isPrompt && opts && (opts as ConfirmOptions).cancelLabel) ||
                  "Cancel"}
              </button>
              <button
                onClick={accept}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 ${
                  danger ? "bg-red-500" : "bg-accent"
                }`}
              >
                {(opts && opts.confirmLabel) || (isPrompt ? "Save" : "Confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}
