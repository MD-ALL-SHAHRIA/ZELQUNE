import { type Schemas } from '@/lib/api';

export type ExpenseCategory = Schemas['ExpenseDto_Output']['category'];

export const EXPENSE_LABEL: Record<ExpenseCategory, string> = {
  MATERIALS: 'Materials (wood, lights, hardware)',
  PACKAGING: 'Packaging',
  DELIVERY: 'Courier and delivery',
  MARKETING: 'Marketing and ads',
  SALARIES: 'Salaries and labour',
  RENT: 'Rent',
  UTILITIES: 'Utilities and internet',
  TOOLS: 'Tools and machines',
  FEES: 'Fees (bKash, bank, licences)',
  OTHER: 'Other',
};

export const EXPENSE_CATEGORIES = Object.keys(EXPENSE_LABEL) as ExpenseCategory[];
