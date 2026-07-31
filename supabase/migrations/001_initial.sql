-- Profiles (mirrors auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Contacts
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, email)
);

create index contacts_owner_id_idx on public.contacts (owner_id);

alter table public.contacts enable row level security;

create policy "Users manage own contacts"
  on public.contacts for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Envelopes
create table public.envelopes (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  subject text not null default 'Untitled envelope',
  message text,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'in_progress', 'completed', 'declined', 'voided')),
  sent_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index envelopes_created_by_idx on public.envelopes (created_by);
create index envelopes_status_idx on public.envelopes (status);

alter table public.envelopes enable row level security;

create policy "Users manage own envelopes"
  on public.envelopes for all
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- Documents
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  envelope_id uuid not null references public.envelopes (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  page_count int not null default 1,
  is_final boolean not null default false,
  created_at timestamptz not null default now()
);

create index documents_envelope_id_idx on public.documents (envelope_id);

alter table public.documents enable row level security;

create policy "Users manage documents of own envelopes"
  on public.documents for all
  using (
    exists (
      select 1 from public.envelopes e
      where e.id = envelope_id and e.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.envelopes e
      where e.id = envelope_id and e.created_by = auth.uid()
    )
  );

-- Recipients
create table public.recipients (
  id uuid primary key default gen_random_uuid(),
  envelope_id uuid not null references public.envelopes (id) on delete cascade,
  email text not null,
  name text not null,
  role text not null default 'signer'
    check (role in ('signer', 'approver')),
  routing_order int not null default 1,
  status text not null default 'pending'
    check (status in ('pending', 'notified', 'otp_verified', 'completed', 'declined')),
  access_token_hash text,
  notified_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index recipients_envelope_id_idx on public.recipients (envelope_id);
create index recipients_access_token_hash_idx on public.recipients (access_token_hash);

alter table public.recipients enable row level security;

create policy "Users manage recipients of own envelopes"
  on public.recipients for all
  using (
    exists (
      select 1 from public.envelopes e
      where e.id = envelope_id and e.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.envelopes e
      where e.id = envelope_id and e.created_by = auth.uid()
    )
  );

-- Fields
create table public.fields (
  id uuid primary key default gen_random_uuid(),
  envelope_id uuid not null references public.envelopes (id) on delete cascade,
  recipient_id uuid not null references public.recipients (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  type text not null check (type in ('signature', 'approve')),
  page int not null default 1,
  x_pct float not null,
  y_pct float not null,
  w_pct float not null default 20,
  h_pct float not null default 8,
  value text,
  required boolean not null default true,
  created_at timestamptz not null default now()
);

create index fields_envelope_id_idx on public.fields (envelope_id);
create index fields_recipient_id_idx on public.fields (recipient_id);

alter table public.fields enable row level security;

create policy "Users manage fields of own envelopes"
  on public.fields for all
  using (
    exists (
      select 1 from public.envelopes e
      where e.id = envelope_id and e.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.envelopes e
      where e.id = envelope_id and e.created_by = auth.uid()
    )
  );

-- OTP challenges (service role only via server; no direct user access)
create table public.otp_challenges (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.recipients (id) on delete cascade,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index otp_challenges_recipient_id_idx on public.otp_challenges (recipient_id);

alter table public.otp_challenges enable row level security;

-- Audit events
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  envelope_id uuid not null references public.envelopes (id) on delete cascade,
  action text not null,
  actor_email text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_events_envelope_id_idx on public.audit_events (envelope_id);

alter table public.audit_events enable row level security;

create policy "Users view audit of own envelopes"
  on public.audit_events for select
  using (
    exists (
      select 1 from public.envelopes e
      where e.id = envelope_id and e.created_by = auth.uid()
    )
  );

create policy "Users insert audit for own envelopes"
  on public.audit_events for insert
  with check (
    exists (
      select 1 from public.envelopes e
      where e.id = envelope_id and e.created_by = auth.uid()
    )
  );

-- Storage bucket for PDFs
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  20971520,
  array['application/pdf']
)
on conflict (id) do nothing;

create policy "Users upload to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users read own files"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users update own files"
  on storage.objects for update
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users delete own files"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
