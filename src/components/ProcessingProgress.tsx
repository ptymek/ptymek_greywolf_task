import { Check, FileText, Loader2 } from 'lucide-react';
import { formatBytes } from '../lib/fileValidation';

export const PROCESSING_STEPS = [
  'Odczyt pliku PDF',
  'Ekstrakcja tekstu',
  'Analiza AI',
  'Walidacja schematu',
] as const;

interface ProcessingProgressProps {
  fileName: string;
  fileSize: number;
  currentStep: number; // 0..3
  detail: string;
}

/**
 * Komponent pokazuje postęp analizy w 4 etapach (F-06).
 * Etapy: odczyt pliku, ekstrakcja tekstu, analiza AI, walidacja schematu.
 * Etap przed bieżącym ma znak "gotowe". Bieżący etap ma animację ładowania.
 * Pasek postępu pokazuje środek bieżącego etapu.
 * Czytnik ekranu odczytuje zmianę komunikatu (aria-live="polite").
 *
 * Wejście (props):
 *   - fileName – nazwa pliku (string),
 *   - fileSize – rozmiar pliku w bajtach (number),
 *   - currentStep – numer bieżącego etapu 0–3 (number),
 *   - detail – komunikat szczegółowy (string).
 * Wyjście: element React (JSX.Element).
 */
export function ProcessingProgress({
  fileName,
  fileSize,
  currentStep,
  detail,
}: ProcessingProgressProps) {
  const percent = Math.round(((currentStep + 0.5) / PROCESSING_STEPS.length) * 100);

  return (
    <section className="progress" aria-labelledby="progress-title">
      <h2 id="progress-title" className="sr-only">
        Postęp analizy
      </h2>
      <div className="progress__file">
        <FileText size={20} aria-hidden="true" />
        <span>
          {fileName} <small>({formatBytes(fileSize)})</small>
        </span>
      </div>
      <ol className="steps">
        {PROCESSING_STEPS.map((label, i) => {
          const state = i < currentStep ? 'done' : i === currentStep ? 'active' : 'pending';
          return (
            <li
              key={label}
              className={`step step--${state}`}
              aria-current={state === 'active' ? 'step' : undefined}
            >
              <span className="step__icon" aria-hidden="true">
                {state === 'done' ? (
                  <Check size={16} />
                ) : state === 'active' ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <span className="mono">{i + 1}</span>
                )}
              </span>
              <span>{label}</span>
            </li>
          );
        })}
      </ol>
      <div
        className="bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Postęp analizy"
      >
        <div className="bar__fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="progress__detail" aria-live="polite">
        {detail}
      </p>
    </section>
  );
}
