export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB (F-01)

export type FileValidationResult = { ok: true } | { ok: false; error: string };

export const FILE_ERRORS = {
  notPdf: 'Niedozwolony format pliku. Wybierz dokument w formacie PDF.',
  tooLarge: 'Rozmiar pliku przekracza dozwolony limit 10 MB.',
  empty: 'Wybrany plik jest pusty.',
  badHeader: 'Plik nie jest poprawnym dokumentem PDF (brak nagłówka %PDF).',
} as const;

interface FileLike {
  name: string;
  type: string;
  size: number;
}

/**
 * Funkcja sprawdza metadane pliku przed odczytem zawartości (F-01).
 * Funkcja sprawdza rozszerzenie ".pdf", typ MIME i rozmiar pliku.
 * Pusty typ MIME jest dozwolony, bo niektóre systemy go nie podają.
 * Plik musi mieć więcej niż 0 B i maksymalnie 10 MB.
 *
 * Wejście: file – obiekt z polami name, type, size (np. File z przeglądarki).
 * Wyjście: { ok: true } albo { ok: false, error } z komunikatem po polsku.
 */
export function validateFileMeta(file: FileLike): FileValidationResult {
  const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');
  // Some systems report an empty MIME type for PDFs; extension check still applies.
  const hasPdfMime = file.type === 'application/pdf' || file.type === '';
  if (!hasPdfExtension || !hasPdfMime) return { ok: false, error: FILE_ERRORS.notPdf };
  if (file.size === 0) return { ok: false, error: FILE_ERRORS.empty };
  if (file.size > MAX_FILE_SIZE_BYTES) return { ok: false, error: FILE_ERRORS.tooLarge };
  return { ok: true };
}

/**
 * Funkcja sprawdza sygnaturę pliku PDF.
 * Każdy plik PDF zaczyna się od bajtów "%PDF-".
 * Funkcja wykrywa plik z fałszywym rozszerzeniem ".pdf".
 *
 * Wejście: bytes – pierwsze bajty pliku (Uint8Array, min. 5 bajtów).
 * Wyjście: true, gdy sygnatura jest poprawna; w innym przypadku false (boolean).
 */
export function hasPdfHeader(bytes: Uint8Array): boolean {
  const signature = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  return signature.every((b, i) => bytes[i] === b);
}

/**
 * Funkcja zamienia rozmiar w bajtach na tekst dla użytkownika.
 * Funkcja wybiera jednostkę B, KB albo MB.
 *
 * Wejście: bytes – rozmiar w bajtach (number).
 * Wyjście: tekst, np. "512 B", "12.5 KB", "10.00 MB" (string).
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
