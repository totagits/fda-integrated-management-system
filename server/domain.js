export const ROLES = Object.freeze([
  'MANAGING_DIRECTOR',
  'IT_DIRECTOR',
  'FINANCE_DIRECTOR',
  'HR_DIRECTOR',
  'PROCUREMENT_OFFICER',
  'ASSET_OFFICER',
  'COUNTY_OFFICER',
  'INTERNAL_AUDITOR',
  'ETHICS_OFFICER',
  'EMPLOYEE',
]);

export const ROLE_CAPABILITIES = Object.freeze({
  MANAGING_DIRECTOR: ['notice.manage', 'workflow.read.all', 'requisition.approve', 'invoice.authorize', 'payment.record', 'budget.read.all', 'budget.manage', 'org.manage', 'it.admin.bootstrap', 'vendor.manage', 'asset.read.all', 'audit.read.all', 'attachment.read.all', 'attachment.write.all'],
  IT_DIRECTOR: ['user.manage', 'integration.manage', 'org.read.all'],
  FINANCE_DIRECTOR: ['workflow.read.all', 'budget.read.all', 'requisition.approve', 'invoice.create', 'invoice.authorize', 'payment.record', 'asset.read.all', 'audit.read.all', 'attachment.read.all'],
  HR_DIRECTOR: ['hr.read.scope', 'hr.manage.scope'],
  PROCUREMENT_OFFICER: ['notice.manage', 'workflow.read.scope', 'requisition.create', 'requisition.submit.own', 'purchase_order.create', 'vendor.manage', 'invoice.read.scope', 'asset.read.scope', 'attachment.read.scope', 'attachment.write.scope'],
  ASSET_OFFICER: ['workflow.read.scope', 'receipt.inspect', 'asset.read.scope', 'asset.manage.scope', 'attachment.read.scope', 'attachment.write.scope'],
  COUNTY_OFFICER: ['workflow.read.scope', 'requisition.create', 'requisition.submit.own', 'receipt.inspect', 'asset.read.scope', 'attachment.read.scope', 'attachment.write.scope'],
  INTERNAL_AUDITOR: ['workflow.read.all', 'budget.read.all', 'asset.read.all', 'audit.read.all', 'attachment.read.all'],
  ETHICS_OFFICER: ['hr.grievance.independent'],
  EMPLOYEE: ['employee.self'],
});

export const TRANSITIONS = Object.freeze({
  requisition: {
    DRAFT: ['SUBMITTED'],
    SUBMITTED: ['APPROVED', 'RETURNED', 'REJECTED'],
    RETURNED: ['DRAFT'],
    APPROVED: ['PO_ISSUED'],
    PO_ISSUED: ['COMPLETE'],
    REJECTED: [],
    COMPLETE: [],
  },
  receipt: { PENDING: ['ACCEPTED', 'REJECTED'], ACCEPTED: [], REJECTED: [] },
  invoice: { MATCHED: ['AUTHORIZED'], AUTHORIZED: ['PAID'], PAID: [], EXCEPTION: [] },
});

export function canTransition(entity, from, to) {
  return TRANSITIONS[entity]?.[from]?.includes(to) ?? false;
}

export function requireCapability(role, capability) {
  if (!ROLE_CAPABILITIES[role]?.includes(capability)) {
    const error = new Error('You do not have permission to perform this action.');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }
}

export function parseMinorUnits(value) {
  const normalized = String(value ?? '').trim();
  if (!/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/.test(normalized)) {
    const error = new Error('Enter a valid positive amount with up to two decimal places.');
    error.status = 422;
    error.code = 'INVALID_AMOUNT';
    throw error;
  }
  const [whole, fraction = ''] = normalized.split('.');
  return BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2));
}

export function assertPositiveInteger(value, fieldName) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    const error = new Error(`${fieldName} must be a positive whole number.`);
    error.status = 422;
    error.code = 'INVALID_INPUT';
    throw error;
  }
  return number;
}
