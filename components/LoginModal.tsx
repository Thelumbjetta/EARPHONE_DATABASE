/**
 * components/LoginModal.tsx
 * =============================================================
 * Auth Gate Modal — Email Magic-Link Sign In
 * =============================================================
 * Displayed when an unauthenticated user attempts a gated action
 * (upvote, reply, join community, create post).
 * =============================================================
 */

'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { X, Mail, ArrowRight, Loader2, CheckCircle, AudioWaveform } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Context message shown above the form, e.g. "Sign in to upvote posts" */
  message?: string;
}

type FormState = 'idle' | 'loading' | 'sent' | 'error';

export default function LoginModal({ isOpen, onClose, message }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormState('idle');
      setEmail('');
      setErrorMsg('');
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      setFormState('error');
      return;
    }
    setFormState('loading');
    setErrorMsg('');
    try {
      await signIn('email', {
        email: trimmed,
        callbackUrl: window.location.href, // return to current page after sign-in
        redirect: true,
      });
    } catch {
      setErrorMsg('Failed to send the link. Please try again.');
      setFormState('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl shadow-black/20 overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#10b981] flex items-center justify-center shadow-sm shadow-[#10b981]/30 flex-shrink-0">
              <AudioWaveform className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[#111827] font-sans">Sign in to continue</h2>
              {message && (
                <p className="text-[11px] text-gray-500 font-sans mt-0.5">{message}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {formState === 'sent' ? (
            /* ── Success State ─────────────────────────────────────── */
            <div className="text-center py-4 space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#e6f7f0] mx-auto">
                <CheckCircle className="w-6 h-6 text-[#10b981]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#111827] font-sans">Check your inbox</p>
                <p className="text-xs text-gray-500 font-sans mt-1 leading-relaxed">
                  We sent a sign-in link to <strong className="text-[#111827]">{email}</strong>.<br />
                  Click it to sign in — no password needed.
                </p>
              </div>
              <button
                onClick={() => { setFormState('idle'); setEmail(''); }}
                className="text-xs text-[#10b981] font-semibold hover:underline cursor-pointer"
              >
                Try a different email
              </button>
            </div>
          ) : (
            /* ── Form ──────────────────────────────────────────────── */
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label htmlFor="modal-email-input" className="block text-[11px] font-bold text-gray-600 uppercase tracking-wide mb-1.5 font-sans">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <input
                    id="modal-email-input"
                    ref={inputRef}
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (formState === 'error') setFormState('idle');
                    }}
                    placeholder="you@example.com"
                    disabled={formState === 'loading'}
                    className="w-full bg-[#f8faf9] border border-[#eaefec] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[#111827] placeholder-gray-400 font-sans focus:outline-none focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 transition-all duration-200 disabled:opacity-60"
                  />
                </div>
                {formState === 'error' && errorMsg && (
                  <p className="text-[11px] text-red-500 font-sans mt-1.5">{errorMsg}</p>
                )}
              </div>

              <button
                id="modal-send-link-btn"
                type="submit"
                disabled={formState === 'loading' || !email.trim()}
                className="w-full flex items-center justify-center gap-2 bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm py-3 rounded-xl shadow-sm shadow-[#10b981]/20 transition-all duration-200 cursor-pointer active:scale-[0.98] font-sans"
              >
                {formState === 'loading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Login Link</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-gray-400 font-sans leading-relaxed">
                No password. New to audiothread? Account created automatically.
              </p>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
