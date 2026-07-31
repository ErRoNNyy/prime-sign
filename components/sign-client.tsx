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
  getCompletedDocumentByToken,
} from "@/app/actions";
import type { Field } from "@/lib/types/database";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/** Survives React Strict Mode remount so OTP is only issued once per token. */
const otpSendInFlight = new Map<
  string,
  Promise<Awaited<ReturnType<typeof requestOtpAction>>>
>();

type Props = {
  token: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  pdfUrl: string;
  fields: Field[];
  alreadyVerified: boolean;
  alreadyCompleted: boolean;
  envelopeCompleted?: boolean;
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
  const [approveField, setApproveField] = useState<Field | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState("agreement-completed.pdf");
  const [envelopeDone, setEnvelopeDone] = useState(
    Boolean(props.envelopeCompleted),
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  async function sendOtp(force = false) {
    setPending(true);
    setError(null);
    setDebugCode(null);
    setEmailError(null);
    setEmailOk(false);

    const key = `${props.token}:${force ? "force" : "auto"}`;
    let request = otpSendInFlight.get(key);
    if (!request) {
      request = requestOtpAction(props.token, { force }).finally(() => {
        // Keep the lock briefly so a remount cannot start a second send.
        window.setTimeout(() => otpSendInFlight.delete(key), 2000);
      });
      otpSendInFlight.set(key, request);
    }

    const result = await request;
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
      void sendOtp(false);
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

  function approveLabel(value: string | undefined) {
    if (value === "true") return "Approved ✓";
    if (value === "false") return "Denied ✕";
    return "Approve";
  }

  function approveBoxClass(value: string | undefined) {
    if (value === "true") {
      return "border-sage-deep bg-sage text-[#1a2118]";
    }
    if (value === "false") {
      return "border-red-700 bg-red-600 text-white";
    }
    return "border-[#8b4513] bg-amber-400 text-[#1a1208]";
  }

  function resolveApprove(decision: "yes" | "no") {
    if (!approveField) return;
    setValues((prev) => ({
      ...prev,
      [approveField.id]: decision === "yes" ? "true" : "false",
    }));
    setApproveField(null);
  }

  function approveChipDone(value: string | undefined) {
    return value === "true" || value === "false";
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
    if ("completed" in result && result.completed) {
      setEnvelopeDone(true);
    }
    if ("url" in result && result.url) {
      setDownloadUrl(result.url);
      if ("fileName" in result && result.fileName) {
        setDownloadName(result.fileName);
      }
    }
    setPhase("done");
  }

  useEffect(() => {
    if (phase !== "done") return;
    if (downloadUrl || !props.alreadyCompleted) return;
    void (async () => {
      const result = await getCompletedDocumentByToken(props.token);
      if ("url" in result && result.url) {
        setDownloadUrl(result.url);
        setEnvelopeDone(true);
        if (result.fileName) setDownloadName(result.fileName);
      }
    })();
  }, [phase, downloadUrl, props.alreadyCompleted, props.token]);

  useEffect(() => {
    if (phase !== "done") return;
    // Keep the thank-you screen longer when a download is available
    const delay = downloadUrl || envelopeDone ? 12000 : 2500;
    const timer = window.setTimeout(() => {
      router.push("/dashboard");
    }, delay);
    return () => window.clearTimeout(timer);
  }, [phase, router, downloadUrl, envelopeDone]);

  if (phase === "done") {
    return (
      <div className="mx-auto max-w-lg border border-border bg-surface/70 p-8 text-center backdrop-blur-sm">
        <h1 className="font-display text-2xl font-medium italic text-ink">
          Thank you
        </h1>
        <p className="mt-2 text-ink-soft">
          Your actions on <strong className="text-ink">{props.subject}</strong>{" "}
          are complete.
        </p>
        {downloadUrl ? (
          <a
            href={downloadUrl}
            download={downloadName}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-block bg-sage px-5 py-2.5 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-on-accent hover:bg-sage-hover"
          >
            Download signed PDF
          </a>
        ) : envelopeDone ? (
          <p className="mt-4 text-sm text-ink-soft">
            Preparing your download link…
          </p>
        ) : (
          <p className="mt-4 text-sm text-ink-soft">
            The final agreement will be available to download once every
            recipient has finished.
          </p>
        )}
        <p className="mt-3 text-xs text-ink-soft">
          Redirecting to the main menu…
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm text-sage hover:underline"
        >
          Back to main menu
        </Link>
      </div>
    );
  }

  if (phase === "otp") {
    return (
      <div className="mx-auto max-w-md border border-border bg-surface/70 p-8 backdrop-blur-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink">
          PRIMESIGN
          <span className="ml-[0.1em] align-super text-[0.62em]">®</span>
        </p>
        <h1 className="mt-4 font-display text-2xl font-medium italic text-ink">
          Verify your identity
        </h1>
        {emailOk ? (
          <p className="mt-1 text-sm text-ink-soft">
            A one-time code was emailed to{" "}
            <strong className="text-ink">{props.recipientEmail}</strong>. Check
            inbox (and spam).
          </p>
        ) : debugCode ? (
          <div className="mt-3 space-y-2 border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-200">
            <p>
              Could not deliver email to{" "}
              <strong className="text-ink">{props.recipientEmail}</strong>
              {emailError ? ` (${emailError})` : ""}.
            </p>
            <p>
              Enter this code to continue:{" "}
              <strong className="text-base tracking-widest text-ink">
                {debugCode}
              </strong>
            </p>
          </div>
        ) : (
          <p className="mt-1 text-sm text-ink-soft">
            Requesting a verification code…
          </p>
        )}
        <div className="mt-6 space-y-3">
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit code"
            className="w-full border border-border bg-black/40 px-3 py-3 text-center text-2xl tracking-[0.4em] text-ink outline-none placeholder:text-ink/35 focus:border-sage"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="button"
            disabled={pending || otp.length < 6}
            onClick={() => void verify()}
            className="w-full bg-sage py-2.5 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-on-accent hover:bg-sage-hover disabled:opacity-60"
          >
            {pending ? "Verifying…" : "Continue"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void sendOtp(true)}
            className="w-full text-sm text-sage hover:underline"
          >
            Resend code
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 border border-border bg-surface/70 p-4 backdrop-blur-sm sm:p-5">
        <p className="text-xs uppercase tracking-[0.12em] text-ink-soft">
          Signing as
        </p>
        <h1 className="font-display text-2xl font-medium italic text-ink">
          {props.subject}
        </h1>
        <p className="text-sm text-ink-soft">
          {props.recipientName} · {props.recipientEmail}
        </p>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {props.fields.map((f) => {
            const done =
              f.type === "approve"
                ? approveChipDone(values[f.id])
                : Boolean(values[f.id]);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  if (f.type === "approve") {
                    setApproveField(f);
                  } else {
                    setActiveField(f);
                  }
                }}
                className={`border px-3 py-1.5 text-sm font-bold ${
                  f.type === "approve"
                    ? approveBoxClass(values[f.id])
                    : done
                      ? "border-sage bg-sage/20 text-sage"
                      : "border-border text-ink"
                }`}
              >
                {f.type === "signature"
                  ? `Sign · p${f.page}`
                  : `${approveLabel(values[f.id])} · p${f.page}`}
              </button>
            );
          })}
          <button
            type="button"
            disabled={pending}
            onClick={() => void finish()}
            className="ml-auto bg-sage px-4 py-1.5 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-on-accent hover:bg-sage-hover disabled:opacity-60"
          >
            {pending ? "Submitting…" : "Finish"}
          </button>
        </div>
      </div>

      <div className="space-y-4 overflow-auto border border-border bg-black/40 p-3 sm:p-4">
        <Document
          file={props.pdfUrl}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={<p className="text-sm text-ink-soft">Loading PDF…</p>}
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
                    className={`absolute border-2 text-left text-[11px] font-bold leading-tight ${
                      f.type === "approve"
                        ? approveBoxClass(values[f.id])
                        : values[f.id]
                          ? "border-sage bg-sage/40 text-ink"
                          : "border-amber-500 bg-amber-400 text-[#1a1208]"
                    }`}
                    style={{
                      left: `${f.x_pct}%`,
                      top: `${f.y_pct}%`,
                      width: `${f.w_pct}%`,
                      height: `${f.h_pct}%`,
                    }}
                    onClick={() => {
                      if (f.type === "approve") {
                        setApproveField(f);
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
                        <span className="px-1.5 py-0.5">Sign here</span>
                      )
                    ) : (
                      <span className="block px-1.5 py-0.5">
                        {approveLabel(values[f.id])}
                      </span>
                    )}
                  </button>
                ))}
            </div>
          ))}
        </Document>
      </div>

      {approveField && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="approve-dialog-title"
            className="w-full max-w-md border border-border bg-surface p-6"
          >
            <h2
              id="approve-dialog-title"
              className="font-display text-2xl font-medium italic text-ink"
            >
              Do you approve?
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              Confirm your decision for this approval field on{" "}
              <strong className="text-ink">{props.subject}</strong>.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => resolveApprove("no")}
                className="flex-1 border border-red-500/50 bg-red-600/20 px-4 py-3 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-red-200 transition-colors hover:bg-red-600/35"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => resolveApprove("yes")}
                className="flex-1 bg-sage px-4 py-3 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-on-accent transition-colors hover:bg-sage-hover"
              >
                Yes
              </button>
            </div>
            <button
              type="button"
              onClick={() => setApproveField(null)}
              className="mt-4 w-full text-sm text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {activeField && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-md border border-border bg-surface p-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink">
              Draw your signature
            </h2>
            <canvas
              ref={canvasRef}
              width={400}
              height={160}
              className="mt-3 w-full touch-none border border-border bg-[#f4efe8]"
              onPointerDown={startDraw}
              onPointerMove={moveDraw}
              onPointerUp={endDraw}
              onPointerLeave={endDraw}
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={clearCanvas}
                className="border border-border px-3 py-2 text-sm text-ink"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setActiveField(null)}
                className="border border-border px-3 py-2 text-sm text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applySignature}
                className="ml-auto bg-sage px-3 py-2 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-on-accent"
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
