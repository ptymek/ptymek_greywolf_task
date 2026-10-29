import { useEffect, useRef } from 'react';
import { History, Trash2, X } from 'lucide-react';
import type { HistoryEntry } from '../lib/history';
import { formatDateTime } from '../lib/format';

interface AnalysisHistoryProps {
  open: boolean;
  entries: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onClear: () => void;
  onClose: () => void;
}

/**
 * Komponent pokazuje panel z historią ostatnich analiz (F-09).
 * Po otwarciu komponent ustawia fokus na przycisku zamknięcia.
 * Klawisz Escape zamyka panel. Kliknięcie tła też zamyka panel.
 * Wybór wpisu pokazuje wynik bez nowego zapytania do AI.
 * Gdy open = false, komponent nic nie pokazuje.
 *
 * Wejście (props):
 *   - open – stan panelu (boolean),
 *   - entries – wpisy historii (HistoryEntry[]),
 *   - onSelect – funkcja wyboru wpisu,
 *   - onClear – funkcja czyszczenia historii,
 *   - onClose – funkcja zamknięcia panelu.
 * Wyjście: element React albo null.
 */
export function AnalysisHistory({
  open,
  entries,
  onSelect,
  onClear,
  onClose,
}: AnalysisHistoryProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    /**
     * Funkcja zamyka panel po naciśnięciu klawisza Escape.
     * Wejście: e – zdarzenie klawiatury (KeyboardEvent). Wyjście: brak.
     */
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="history-title">
        <div className="drawer__head">
          <h2 id="history-title">
            <History size={18} aria-hidden="true" /> Ostatnie analizy
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={onClose}
            aria-label="Zamknij historię"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="empty">
            Brak zapisanych analiz. Wyniki są przechowywane wyłącznie w tej przeglądarce.
          </p>
        ) : (
          <ul className="drawer__list">
            {entries.map((entry) => (
              <li key={entry.id}>
                <button type="button" className="history-item" onClick={() => onSelect(entry)}>
                  <span className="history-item__name">{entry.result.document.fileName}</span>
                  <span className="history-item__meta">
                    {entry.result.document.type} · {entry.result.document.pages} str. ·{' '}
                    {formatDateTime(entry.analyzedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {entries.length > 0 && (
          <div className="drawer__foot">
            <button type="button" className="btn" onClick={onClear}>
              <Trash2 size={16} aria-hidden="true" />
              Wyczyść historię
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
