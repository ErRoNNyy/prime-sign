"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  requestOtpAction,
  verifyOtpAction,
  submitSigningAction,
} from "@/app/actions";
import type { Field } from "@/lib/types/database";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Props = {
  token: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  pdfUrl: string;
  fields: Field[];
  alreadyVerified: boolean;
  alreadyCompleted: boolean;
};

export function SignClient(props: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<"otp" | "sign" | "done">(
    props.alreadyCompleted
      ? "done"
      : props.alreadyVerified
        ? "sign"
        : "otp",
  );
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailOk, setEmailOk] = useState(false);
  const [numPages, setNumPages] = useState(1);
  const [values, setValues] = useState<Record<string, string>>({});
  const [activeField, setActiveField] = useState<Field | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  async function sendOtp() {
    setPending(true);
    setError(null);
    setDebugCode(null);
    setEmailError(null);
    setEmailOk(false);
    const result = await requestOtpAction(props.token);
    setPending(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    if ("emailSent" in result && result.emailSent) {
      setEmailOk(true);
    }
    if ("debugCode" in result && result.debugCode) {
      setDebugCode(result.debugCode);
    }
    if ("emailError" in result && result.emailError) {
      setEmailError(result.emailError);
    }
    setOtpSent(true);
  }

  async function verify() {
    setPending(true);
    setError(null);
    const result = await verifyOtpAction(props.token, otp);
    setPending(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    setPhase("sign");
  }

  useEffect(() => {
    if (phase === "otp" && !otpSent && !props.alreadyCompleted) {
      void sendOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawing.current = true;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }

  function moveDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  }

  function endDraw() {
    drawing.current = false;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  }

  function applySignature() {
    if (!activeField) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const data = canvas.toDataURL("image/png");
    setValues((prev) => ({ ...prev, [activeField.id]: data }));
    setActiveField(null);
  }

  async function finish() {
    setPending(true);
    setError(null);
    const fieldValues = props.fields.map((f) => ({
      fieldId: f.id,
      value: values[f.id] ?? "",
    }));
    const result = await submitSigningAction(props.token, fieldValues);
    setPending(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    setPhase("done");
  }

  useEffect(() => {
    if (phase !== "done") return;
    const timer = window.setTimeout(() => {
      router.push("/dashboard");
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [phase, router]);

  if (phase === "done") {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-border bg-surface p-8 text-center">
        <h1 className="font-display text-2xl font-semibold">Thank you</h1>
        <p className="mt-2 text-muted">
          Your actions on <strong>{props.subject}</strong> are complete.
        </p>
        <p className="mt-2 text-xs text-muted">
          Redirecting to the main menu…
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          Back to main menu
        </Link>
      </div>
    );
  }

  if (phase === "otp") {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-border bg-surface p-8">
        <p className="font-display text-xl font-semibold text-teal-950">
          PrimeSign
        </p>
        <h1 className="mt-4 text-lg font-semibold">Verify your identity</h1>
        {emailOk ? (
          <p className="mt-1 text-sm text-muted">
            A one-time code was emailed to{" "}
            <strong>{props.recipientEmail}</strong>. Check inbox (and spam).
          </p>
        ) : debugCode ? (
          <div className="mt-3 space-y-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
            <p>
              Could not deliver email to <strong>{props.recipientEmail}</strong>
              {emailError ? ` (${emailError})` : ""}.
            </p>
            <p>
              Enter this code to continue:{" "}
              <strong className="tracking-widest text-base">{debugCode}</strong>
            </p>
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted">Requesting a verification code…</p>
        )}
        <div className="mt-6 space-y-3">
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit code"
            className="w-full rounded-md border border-border px-3 py-3 text-center text-2xl tracking-[0.4em] outline-none focus:border-accent"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="button"
            disabled={pending || otp.length < 6}
            onClick={() => void verify()}
            className="w-full rounded-md bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? "Verifying…" : "Continue"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void sendOtp()}
            className="w-full text-sm text-accent hover:underline"
          >
            Resend code
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 rounded-xl border border-border bg-surface p-4 sm:p-5">
        <p className="text-xs uppercase tracking-wide text-muted">Signing as</p>
        <h1 className="font-display text-2xl font-semibold">{props.subject}</h1>
        <p className="text-sm text-muted">
          {props.recipientName} · {props.recipientEmail}
        </p>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {props.fields.map((f) => {
            const done = Boolean(values[f.id]);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  if (f.type === "approve") {
                    setValues((prev) => ({
                      ...prev,
                      [f.id]: prev[f.id] === "true" ? "" : "true",
                    }));
                  } else {
                    setActiveField(f);
                  }
                }}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  done
                    ? "border-accent bg-teal-50 text-accent"
                    : "border-border"
                }`}
              >
                {f.type === "signature" ? "Sign" : "Approve"} · p{f.page}
                {done ? " ✓" : ""}
              </button>
            );
          })}
          <button
            type="button"
            disabled={pending}
            onClick={() => void finish()}
            className="ml-auto rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? "Submitting…" : "Finish"}
          </button>
        </div>
      </div>

      <div className="space-y-4 overflow-auto rounded-xl border border-border bg-zinc-100 p-3 sm:p-4">
        <Document
          file={props.pdfUrl}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={<p className="text-sm text-muted">Loading PDF…</p>}
        >
          {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
            <div key={page} className="relative mx-auto mb-4 w-fit shadow">
              <Page
                pageNumber={page}
                width={Math.min(720, typeof window !== "undefined" ? window.innerWidth - 48 : 720)}
                renderTextLayer={false}
              />
              {props.fields
                .filter((f) => f.page === page)
                .map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`absolute border-2 text-left text-[10px] font-semibold ${
                      values[f.id]
                        ? "border-teal-600 bg-teal-50/80"
                        : "border-amber-500 bg-amber-50/80"
                    }`}
                    style={{
                      left: `${f.x_pct}%`,
                      top: `${f.y_pct}%`,
                      width: `${f.w_pct}%`,
                      height: `${f.h_pct}%`,
                    }}
                    onClick={() => {
                      if (f.type === "approve") {
                        setValues((prev) => ({
                          ...prev,
                          [f.id]: prev[f.id] === "true" ? "" : "true",
                        }));
                      } else {
                        setActiveField(f);
                      }
                    }}
                  >
                    {f.type === "signature" ? (
                      values[f.id] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={values[f.id]}
                          alt="Signature"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="px-1">Sign here</span>
                      )
                    ) : (
                      <span className="px-1">
                        {values[f.id] === "true" ? "Approved ✓" : "Approve"}
                      </span>
                    )}
                  </button>
                ))}
            </div>
          ))}
        </Document>
      </div>

      {activeField && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-xl bg-white p-4">
            <h2 className="font-semibold">Draw your signature</h2>
            <canvas
              ref={canvasRef}
              width={400}
              height={160}
              className="mt-3 w-full touch-none rounded-md border border-border bg-zinc-50"
              onPointerDown={startDraw}
              onPointerMove={moveDraw}
              onPointerUp={endDraw}
              onPointerLeave={endDraw}
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={clearCanvas}
                className="rounded-md border border-border px-3 py-2 text-sm"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setActiveField(null)}
                className="rounded-md border border-border px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applySignature}
                className="ml-auto rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
