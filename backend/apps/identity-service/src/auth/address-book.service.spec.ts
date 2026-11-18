import { type PrismaService } from '../prisma/prisma.service';
import { AddressBookService } from './address-book.service';

type Row = Record<string, unknown> & { id: string; userId: string; isDefault: boolean };

/** In-memory customer_addresses with the few Prisma calls the service uses. */
function fakeDb() {
  let rows: Row[] = [];
  let seq = 0;
  const match = (r: Row, where: Record<string, unknown>) =>
    Object.entries(where).every(([k, v]) => r[k] === v);
  const table = {
    findMany: ({ where }: { where: Record<string, unknown> }) =>
      Promise.resolve(
        rows
          .filter((r) => match(r, where))
          .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || Number(b.at) - Number(a.at)),
      ),
    findFirst: ({ where }: { where: Record<string, unknown> }) =>
      Promise.resolve(
        rows.filter((r) => match(r, where)).sort((a, b) => Number(b.at) - Number(a.at))[0] ?? null,
      ),
    count: ({ where }: { where: Record<string, unknown> }) =>
      Promise.resolve(rows.filter((r) => match(r, where)).length),
    create: ({ data }: { data: Record<string, unknown> }) => {
      const row = {
        ...data,
        id: `00000000-0000-4000-8000-00000000000${++seq}`,
        at: seq,
      } as unknown as Row;
      rows.push(row);
      return Promise.resolve(row);
    },
    updateMany: ({ where, data }: { where: Record<string, unknown>; data: object }) => {
      const hit = rows.filter((r) => match(r, where));
      hit.forEach((r) => Object.assign(r, data, { at: ++seq }));
      return Promise.resolve({ count: hit.length });
    },
    update: ({ where, data }: { where: { id: string }; data: object }) =>
      Promise.resolve(
        Object.assign(
          rows.find((r) => r.id === where.id)!,
          data,
        ),
      ),
    delete: ({ where }: { where: { id: string } }) => {
      rows = rows.filter((r) => r.id !== where.id);
      return Promise.resolve({});
    },
  };
  const db = { customerAddress: table, $transaction: (fn: (tx: unknown) => unknown) => fn(db) };
  return db as unknown as PrismaService;
}

const ME = 'user-me';
const OTHER = 'user-other';
const home = {
  recipientName: 'Rahim',
  phone: '01712345678',
  district: 'dhaka',
  area: 'dhanmondi',
  line: 'House 7, Road 4',
};

describe('AddressBookService', () => {
  it('makes the first address the default and keeps exactly one default', async () => {
    const book = new AddressBookService(fakeDb());
    let list = await book.save(ME, null, home);
    expect(list.items).toHaveLength(1);
    expect(list.items[0]!.isDefault).toBe(true);

    list = await book.save(ME, null, { ...home, area: 'mirpur', isDefault: true });
    expect(list.items.filter((a) => a.isDefault)).toHaveLength(1);
    expect(list.items[0]!.area).toBe('mirpur');
  });

  it('refuses an area that is not in the district', async () => {
    const book = new AddressBookService(fakeDb());
    await expect(book.save(ME, null, { ...home, area: 'Mirpur 10' })).rejects.toThrow();
  });

  it("never lets one customer change or delete another's address", async () => {
    const db = fakeDb();
    const book = new AddressBookService(db);
    const [mine] = (await book.save(ME, null, home)).items;
    await expect(book.save(OTHER, mine!.id, home)).rejects.toMatchObject({
      code: 'ADDRESS_NOT_FOUND',
      status: 404,
    });
    await expect(book.remove(OTHER, mine!.id)).rejects.toMatchObject({ status: 404 });
    expect((await book.list(OTHER)).items).toHaveLength(0);
  });

  it('caps the book at 10 and promotes another address when the default is deleted', async () => {
    const book = new AddressBookService(fakeDb());
    for (let i = 0; i < 10; i++) await book.save(ME, null, home);
    await expect(book.save(ME, null, home)).rejects.toMatchObject({ code: 'ADDRESS_LIMIT' });

    const before = (await book.list(ME)).items;
    const after = (await book.remove(ME, before[0]!.id)).items;
    expect(after).toHaveLength(9);
    expect(after.filter((a) => a.isDefault)).toHaveLength(1);
  });
});
