CREATE TABLE support_tickets (
  id uuid PRIMARY KEY,
  ticket_number text NOT NULL UNIQUE,
  requester_id uuid NOT NULL REFERENCES users(id),
  requester_role text NOT NULL,
  org_unit_id uuid REFERENCES org_units(id),
  module text NOT NULL CHECK (module IN ('ACCOUNT','HR','FINANCE','PROCUREMENT','ASSETS','INTEGRATIONS','OTHER')),
  subject text NOT NULL CHECK (length(subject) BETWEEN 4 AND 180),
  description text NOT NULL CHECK (length(description) BETWEEN 10 AND 5000),
  priority text NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','WAITING_USER','RESOLVED','CLOSED')),
  assigned_to uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  closed_at timestamptz
);
CREATE INDEX support_tickets_requester_idx ON support_tickets(requester_id,updated_at DESC);
CREATE INDEX support_tickets_queue_idx ON support_tickets(status,priority,updated_at DESC);

CREATE TABLE support_ticket_messages (
  id uuid PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_ticket_messages_thread_idx ON support_ticket_messages(ticket_id,created_at);
