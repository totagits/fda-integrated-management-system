-- Fixed-asset lifecycle, inter-office custody and field-verification controls.
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS acquisition_type text NOT NULL DEFAULT 'LEGACY',
  ADD COLUMN IF NOT EXISTS make text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS serial_number text,
  ADD COLUMN IF NOT EXISTS purchase_date date,
  ADD COLUMN IF NOT EXISTS funding_source text,
  ADD COLUMN IF NOT EXISTS project_code text,
  ADD COLUMN IF NOT EXISTS donor text,
  ADD COLUMN IF NOT EXISTS warranty_expires_on date,
  ADD COLUMN IF NOT EXISTS useful_life_months integer;

ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_acquisition_type_check;
ALTER TABLE assets ADD CONSTRAINT assets_acquisition_type_check
  CHECK (acquisition_type IN ('PURCHASED','DONATED','TRANSFERRED_IN','OPENING_BALANCE','FOUND','LEGACY'));
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_lifecycle_status_check;
ALTER TABLE assets ADD CONSTRAINT assets_lifecycle_status_check
  CHECK (lifecycle_status IN ('ACTIVE','IN_TRANSIT','DISPOSED'));
ALTER TABLE assets ADD CONSTRAINT assets_useful_life_months_check
  CHECK (useful_life_months IS NULL OR useful_life_months BETWEEN 1 AND 1200);
CREATE UNIQUE INDEX assets_serial_number_unique ON assets(lower(serial_number))
  WHERE serial_number IS NOT NULL AND length(trim(serial_number)) > 0;
CREATE INDEX assets_office_category_status ON assets(org_unit_id,category,lifecycle_status);
CREATE INDEX assets_warranty_expiry ON assets(warranty_expires_on) WHERE lifecycle_status='ACTIVE' AND warranty_expires_on IS NOT NULL;

-- A purchased asset must point to the accepted receipt for its purchase order.
CREATE OR REPLACE FUNCTION enforce_asset_acquisition_link() RETURNS trigger AS $$
BEGIN
  IF NEW.acquisition_type='PURCHASED' THEN
    IF NEW.purchase_order_id IS NULL OR NEW.receipt_id IS NULL THEN
      RAISE EXCEPTION 'Purchased assets require linked purchase order and receipt records';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM goods_receipts gr
      WHERE gr.id=NEW.receipt_id AND gr.purchase_order_id=NEW.purchase_order_id AND gr.status='ACCEPTED'
    ) THEN
      RAISE EXCEPTION 'Purchased assets must link to an accepted receipt belonging to the selected purchase order';
    END IF;
  ELSIF NEW.receipt_id IS NOT NULL AND NEW.purchase_order_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM goods_receipts gr WHERE gr.id=NEW.receipt_id AND gr.purchase_order_id=NEW.purchase_order_id) THEN
      RAISE EXCEPTION 'Asset receipt and purchase order do not match';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS assets_acquisition_link_guard ON assets;
CREATE TRIGGER assets_acquisition_link_guard BEFORE INSERT OR UPDATE OF acquisition_type,purchase_order_id,receipt_id
  ON assets FOR EACH ROW EXECUTE FUNCTION enforce_asset_acquisition_link();

DROP VIEW IF EXISTS asset_register_directory;
CREATE VIEW asset_register_directory AS
 SELECT a.*,o.name AS office_name,po.po_number,v.legal_name AS supplier_name,gr.receipt_no,
   (SELECT string_agg(DISTINCT i.invoice_no, ', ' ORDER BY i.invoice_no) FROM invoices i WHERE i.purchase_order_id=a.purchase_order_id) AS invoice_references,
   (SELECT string_agg(DISTINCT pay.payment_ref, ', ' ORDER BY pay.payment_ref)
      FROM payments pay JOIN invoices i ON i.id=pay.invoice_id WHERE i.purchase_order_id=a.purchase_order_id) AS payment_references,
   coalesce((SELECT sum(dl.amount_minor) FROM depreciation_lines dl JOIN depreciation_runs dr ON dr.id=dl.run_id
     JOIN gl_journals gj ON gj.id=dr.journal_id WHERE dl.asset_id=a.id AND dr.status='JOURNALED' AND gj.status='POSTED'),0)::bigint AS accumulated_depreciation_minor,
   greatest(0,a.purchase_cost_minor-coalesce((SELECT sum(dl.amount_minor) FROM depreciation_lines dl JOIN depreciation_runs dr ON dr.id=dl.run_id
     JOIN gl_journals gj ON gj.id=dr.journal_id WHERE dl.asset_id=a.id AND dr.status='JOURNALED' AND gj.status='POSTED'),0))::bigint AS net_book_value_minor,
   (SELECT min(m.due_date) FROM asset_maintenance m WHERE m.asset_id=a.id AND m.status='OPEN') AS next_maintenance_due
 FROM assets a JOIN org_units o ON o.id=a.org_unit_id
 LEFT JOIN purchase_orders po ON po.id=a.purchase_order_id
 LEFT JOIN vendors v ON v.id=po.vendor_id
 LEFT JOIN goods_receipts gr ON gr.id=a.receipt_id;

-- Preserve old transfer decisions while making future movements explicit.
ALTER TABLE asset_transfers DROP CONSTRAINT IF EXISTS asset_transfers_status_check;
UPDATE asset_transfers SET status='PENDING_APPROVAL' WHERE status='PENDING';
UPDATE asset_transfers SET status='RECEIVED' WHERE status='ACCEPTED';
ALTER TABLE asset_transfers ADD CONSTRAINT asset_transfers_status_check
  CHECK (status IN ('PENDING_APPROVAL','APPROVED','IN_TRANSIT','DELIVERY_EXCEPTION','RECEIVED','RECEIVED_WITH_VARIANCE','REJECTED'));
DROP INDEX IF EXISTS asset_pending_transfer;
CREATE UNIQUE INDEX asset_open_transfer ON asset_transfers(asset_id)
  WHERE status IN ('PENDING_APPROVAL','APPROVED','IN_TRANSIT','DELIVERY_EXCEPTION');

ALTER TABLE asset_transfers
  ADD COLUMN approved_by uuid REFERENCES users(id),
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN approval_note text,
  ADD COLUMN dispatch_carrier text,
  ADD COLUMN vehicle_reference text,
  ADD COLUMN tracking_reference text,
  ADD COLUMN waybill_reference text,
  ADD COLUMN planned_dispatch_date date,
  ADD COLUMN expected_delivery_date date,
  ADD COLUMN dispatch_condition text CHECK (dispatch_condition IS NULL OR dispatch_condition IN ('GOOD','FAIR','POOR','UNSERVICEABLE')),
  ADD COLUMN dispatch_note text,
  ADD COLUMN dispatched_by uuid REFERENCES users(id),
  ADD COLUMN dispatched_at timestamptz,
  ADD COLUMN received_by uuid REFERENCES users(id),
  ADD COLUMN received_at timestamptz,
  ADD COLUMN received_condition text CHECK (received_condition IS NULL OR received_condition IN ('GOOD','FAIR','POOR','UNSERVICEABLE')),
  ADD COLUMN received_location text,
  ADD COLUMN receipt_note text,
  ADD COLUMN discrepancy_note text;
ALTER TABLE asset_transfers ADD CONSTRAINT asset_transfer_delivery_dates_check
  CHECK (expected_delivery_date IS NULL OR planned_dispatch_date IS NULL OR expected_delivery_date >= planned_dispatch_date);
CREATE INDEX asset_transfer_in_transit ON asset_transfers(status,expected_delivery_date) WHERE status IN ('IN_TRANSIT','DELIVERY_EXCEPTION');
DROP VIEW IF EXISTS asset_transfer_directory;
CREATE VIEW asset_transfer_directory AS
 SELECT t.*,a.asset_tag,a.description AS asset_description,a.serial_number,a.condition AS current_condition,
   src.name AS source_office,dst.name AS destination_office,
   requester.full_name AS requester_name,approver.full_name AS approver_name,
   dispatcher.full_name AS dispatcher_name,receiver.full_name AS receiver_name
 FROM asset_transfers t JOIN assets a ON a.id=t.asset_id
 JOIN org_units src ON src.id=t.from_org_unit_id JOIN org_units dst ON dst.id=t.to_org_unit_id
 JOIN users requester ON requester.id=t.requested_by
 LEFT JOIN users approver ON approver.id=t.approved_by
 LEFT JOIN users dispatcher ON dispatcher.id=t.dispatched_by
 LEFT JOIN users receiver ON receiver.id=t.received_by;

CREATE TABLE asset_transfer_events (
  id uuid PRIMARY KEY,
  transfer_id uuid NOT NULL REFERENCES asset_transfers(id),
  action text NOT NULL CHECK (action IN ('REQUESTED','APPROVED','REJECTED','DISPATCHED','RECEIVED','RECEIVED_WITH_VARIANCE','DELIVERY_EXCEPTION')),
  actor_id uuid REFERENCES users(id),
  org_unit_id uuid REFERENCES org_units(id),
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX asset_transfer_events_history ON asset_transfer_events(transfer_id,created_at,id);
CREATE OR REPLACE FUNCTION prevent_asset_transfer_event_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'asset transfer history is append-only'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER asset_transfer_events_immutable BEFORE UPDATE OR DELETE ON asset_transfer_events
  FOR EACH ROW EXECUTE FUNCTION prevent_asset_transfer_event_mutation();

-- Count items observed in the field that were absent from the frozen register snapshot.
CREATE TABLE asset_found_items (
  id uuid PRIMARY KEY,
  stocktake_id uuid NOT NULL REFERENCES stocktakes(id),
  observed_tag text,
  description text NOT NULL,
  category text NOT NULL,
  serial_number text,
  observed_location text NOT NULL,
  observed_condition text NOT NULL CHECK (observed_condition IN ('GOOD','FAIR','POOR','UNSERVICEABLE')),
  note text NOT NULL,
  reported_by uuid NOT NULL REFERENCES users(id),
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','REGISTERED','NOT_AN_ASSET')),
  reviewed_by uuid REFERENCES users(id),
  decision_note text,
  asset_id uuid UNIQUE REFERENCES assets(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
CREATE INDEX asset_found_items_stocktake_status ON asset_found_items(stocktake_id,status,created_at);
CREATE VIEW asset_found_item_directory AS
 SELECT f.*,s.reference AS stocktake_reference,s.status AS stocktake_status,s.org_unit_id,o.name AS office_name,
   reporter.full_name AS reporter_name,reviewer.full_name AS reviewer_name
 FROM asset_found_items f JOIN stocktakes s ON s.id=f.stocktake_id JOIN org_units o ON o.id=s.org_unit_id
 JOIN users reporter ON reporter.id=f.reported_by LEFT JOIN users reviewer ON reviewer.id=f.reviewed_by;
