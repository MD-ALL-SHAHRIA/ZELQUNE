'use client';

import { Download, Lock, Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { BarList } from '@/components/charts/bar-list';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select } from '@/components/ui/field';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { RangePicker, useReportRange } from '@/components/ui/range-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_LABEL,
  type ExpenseCategory,
} from '@/features/finance/expenses';
import { api, errorMessage, type Schemas } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { downloadCsv, takaCell } from '@/lib/csv';
import { dhakaDate, shortDay } from '@/lib/dates';
import { formatTaka } from '@/lib/format';

type List = Schemas['ExpenseListDto_Output'];
type Expense = List['items'][number];
type Body = Schemas['UpsertExpenseDto'];

const blank = (): Body => ({
  date: dhakaDate(new Date()),
  category: 'MATERIALS',
  amountPaisa: 0,
  description: '',
  vendor: null,
});

export default function ExpensesPage() {
  const { state } = useAuth();
  const toast = useToast();
  const period = useReportRange('month');
  const { range } = period;
  const [category, setCategory] = useState<ExpenseCategory | ''>('');
  const [list, setList] = useState<List | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; body: Body } | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<Expense | null>(null);
  const owner = state.status === 'signedIn' && state.user.role === 'OWNER';

  const load = useCallback(() => {
    if (!owner) return;
    void api
      .GET('/v1/admin/expenses', {
        params: { query: { ...range, ...(category ? { category } : {}) } },
      })
      .then(({ data, error }) => {
        if (data) setList(data);
        else toast('error', errorMessage(error));
      });
  }, [owner, range, category, toast]);
  useEffect(load, [load]);

  if (!owner)
    return (
      <>
        <PageHeader title="Expenses" />
        <Card>
          <EmptyState icon={<Lock />} title="Only the owner can see expenses" />
        </Card>
      </>
    );

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const { id, body } = editing;
    const res = id
      ? await api.PUT('/v1/admin/expenses/{id}', { params: { path: { id } }, body })
      : await api.POST('/v1/admin/expenses', { body });
    setSaving(false);
    if (!res.data) return toast('error', errorMessage((res as { error?: unknown }).error));
    toast('success', id ? 'Expense updated' : 'Expense added');
    setEditing(null);
    load();
  };

  const remove = async (e: Expense) => {
    const { error } = await api.DELETE('/v1/admin/expenses/{id}', {
      params: { path: { id: e.id } },
    });
    setConfirm(null);
    if (error) return toast('error', errorMessage(error));
    toast('success', 'Expense deleted');
    load();
  };

  const exportCsv = () =>
    list &&
    downloadCsv(`zelqune-expenses-${range.from}-to-${range.to}.csv`, [
      ['Date', 'Category', 'Description', 'Vendor', 'Amount (BDT)'],
      ...list.items.map((e) => [
        e.date,
        EXPENSE_LABEL[e.category],
        e.description,
        e.vendor,
        takaCell(e.amountPaisa),
      ]),
      [],
      ['Total', '', '', '', takaCell(list.totalPaisa)],
    ]);

  const b = editing?.body;
  const setB = (patch: Partial<Body>) =>
    editing && setEditing({ ...editing, body: { ...editing.body, ...patch } });

  return (
    <>
      <PageHeader
        title="Expenses"
        crumbs={[{ href: '/finance', label: 'Profit and loss' }]}
        description="Everything the business spends. It feeds profit and loss."
        actions={
          <>
            <RangePicker state={period} />
            <Button variant="secondary" onClick={exportCsv} disabled={!list?.items.length}>
              <Download /> Export
            </Button>
            <Button onClick={() => setEditing({ id: null, body: blank() })}>
              <Plus /> Add expense
            </Button>
          </>
        }
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
            <Select
              aria-label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory | '')}
              className="w-64"
            >
              <option value="">All categories</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {EXPENSE_LABEL[c]}
                </option>
              ))}
            </Select>
            {list ? (
              <p className="text-sm text-stone">
                Total{' '}
                <span className="font-semibold text-ink tabular">
                  {formatTaka(list.totalPaisa)}
                </span>
              </p>
            ) : null}
          </div>
          {!list ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-11" />
              ))}
            </div>
          ) : list.items.length === 0 ? (
            <EmptyState icon={<Receipt />} title="No expenses in this period">
              Add wood, lights, packaging, ads, rent and wages so profit is real.
            </EmptyState>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead className="bg-cream/60 text-left text-xs text-stone">
                  <tr>
                    <th className="py-2.5 pl-5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">What</th>
                    <th className="px-4 py-2.5 font-medium">Category</th>
                    <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                    <th className="py-2.5 pr-5">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((e) => (
                    <tr key={e.id} className="border-t border-line hover:bg-ink/3">
                      <td className="py-2.5 pl-5 text-stone tabular">{shortDay(e.date)}</td>
                      <td className="px-4 py-2.5">
                        <span className="block text-ink">{e.description}</span>
                        {e.vendor ? (
                          <span className="block text-xs text-stone">{e.vendor}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 text-ink/80">{EXPENSE_LABEL[e.category]}</td>
                      <td className="px-4 py-2.5 text-right font-medium tabular">
                        {formatTaka(e.amountPaisa)}
                      </td>
                      <td className="py-2.5 pr-5">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Edit ${e.description}`}
                            onClick={() =>
                              setEditing({
                                id: e.id,
                                body: {
                                  date: e.date,
                                  category: e.category,
                                  amountPaisa: e.amountPaisa,
                                  description: e.description,
                                  vendor: e.vendor,
                                },
                              })
                            }
                          >
                            <Pencil />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Delete ${e.description}`}
                            onClick={() => setConfirm(e)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card>
          <CardHeader title="By category" />
          <CardBody>
            {list ? (
              <BarList
                format={formatTaka}
                rows={list.byCategory.map((c) => ({
                  key: c.category,
                  label: EXPENSE_LABEL[c.category],
                  value: c.amountPaisa,
                }))}
              />
            ) : (
              <Skeleton className="h-48" />
            )}
          </CardBody>
        </Card>
      </div>

      {editing && b ? (
        <Dialog
          open
          onClose={() => setEditing(null)}
          title={editing.id ? 'Edit expense' : 'Add an expense'}
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => void save()}
                disabled={saving || b.amountPaisa <= 0 || b.description.trim().length < 2}
              >
                {saving ? 'Saving…' : 'Save expense'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Amount (৳)">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={b.amountPaisa ? b.amountPaisa / 100 : ''}
                  onChange={(e) => setB({ amountPaisa: Math.round(Number(e.target.value) * 100) })}
                  autoFocus
                />
              </Field>
              <Field label="Date">
                <Input
                  type="date"
                  value={b.date}
                  onChange={(e) => e.target.value && setB({ date: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Category">
              <Select
                value={b.category}
                onChange={(e) => setB({ category: e.target.value as ExpenseCategory })}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {EXPENSE_LABEL[c]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="What was it for">
              <Input
                value={b.description}
                onChange={(e) => setB({ description: e.target.value })}
                placeholder="Walnut veneer sheets"
              />
            </Field>
            <Field label="Paid to (optional)">
              <Input
                value={b.vendor ?? ''}
                onChange={(e) => setB({ vendor: e.target.value || null })}
                placeholder="Supplier, courier, landlord…"
              />
            </Field>
          </div>
        </Dialog>
      ) : null}

      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title="Delete this expense?"
        description={confirm ? `${confirm.description}, ${formatTaka(confirm.amountPaisa)}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={() => confirm && void remove(confirm)}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-stone">Profit and loss will change straight away.</p>
      </Dialog>
    </>
  );
}
