import { Github, History, Lock } from 'lucide-react';

interface HeaderProps {
  historyCount: number;
  onOpenHistory: () => void;
}

/**
 * Komponent pokazuje nagłówek aplikacji.
 * Komponent zawiera logo i informację "Plik trafia do API AI".
 * Komponent zawiera też przycisk historii z liczbą wpisów i link do repozytorium.
 *
 * Wejście (props):
 *   - historyCount – liczba wpisów historii (number),
 *   - onOpenHistory – funkcja otwarcia panelu historii.
 * Wyjście: element <header> (JSX.Element).
 */
export function Header({ historyCount, onOpenHistory }: HeaderProps) {
  return (
    <header className="header">
      <div className="brand">
        <span className="brand__name">
          PDF <span>INSIGHT</span>
        </span>
        <span className="brand__tag">// Greywolf AI Engine</span>
      </div>
      <div className="header__actions">
        <span className="privacy-badge" title="Tekst z pliku PDF jest wysyłany do modelu AI">
          <Lock size={14} aria-hidden="true" />
          Plik trafia do API AI
        </span>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onOpenHistory}
          aria-label={`Historia analiz (${historyCount})`}
        >
          <History size={18} aria-hidden="true" />
          <span className="header__label">Historia</span>
          <span className="mono">({historyCount})</span>
        </button>
        <a
          className="btn btn--ghost btn--icon"
          href="https://github.com/ptymek/ptymek_greywolf_task"
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Repozytorium na GitHubie"
        >
          <Github size={18} aria-hidden="true" />
        </a>
      </div>
    </header>
  );
}
