export type EnvelopeStatus =
  | "draft"
  | "sent"
  | "in_progress"
  | "completed"
  | "declined"
  | "voided";

export type RecipientStatus =
  | "pending"
  | "notified"
  | "otp_verified"
  | "completed"
  | "declined";

export type RecipientRole = "signer" | "approver";

export type FieldType = "signature" | "approve";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
};

export type Contact = {
  id: string;
  owner_id: string;
  name: string;
  email: string;
  created_at: string;
};

export type Envelope = {
  id: string;
  created_by: string;
  subject: string;
  message: string | null;
  status: EnvelopeStatus;
  sent_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Document = {
  id: string;
  envelope_id: string;
  storage_path: string;
  file_name: string;
  page_count: number;
  is_final: boolean;
  created_at: string;
};

export type Recipient = {
  id: string;
  envelope_id: string;
  email: string;
  name: string;
  role: RecipientRole;
  routing_order: number;
  status: RecipientStatus;
  access_token_hash: string | null;
  notified_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type Field = {
  id: string;
  envelope_id: string;
  recipient_id: string;
  document_id: string;
  type: FieldType;
  page: number;
  x_pct: number;
  y_pct: number;
  w_pct: number;
  h_pct: number;
  value: string | null;
  required: boolean;
  created_at: string;
};

export type AuditEvent = {
  id: string;
  envelope_id: string;
  action: string;
  actor_email: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};

export type EnvelopeWithRelations = Envelope & {
  documents: Document[];
  recipients: Recipient[];
  fields: Field[];
  audit_events?: AuditEvent[];
};
