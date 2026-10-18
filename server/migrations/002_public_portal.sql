-- No sample notices or inquiries are inserted. Publication is an explicit staff action.
CREATE TABLE public_tender_notices (
  id uuid PRIMARY KEY,
  tender_ref text NOT NULL UNIQUE,
  org_unit_id uuid NOT NULL REFERENCES org_units(id),
  details jsonb NOT NULL,
  deadline timestamptz NOT NULL,
  publication_status text NOT NULL DEFAULT 'DRAFT' CHECK (publication_status IN ('DRAFT','PUBLISHED','WITHDRAWN')),
  created_by uuid NOT NULL REFERENCES users(id),
  published_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
CREATE INDEX public_tenders_publication_idx ON public_tender_notices(publication_status, published_at DESC);

CREATE TABLE bidder_clarifications (
  id uuid PRIMARY KEY,
  tender_id uuid NOT NULL REFERENCES public_tender_notices(id),
  company_name text NOT NULL,
  contact_person text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  question text NOT NULL,
  public_question text,
  official_response text,
  responded_by uuid REFERENCES users(id),
  response_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((official_response IS NULL AND public_question IS NULL AND response_date IS NULL)
    OR (official_response IS NOT NULL AND public_question IS NOT NULL AND response_date IS NOT NULL))
);
CREATE INDEX bidder_clarifications_tender_idx ON bidder_clarifications(tender_id, created_at DESC);
