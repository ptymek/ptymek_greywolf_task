import { AlertTriangle, RotateCcw, Upload } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onReset: () => void;
}

/**
 * Komponent pokazuje komunikat błędu (F-06).
 * Gdy onRetry istnieje, komponent pokazuje przycisk "Spróbuj ponownie".
 * Komponent zawsze pokazuje przycisk "Wybierz inny plik".
 * Czytnik ekranu odczytuje komunikat od razu (role="alert").
 *
 * Wejście (props):
 *   - message – komunikat po polsku (string),
 *   - onRetry – opcjonalna funkcja ponowienia,
 *   - onReset – funkcja powrotu do stanu pustego.
 * Wyjście: element React (JSX.Element).
 */
export function ErrorBanner({ message, onRetry, onReset }: ErrorBannerProps) {
  return (
    <div className="error-banner" role="alert" aria-live="assertive">
      <AlertTriangle className="error-banner__icon" size={28} aria-hidden="true" />
      <div className="error-banner__body">
        <p className="error-banner__title">Nie udało się przeanalizować dokumentu</p>
        <p className="error-banner__message">{message}</p>
      </div>
      <div className="error-banner__actions">
        {onRetry && (
          <button type="button" className="btn btn--primary" onClick={onRetry} autoFocus>
            <RotateCcw size={16} aria-hidden="true" />
            Spróbuj ponownie
          </button>
        )}
        <button type="button" className="btn" onClick={onReset} autoFocus={!onRetry}>
          <Upload size={16} aria-hidden="true" />
          Wybierz inny plik
        </button>
      </div>
    </div>
  );
}
