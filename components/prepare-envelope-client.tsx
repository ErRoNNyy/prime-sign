"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  saveRecipients,
  saveFields,
  sendEnvelopeAction,
  updateEnvelopeMeta,
} from "@/app/actions";
import type { Contact, Field, FieldType, Recipient } from "@/lib/types/database";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type DraftRecipient = {
  key: string;
  name: string;
  email: string;
  role: "signer" | "approver";
  routing_order: number;
  id?: string;
};

type DraftField = {
  key: string;
  id?: string;
  recipient_id: string;
  document_id: string;
  type: FieldType;
  page: number;
  x_pct: number;
  y_pct: number;
  w_pct: number;
  h_pct: number;
  required: boolean;
};

type Props = {
  envelopeId: string;
  subject: string;
  message: string;
  documentId: string;
  pdfUrl: string;
  pageCount: number;
  contacts: Contact[];
  initialRecipients: Recipient[];
  initialFields: Field[];
};

const RECIPIENT_COLORS = [
  "#0f766e",
  "#1d4ed8",
  "#b45309",
  "#7c3aed",
  "#be123c",
];

export function PrepareEnvelopeClient(props: Props) {
  const [step, setStep] = useState<"recipients" | "fields">(
    props.initialRecipients.length ? "fields" : "recipients",
  );
  const [subject, setSubject] = useState(props.subject);
  const [message, setMessage] = useState(props.message);
  const [recipients, setRecipients] = useState<DraftRecipient[]>(() =>
    props.initialRecipients.length
      ? props.initialRecipients.map((r) => ({
          key: r.id,
          id: r.id,
          name: r.name,
          email: r.email,
          role: r.role,
          routing_order: r.routing_order,
        }))
      : [
          {
            key: crypto.randomUUID(),
            name: "",
            email: "",
            role: "signer",
            routing_order: 1,
          },
        ],
  );
  const [fields, setFields] = useState<DraftField[]>(() =>
    props.initialFields.map((f) => ({
      key: f.id,
      id: f.id,
      recipient_id: f.recipient_id,
      document_id: f.document_id,
      type: f.type,
      page: f.page,
      x_pct: f.x_pct,
      y_pct: f.y_pct,
      w_pct: f.w_pct,
      h_pct: f.h_pct,
      required: f.required,
    })),
  );
  const [activeRecipientId, setActiveRecipientId] = useState<string | null>(
    null,
  );
  const [placeType, setPlaceType] = useState<FieldType>("signature");
  const [numPages, setNumPages] = useState(props.pageCount);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const savedRecipientIds = useMemo(
    () => recipients.filter((r) => r.id).map((r) => r.id!),
    [recipients],
  );

  useEffect(() => {
    if (!activeRecipientId && savedRecipientIds[0]) {
      setActiveRecipientId(savedRecipientIds[0]);
    }
  }, [activeRecipientId, savedRecipientIds]);

  function addBlankRecipient() {
    setRecipients((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        name: "",
        email: "",
        role: "signer",
        routing_order: prev.length + 1,
      },
    ]);
  }

  function addFromContact(contact: Contact) {
    setRecipients((prev) => {
      if (prev.some((r) => r.email.toLowerCase() === contact.email.toLowerCase())) {
        return prev;
      }
      return [
        ...prev.filter((r) => r.email || r.name),
        {
          key: crypto.randomUUID(),
          name: contact.name,
          email: contact.email,
          role: "signer",
          routing_order: prev.filter((r) => r.email || r.name).length + 1,
        },
      ];
    });
  }

  async function persistRecipients() {
    setError(null);
    setPending(true);
    await updateEnvelopeMeta(props.envelopeId, subject, message);
    const payload = recipients
      .filter((r) => r.email && r.name)
      .map((r, i) => ({
        name: r.name,
        email: r.email,
        role: r.role,
        routing_order: i + 1,
      }));
    const result = await saveRecipients(props.envelopeId, payload);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return false;
    }
    const inserted = result.recipients ?? [];
    setRecipients(
      inserted.map((r: Recipient) => ({
        key: r.id,
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        routing_order: r.routing_order,
      })),
    );
    setFields([]);
    setActiveRecipientId(inserted[0]?.id ?? null);
    setStep("fields");
    return true;
  }

  const onPageClick = useCallback(
    (page: number, e: React.MouseEvent<HTMLDivElement>) => {
      if (!activeRecipientId) return;
      const el = pageRefs.current[page];
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x_pct = ((e.clientX - rect.left) / rect.width) * 100;
      const y_pct = ((e.clientY - rect.top) / rect.height) * 100;
      const w_pct = placeType === "signature" ? 22 : 18;
      const h_pct = placeType === "signature" ? 8 : 6;
      setFields((prev) => [
        ...prev,
        {
          key: crypto.randomUUID(),
          recipient_id: activeRecipientId,
          document_id: props.documentId,
          type: placeType,
          page,
          x_pct: Math.min(Math.max(x_pct - w_pct / 2, 0), 100 - w_pct),
          y_pct: Math.min(Math.max(y_pct - h_pct / 2, 0), 100 - h_pct),
          w_pct,
          h_pct,
          required: true,
        },
      ]);
    },
    [activeRecipientId, placeType, props.documentId],
  );

  async function persistFieldsAndSend(send: boolean) {
    setError(null);
    setPending(true);
    await updateEnvelopeMeta(props.envelopeId, subject, message);
    const result = await saveFields(
      props.envelopeId,
      fields.map((f) => ({
        recipient_id: f.recipient_id,
        document_id: f.document_id,
        type: f.type,
        page: f.page,
        x_pct: f.x_pct,
        y_pct: f.y_pct,
        w_pct: f.w_pct,
        h_pct: f.h_pct,
        required: f.required,
      })),
    );
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    if (send) {
      const sendResult = await sendEnvelopeAction(props.envelopeId);
      if (sendResult?.error) {
        setError(sendResult.error);
        setPending(false);
      }
      return;
    }
    setPending(false);
  }

  const colorForRecipient = (id: string) => {
    const idx = savedRecipientIds.indexOf(id);
    return RECIPIENT_COLORS[idx % RECIPIENT_COLORS.length];
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            Prepare envelope
          </p>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 w-full max-w-lg border-0 bg-transparent font-display text-3xl font-medium italic tracking-tight text-ink outline-none"
          />
        </div>
        <div className="flex gap-2 text-sm">
          <span
            className={`px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${step === "recipients" ? "bg-sage text-on-accent" : "bg-white/10 text-ink-soft"}`}
          >
            1. Recipients
          </span>
          <span
            className={`px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${step === "fields" ? "bg-sage text-on-accent" : "bg-white/10 text-ink-soft"}`}
          >
            2. Fields
          </span>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {step === "recipients" ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4 border border-border bg-surface/70 backdrop-blur-sm p-5">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Message to recipients</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                className="w-full border border-border bg-black/40 px-3 py-2 text-ink outline-none focus:border-sage"
              />
            </label>
            {recipients.map((r, index) => (
              <div
                key={r.key}
                className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_120px_auto]"
              >
                <input
                  placeholder="Name"
                  value={r.name}
                  onChange={(e) =>
                    setRecipients((prev) =>
                      prev.map((x) =>
                        x.key === r.key ? { ...x, name: e.target.value } : x,
                      ),
                    )
                  }
                  className="border border-border bg-black/40 px-3 py-2 text-sm text-ink outline-none focus:border-sage"
                />
                <input
                  placeholder="Email"
                  type="email"
                  value={r.email}
                  onChange={(e) =>
                    setRecipients((prev) =>
                      prev.map((x) =>
                        x.key === r.key ? { ...x, email: e.target.value } : x,
                      ),
                    )
                  }
                  className="border border-border bg-black/40 px-3 py-2 text-sm text-ink outline-none focus:border-sage"
                />
                <select
                  value={r.role}
                  onChange={(e) =>
                    setRecipients((prev) =>
                      prev.map((x) =>
                        x.key === r.key
                          ? {
                              ...x,
                              role: e.target.value as "signer" | "approver",
                            }
                          : x,
                      ),
                    )
                  }
                  className="border border-border bg-black/40 px-2 py-2 text-sm text-ink"
                >
                  <option value="signer">Signer</option>
                  <option value="approver">Approver</option>
                </select>
                <div className="flex items-center gap-2 text-sm text-ink-soft">
                  <span>#{index + 1}</span>
                  <button
                    type="button"
                    className="text-danger hover:underline"
                    onClick={() =>
                      setRecipients((prev) =>
                        prev.filter((x) => x.key !== r.key),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addBlankRecipient}
              className="text-sm font-medium text-sage hover:underline"
            >
              + Invite by email
            </button>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => void persistRecipients()}
                className="bg-sage px-4 py-2 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-on-accent hover:bg-sage-hover disabled:opacity-60"
              >
                {pending ? "Saving…" : "Continue to fields"}
              </button>
            </div>
          </div>

          <aside className="h-fit border border-border bg-surface/70 backdrop-blur-sm p-4">
            <h2 className="text-sm font-semibold">From contacts</h2>
            {!props.contacts.length ? (
              <p className="mt-2 text-sm text-ink-soft">No contacts saved.</p>
            ) : (
              <ul className="mt-3 max-h-80 space-y-2 overflow-auto">
                {props.contacts.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => addFromContact(c)}
                      className="w-full rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-white/5"
                    >
                      <span className="block font-medium">{c.name}</span>
                      <span className="text-ink-soft">{c.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="h-fit space-y-4 border border-border bg-surface/70 backdrop-blur-sm p-4">
            <div>
              <p className="text-xs font-medium uppercase text-ink-soft">
                Place for
              </p>
              <ul className="mt-2 space-y-1">
                {recipients
                  .filter((r) => r.id)
                  .map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setActiveRecipientId(r.id!)}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm ${
                          activeRecipientId === r.id
                            ? "bg-sage/20 font-medium text-ink"
                            : "hover:bg-white/5"
                        }`}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: colorForRecipient(r.id!) }}
                        />
                        {r.name}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-ink-soft">
                Field type
              </p>
              <div className="mt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setPlaceType("signature")}
                  className={`rounded-md border px-3 py-2 text-sm ${
                    placeType === "signature"
                      ? "border-sage bg-sage/20"
                      : "border-border"
                  }`}
                >
                  Signature
                </button>
                <button
                  type="button"
                  onClick={() => setPlaceType("approve")}
                  className={`rounded-md border px-3 py-2 text-sm ${
                    placeType === "approve"
                      ? "border-sage bg-sage/20"
                      : "border-border"
                  }`}
                >
                  Approve / Agree
                </button>
              </div>
              <p className="mt-3 text-xs text-ink-soft">
                Click on the PDF to place a field.
              </p>
            </div>
            <ul className="max-h-40 space-y-1 overflow-auto text-xs">
              {fields.map((f) => {
                const rec = recipients.find((r) => r.id === f.recipient_id);
                return (
                  <li
                    key={f.key}
                    className="flex items-center justify-between gap-2 rounded border border-border px-2 py-1"
                  >
                    <span>
                      p{f.page} · {f.type} · {rec?.name}
                    </span>
                    <button
                      type="button"
                      className="text-danger"
                      onClick={() =>
                        setFields((prev) => prev.filter((x) => x.key !== f.key))
                      }
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep("recipients")}
                className="border border-border px-3 py-2 text-sm text-ink"
              >
                Back
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => void persistFieldsAndSend(false)}
                className="border border-border px-3 py-2 text-sm text-ink hover:bg-white/5 disabled:opacity-60"
              >
                Save draft
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => void persistFieldsAndSend(true)}
                className="bg-sage px-3 py-2 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-on-accent hover:bg-sage-hover disabled:opacity-60"
              >
                {pending ? "Sending…" : "Send envelope"}
              </button>
            </div>
          </aside>

          <div className="space-y-6 overflow-auto border border-border bg-black/40 p-4">
            <Document
              file={props.pdfUrl}
              onLoadSuccess={({ numPages: n }) => setNumPages(n)}
              loading={<p className="text-sm text-ink-soft">Loading PDF…</p>}
              error={<p className="text-sm text-danger">Failed to load PDF</p>}
            >
              {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
                <div
                  key={page}
                  className="relative mx-auto mb-6 w-fit shadow-md"
                  ref={(el) => {
                    pageRefs.current[page] = el;
                  }}
                  onClick={(e) => onPageClick(page, e)}
                >
                  <Page pageNumber={page} width={640} renderTextLayer={false} />
                  {fields
                    .filter((f) => f.page === page)
                    .map((f) => (
                      <div
                        key={f.key}
                        className="absolute cursor-pointer border-2 bg-black/50 text-[10px] font-semibold"
                        style={{
                          left: `${f.x_pct}%`,
                          top: `${f.y_pct}%`,
                          width: `${f.w_pct}%`,
                          height: `${f.h_pct}%`,
                          borderColor: colorForRecipient(f.recipient_id),
                          color: colorForRecipient(f.recipient_id),
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFields((prev) =>
                            prev.filter((x) => x.key !== f.key),
                          );
                        }}
                        title="Click to remove"
                      >
                        <span className="block truncate px-1 pt-0.5 uppercase">
                          {f.type}
                        </span>
                      </div>
                    ))}
                </div>
              ))}
            </Document>
          </div>
        </div>
      )}
    </div>
  );
}
