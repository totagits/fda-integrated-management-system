CREATE TABLE bidder_accounts (
  id uuid PRIMARY KEY,
  vendor_id uuid NOT NULL UNIQUE REFERENCES vendors(id),
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  contact_name text NOT NULL,
  phone text NOT NULL,
  password_hash text NOT NULL,
  email_verified_at timestamptz,
  status text NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (status IN ('PENDING_REVIEW','ACTIVE','REJECTED','SUSPENDED')),
  review_note text,
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE bidder_sessions (
  token_hash text PRIMARY KEY,
  bidder_id uuid NOT NULL REFERENCES bidder_accounts(id) ON DELETE CASCADE,
  csrf_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bidder_sessions_expiry_idx ON bidder_sessions(expires_at);
CREATE TABLE bidder_email_verifications (
  id uuid PRIMARY KEY,
  bidder_id uuid NOT NULL REFERENCES bidder_accounts(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  sent_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bidder_verification_pending_idx ON bidder_email_verifications(expires_at) WHERE verified_at IS NULL;
CREATE TABLE bidder_business_lines (
  id uuid PRIMARY KEY,
  bidder_id uuid NOT NULL REFERENCES bidder_accounts(id) ON DELETE CASCADE,
  business_line text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bidder_id, business_line)
);
CREATE TABLE bidder_documents (
  id uuid PRIMARY KEY,
  bidder_id uuid NOT NULL REFERENCES bidder_accounts(id),
  document_type text NOT NULL CHECK (document_type IN ('BUSINESS_REGISTRATION','TAX_CLEARANCE','PPCC_CERTIFICATE','ARTICLES_OF_INCORPORATION','AUDITED_FINANCIALS','PROFESSIONAL_LICENSE','OTHER')),
  original_name text NOT NULL,
  storage_name text NOT NULL UNIQUE,
  media_type text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size > 0 AND byte_size <= 10485760),
  sha256 text NOT NULL,
  expires_on date NOT NULL,
  verification_status text NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING','VERIFIED','REJECTED')),
  review_note text,
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bidder_documents_expiry_idx ON bidder_documents(expires_on,bidder_id);
CREATE TABLE bidder_expiry_alerts (
  id uuid PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES bidder_documents(id) ON DELETE CASCADE,
  bidder_id uuid NOT NULL REFERENCES bidder_accounts(id) ON DELETE CASCADE,
  days_before integer NOT NULL CHECK (days_before IN (14,7,3,1)),
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SENT','FAILED')),
  attempts integer NOT NULL DEFAULT 0,
  sent_at timestamptz,
  locked_until timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(document_id,days_before)
);
CREATE INDEX bidder_expiry_alerts_due_idx ON bidder_expiry_alerts(due_at) WHERE status IN ('PENDING','FAILED');
CREATE TABLE public_notice_documents (
  id uuid PRIMARY KEY,
  notice_id uuid NOT NULL REFERENCES public_tender_notices(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES users(id),
  original_name text NOT NULL,
  storage_name text NOT NULL UNIQUE,
  media_type text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size > 0 AND byte_size <= 10485760),
  sha256 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX public_notice_documents_idx ON public_notice_documents(notice_id,created_at);
ALTER TABLE bidder_clarifications ADD COLUMN bidder_id uuid REFERENCES bidder_accounts(id);
CREATE TABLE bidder_submissions (
  id uuid PRIMARY KEY,
  notice_id uuid NOT NULL REFERENCES public_tender_notices(id),
  bidder_id uuid NOT NULL REFERENCES bidder_accounts(id),
  submission_kind text NOT NULL CHECK (submission_kind IN ('RFQ','RFP','EOI')),
  reference text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SUBMITTED','WITHDRAWN')),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(notice_id,bidder_id),
  CHECK ((status='SUBMITTED' AND submitted_at IS NOT NULL) OR status<>'SUBMITTED')
);
CREATE TABLE bidder_submission_documents (
  id uuid PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES bidder_submissions(id) ON DELETE CASCADE,
  original_name text NOT NULL,
  storage_name text NOT NULL UNIQUE,
  media_type text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size > 0 AND byte_size <= 10485760),
  sha256 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bidder_submissions_notice_idx ON bidder_submissions(notice_id,status,submitted_at DESC);
CREATE INDEX bidder_submission_documents_idx ON bidder_submission_documents(submission_id,created_at);
