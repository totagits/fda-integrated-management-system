-- Cumulative delivery / settlement totals and office-scoped consumable inventory.
ALTER TABLE purchase_orders ADD COLUMN received_amount_minor bigint NOT NULL DEFAULT 0 CHECK(received_amount_minor>=0);
ALTER TABLE purchase_orders ADD COLUMN billed_amount_minor bigint NOT NULL DEFAULT 0 CHECK(billed_amount_minor>=0);
ALTER TABLE purchase_orders ADD COLUMN paid_amount_minor bigint NOT NULL DEFAULT 0 CHECK(paid_amount_minor>=0);
UPDATE purchase_orders p SET received_amount_minor=coalesce((SELECT sum(g.accepted_amount_minor) FROM goods_receipts g WHERE g.purchase_order_id=p.id AND g.status='ACCEPTED'),0);
UPDATE purchase_orders p SET billed_amount_minor=coalesce((SELECT sum(i.amount_minor) FROM invoices i WHERE i.purchase_order_id=p.id AND i.status IN ('MATCHED','AUTHORIZED','PAID')),0);
UPDATE purchase_orders p SET paid_amount_minor=coalesce((SELECT sum(pay.amount_minor) FROM payments pay JOIN invoices i ON i.id=pay.invoice_id WHERE i.purchase_order_id=p.id AND pay.status='PAID'),0);

CREATE TABLE inventory_items (
 id uuid PRIMARY KEY,
 org_unit_id uuid NOT NULL REFERENCES org_units(id),
 sku text NOT NULL,
 name text NOT NULL,
 unit_of_measure text NOT NULL,
 quantity_on_hand numeric(14,3) NOT NULL DEFAULT 0 CHECK(quantity_on_hand>=0),
 reorder_point numeric(14,3) NOT NULL CHECK(reorder_point>=0),
 estimated_unit_cost_minor bigint NOT NULL CHECK(estimated_unit_cost_minor>0),
 currency text NOT NULL CHECK(currency IN ('USD','LRD')),
 active boolean NOT NULL DEFAULT true,
 created_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(org_unit_id,sku)
);
CREATE INDEX inventory_items_scope_reorder ON inventory_items(org_unit_id,active,quantity_on_hand,reorder_point);
CREATE TABLE inventory_movements (
 id uuid PRIMARY KEY,
 item_id uuid NOT NULL REFERENCES inventory_items(id),
 movement text NOT NULL CHECK(movement IN ('OPENING','RECEIPT','ISSUE')),
 quantity numeric(14,3) NOT NULL CHECK(quantity>0),
 value_minor bigint NOT NULL CHECK(value_minor>=0),
 goods_receipt_id uuid REFERENCES goods_receipts(id),
 reference text NOT NULL,
 reason text NOT NULL,
 created_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(goods_receipt_id,item_id),
 CHECK((movement='RECEIPT' AND goods_receipt_id IS NOT NULL) OR (movement<>'RECEIPT' AND goods_receipt_id IS NULL))
);
CREATE INDEX inventory_movement_item_created ON inventory_movements(item_id,created_at DESC);
CREATE VIEW inventory_movement_directory AS
 SELECT m.*,i.org_unit_id,i.sku,i.name AS item_name,i.unit_of_measure,o.name AS office_name
 FROM inventory_movements m JOIN inventory_items i ON i.id=m.item_id JOIN org_units o ON o.id=i.org_unit_id;
CREATE VIEW inventory_receipt_directory AS SELECT * FROM inventory_movement_directory WHERE movement='RECEIPT';
CREATE VIEW accepted_goods_receipt_directory AS
 SELECT gr.id,gr.receipt_no,gr.purchase_order_id,gr.accepted_amount_minor,gr.inspected_at,r.org_unit_id,r.requisition_no,po.po_number,v.legal_name AS supplier_name,o.name AS office_name
 FROM goods_receipts gr JOIN purchase_orders po ON po.id=gr.purchase_order_id JOIN requisitions r ON r.id=po.requisition_id JOIN vendors v ON v.id=po.vendor_id JOIN org_units o ON o.id=r.org_unit_id
 WHERE gr.status='ACCEPTED' AND r.spend_type='GOODS';
CREATE TABLE inventory_replenishments (
 id uuid PRIMARY KEY,
 item_id uuid NOT NULL REFERENCES inventory_items(id),
 quantity numeric(14,3) NOT NULL CHECK(quantity>0),
 estimated_amount_minor bigint NOT NULL CHECK(estimated_amount_minor>0),
 currency text NOT NULL CHECK(currency IN ('USD','LRD')),
 reason text NOT NULL,
 status text NOT NULL DEFAULT 'SUBMITTED' CHECK(status IN ('SUBMITTED','REQUISITIONED','REJECTED')),
 requested_by uuid NOT NULL REFERENCES users(id),
 requisition_id uuid UNIQUE REFERENCES requisitions(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX inventory_one_open_replenishment ON inventory_replenishments(item_id) WHERE status='SUBMITTED';
CREATE VIEW inventory_register AS
 SELECT i.*,o.name AS office_name,
   (SELECT count(*)::integer FROM inventory_replenishments r WHERE r.item_id=i.id AND r.status='SUBMITTED') AS open_replenishments
 FROM inventory_items i JOIN org_units o ON o.id=i.org_unit_id;
CREATE VIEW inventory_replenishment_directory AS
 SELECT r.*,i.sku,i.name AS item_name,i.unit_of_measure,i.org_unit_id,i.quantity_on_hand,i.reorder_point,o.name AS office_name
 FROM inventory_replenishments r JOIN inventory_items i ON i.id=r.item_id JOIN org_units o ON o.id=i.org_unit_id;
