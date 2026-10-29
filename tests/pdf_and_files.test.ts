import { describe, it, expect } from 'vitest';
import {
  FILE_ERRORS,
  MAX_FILE_SIZE_BYTES,
  hasPdfHeader,
  validateFileMeta,
} from '../src/lib/fileValidation';
import { buildDocumentText, isPageEmpty, joinTextItems } from '../src/lib/pdfText';
import { exportFileName } from '../src/components/JsonViewer';

describe('F-01: file validation', () => {
  it('AUTO-16: accepts a PDF up to 10 MB', () => {
    expect(validateFileMeta({ name: 'umowa.pdf', type: 'application/pdf', size: 1024 }).ok).toBe(
      true,
    );
    expect(
      validateFileMeta({ name: 'A.PDF', type: 'application/pdf', size: MAX_FILE_SIZE_BYTES }).ok,
    ).toBe(true);
  });

  it('AUTO-17: rejects non-PDF files with a Polish message', () => {
    expect(validateFileMeta({ name: 'obraz.png', type: 'image/png', size: 100 })).toEqual({
      ok: false,
      error: FILE_ERRORS.notPdf,
    });
    expect(validateFileMeta({ name: 'fake.pdf', type: 'text/plain', size: 100 }).ok).toBe(false);
  });

  it('AUTO-18: rejects files over 10 MB', () => {
    expect(
      validateFileMeta({ name: 'big.pdf', type: 'application/pdf', size: MAX_FILE_SIZE_BYTES + 1 }),
    ).toEqual({ ok: false, error: FILE_ERRORS.tooLarge });
  });

  it('checks the %PDF- magic bytes', () => {
    expect(hasPdfHeader(new TextEncoder().encode('%PDF-1.7\n'))).toBe(true);
    expect(hasPdfHeader(new TextEncoder().encode('<html>'))).toBe(false);
    expect(hasPdfHeader(new Uint8Array())).toBe(false);
  });
});

describe('F-02: text assembly from pdf.js items', () => {
  it('joins text items, respects end-of-line flags and skips marked content', () => {
    const text = joinTextItems([
      { str: 'UMOWA RAMOWA', hasEOL: true },
      { type: 'beginMarkedContent' },
      { str: 'nr', hasEOL: false },
      { str: '14/2026', hasEOL: true },
    ]);
    expect(text).toBe('UMOWA RAMOWA\nnr 14/2026');
  });

  it('AUTO-19: treats scanned pages (no text layer) as empty instead of failing', () => {
    expect(isPageEmpty('')).toBe(true);
    expect(isPageEmpty('  \n ')).toBe(true);
    expect(isPageEmpty('§ 5. Wynagrodzenie i warunki płatności')).toBe(false);
  });

  it('builds document text with page markers, skipping empty pages', () => {
    const text = buildDocumentText([
      { pageNumber: 10, text: 'strona dziesiąta', source: 'text-layer' },
      { pageNumber: 11, text: '', source: 'empty' },
      { pageNumber: 12, text: 'podpisy', source: 'text-layer' },
    ]);
    expect(text).toContain('--- Strona 10 ---');
    expect(text).not.toContain('--- Strona 11 ---');
    expect(text).toContain('--- Strona 12 ---');
  });
});

describe('F-05: export', () => {
  it('derives a safe <name>-insight.json file name', () => {
    expect(exportFileName('Test_PDF_Insight_umowa_14-2026.pdf')).toBe(
      'Test_PDF_Insight_umowa_14-2026-insight.json',
    );
    expect(exportFileName('../../etc/passwd.pdf')).toBe('.._.._etc_passwd-insight.json');
    expect(exportFileName('umowa zażółć.pdf')).toBe('umowa_zażółć-insight.json');
  });
});
