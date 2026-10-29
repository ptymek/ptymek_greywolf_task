/**
 * F-10 (COULD): OCR for scanned pages without a text layer.
 * tesseract.js is loaded lazily, only when a scanned page is actually found,
 * so it does not slow down the regular text-layer path.
 */

type TesseractWorker = Awaited<ReturnType<typeof import('tesseract.js').createWorker>>;

let workerPromise: Promise<TesseractWorker> | null = null;

/**
 * Funkcja zwraca jeden wspólny worker tesseract.js.
 * Przy pierwszym wywołaniu funkcja ładuje bibliotekę i modele "pol" oraz "eng".
 * Przy kolejnych wywołaniach funkcja zwraca ten sam worker.
 *
 * Wejście: brak.
 * Wyjście: Promise z workerem OCR (TesseractWorker).
 */
function getWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = import('tesseract.js').then((t) => t.createWorker(['pol', 'eng']));
  }
  return workerPromise;
}

/**
 * Funkcja ogranicza czas oczekiwania na wynik operacji asynchronicznej.
 * Gdy czas minie, funkcja zwraca null.
 * Gdy operacja zgłosi błąd, funkcja też zwraca null.
 * Uwaga: funkcja nie przerywa samej operacji.
 *
 * Wejście:
 *   - promise – operacja asynchroniczna (Promise<T>),
 *   - ms – limit czasu w ms (number).
 * Wyjście: Promise z wynikiem operacji albo null (T | null).
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), Math.max(ms, 0));
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

/**
 * Funkcja rozpoznaje tekst na obrazie strony (OCR, F-10).
 * OCR działa lokalnie w przeglądarce. Obraz nie trafia na serwer.
 *
 * Wejście:
 *   - canvas – obraz strony (HTMLCanvasElement),
 *   - timeoutMs – limit czasu w ms (number).
 * Wyjście: Promise z rozpoznanym tekstem albo null po przekroczeniu czasu (string | null).
 */
export async function ocrCanvas(
  canvas: HTMLCanvasElement,
  timeoutMs: number,
): Promise<string | null> {
  const job = getWorker().then((w) => w.recognize(canvas));
  const result = await withTimeout(job, timeoutMs);
  return result ? result.data.text.trim() : null;
}

/**
 * Funkcja zatrzymuje worker OCR i zwalnia jego pamięć.
 * Gdy worker nie istnieje, funkcja nic nie robi.
 * Funkcja nie zgłasza wyjątku.
 *
 * Wejście: brak.
 * Wyjście: Promise<void>.
 */
export async function terminateOcr(): Promise<void> {
  if (!workerPromise) return;
  const pending = workerPromise;
  workerPromise = null;
  try {
    const worker = await pending;
    await worker.terminate();
  } catch {
    // worker never started – nothing to clean up
  }
}
