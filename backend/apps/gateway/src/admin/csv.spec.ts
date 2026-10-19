import { csvCell, toCsv } from './csv';

describe('CSV export', () => {
  it('quotes separators and doubles quotes', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line\nbreak')).toBe('"line\nbreak"');
    expect(csvCell(null)).toBe('');
    expect(csvCell(446000)).toBe('446000');
  });

  it('neutralises formula injection', () => {
    expect(csvCell('=HYPERLINK("http://evil")')).toBe('"\'=HYPERLINK(""http://evil"")"');
    expect(csvCell('+8801712345678')).toBe("'+8801712345678");
    expect(csvCell('-1')).toBe("'-1");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('writes a UTF-8 BOM, header and CRLF rows (Bangla safe)', () => {
    const csv = toCsv(
      [
        { key: 'name', header: 'Name' },
        { key: 'total', header: 'Total' },
      ],
      [{ name: 'রহিম', total: 1 }],
    );
    expect(csv).toBe('﻿Name,Total\r\nরহিম,1\r\n');
  });
});
