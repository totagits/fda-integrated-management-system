-- Office-to-office consumable distribution, linked to inventory movements.
ALTER TABLE inventory_items
  ADD COLUMN reserved_quantity numeric(14,3) NOT NULL DEFAULT 0
  CHECK (reserved_quantity >= 0 AND reserved_quantity <= quantity_on_hand);

CREATE TABLE distribution_requests (
  id uuid PRIMARY KEY,
  reference text NOT NULL UNIQUE,
  destination_org_unit_id uuid NOT NULL REFERENCES org_units(id),
  sku text NOT NULL,
  item_name text NOT NULL,
  unit_of_measure text NOT NULL,
  quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
  destination_reorder_point numeric(14,3) NOT NULL DEFAULT 0 CHECK (destination_reorder_point >= 0),
  reason text NOT NULL,
  needed_by date,
  status text NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','ALLOCATED','IN_TRANSIT','RECEIVED','RECEIVED_WITH_VARIANCE','REJECTED','CANCELLED')),
  source_item_id uuid REFERENCES inventory_items(id),
  source_org_unit_id uuid REFERENCES org_units(id),
  requested_by uuid NOT NULL REFERENCES users(id),
  allocated_by uuid REFERENCES users(id),
  allocated_at timestamptz,
  dispatch_carrier text,
  vehicle_reference text,
  tracking_reference text,
  planned_dispatch_date date,
  expected_delivery_date date,
  dispatched_by uuid REFERENCES users(id),
  dispatched_at timestamptz,
  received_quantity numeric(14,3) CHECK (received_quantity IS NULL OR received_quantity >= 0),
  discrepancy_note text,
  received_by uuid REFERENCES users(id),
  received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((source_item_id IS NULL AND source_org_unit_id IS NULL) OR (source_item_id IS NOT NULL AND source_org_unit_id IS NOT NULL)),
  CHECK (expected_delivery_date IS NULL OR planned_dispatch_date IS NULL OR expected_delivery_date >= planned_dispatch_date),
  CHECK (received_quantity IS NULL OR received_quantity <= quantity)
);
CREATE INDEX distribution_requests_destination_status ON distribution_requests(destination_org_unit_id,status,created_at DESC);
CREATE INDEX distribution_requests_source_status ON distribution_requests(source_org_unit_id,status,created_at DESC);

ALTER TABLE inventory_movements DROP CONSTRAINT inventory_movements_movement_check;
ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_movement_check
  CHECK (movement IN ('OPENING','RECEIPT','ISSUE','TRANSFER_OUT','TRANSFER_IN'));
ALTER TABLE inventory_movements ADD COLUMN distribution_request_id uuid REFERENCES distribution_requests(id);
ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_distribution_movement_check
  CHECK ((movement IN ('TRANSFER_OUT','TRANSFER_IN') AND distribution_request_id IS NOT NULL AND goods_receipt_id IS NULL)
      OR (movement NOT IN ('TRANSFER_OUT','TRANSFER_IN') AND distribution_request_id IS NULL));
CREATE UNIQUE INDEX inventory_movement_distribution_once ON inventory_movements(distribution_request_id,movement) WHERE distribution_request_id IS NOT NULL;

DROP VIEW inventory_receipt_directory;
DROP VIEW inventory_movement_directory;
DROP VIEW inventory_register;
CREATE VIEW inventory_movement_directory AS
 SELECT m.*,i.org_unit_id,i.sku,i.name AS item_name,i.unit_of_measure,o.name AS office_name
 FROM inventory_movements m JOIN inventory_items i ON i.id=m.item_id JOIN org_units o ON o.id=i.org_unit_id;
CREATE VIEW inventory_register AS
 SELECT i.*,i.quantity_on_hand-i.reserved_quantity AS available_quantity,o.name AS office_name,
   (SELECT count(*)::integer FROM inventory_replenishments r WHERE r.item_id=i.id AND r.status='SUBMITTED') AS open_replenishments
 FROM inventory_items i JOIN org_units o ON o.id=i.org_unit_id;

CREATE VIEW distribution_request_directory AS
 SELECT d.*,src.name AS source_office,dst.name AS destination_office,
   i.estimated_unit_cost_minor,i.currency,
   requester.full_name AS requested_by_name,allocator.full_name AS allocated_by_name,
   dispatcher.full_name AS dispatched_by_name,receiver.full_name AS received_by_name
 FROM distribution_requests d
 JOIN org_units dst ON dst.id=d.destination_org_unit_id
 LEFT JOIN org_units src ON src.id=d.source_org_unit_id
 LEFT JOIN inventory_items i ON i.id=d.source_item_id
 JOIN users requester ON requester.id=d.requested_by
 LEFT JOIN users allocator ON allocator.id=d.allocated_by
 LEFT JOIN users dispatcher ON dispatcher.id=d.dispatched_by
 LEFT JOIN users receiver ON receiver.id=d.received_by;
