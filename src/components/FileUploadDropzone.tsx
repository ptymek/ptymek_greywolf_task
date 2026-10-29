import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { FileUp } from 'lucide-react';
import { MAX_FILE_SIZE_BYTES, formatBytes } from '../lib/fileValidation';

interface FileUploadDropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

/**
 * Komponent pokazuje strefę wgrywania pliku PDF (F-01).
 * Komponent obsługuje przeciągnij i upuść, kliknięcie oraz klawisze Enter i Spacja.
 * Okno wyboru pliku pokazuje tylko pliki PDF.
 * Uwaga: komponent nie sprawdza pliku. Sprawdzenie wykonuje funkcja onFile (App).
 *
 * Wejście (props):
 *   - onFile – funkcja, którą komponent wywołuje z wybranym plikiem,
 *   - disabled – blokada strefy, domyślnie false (boolean).
 * Wyjście: element React (JSX.Element).
 */
export function FileUploadDropzone({ onFile, disabled = false }: FileUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  /**
   * Funkcja otwiera systemowe okno wyboru pliku.
   * Gdy strefa jest zablokowana, funkcja nic nie robi.
   * Wejście: brak. Wyjście: brak.
   */
  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  /**
   * Funkcja obsługuje upuszczenie pliku na strefę.
   * Funkcja przekazuje pierwszy plik do onFile.
   * Wejście: e – zdarzenie upuszczenia (DragEvent). Wyjście: brak.
   */
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  /**
   * Funkcja otwiera okno wyboru pliku po naciśnięciu Enter albo Spacji.
   * Wejście: e – zdarzenie klawiatury (KeyboardEvent). Wyjście: brak.
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  };

  const className = [
    'dropzone',
    dragActive ? 'dropzone--active' : '',
    disabled ? 'dropzone--disabled' : '',
  ].join(' ');

  return (
    <div
      className={className}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label="Wybierz plik PDF do analizy lub upuść go tutaj"
      onClick={openPicker}
      onKeyDown={handleKeyDown}
      onDragEnter={(e) => {
        e.preventDefault();
        if (!disabled) setDragActive(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragActive(false);
      }}
      onDrop={handleDrop}
    >
      <div className="dropzone__icon" aria-hidden="true">
        <FileUp size={30} />
      </div>
      <p className="dropzone__title">
        {dragActive ? 'Upuść plik, aby rozpocząć analizę' : 'Przeciągnij i upuść plik PDF'}
      </p>
      <p className="dropzone__hint">
        lub <strong>kliknij</strong>, aby wybrać z dysku · tylko PDF · maks.{' '}
        {formatBytes(MAX_FILE_SIZE_BYTES)}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = ''; // allow selecting the same file again
        }}
      />
    </div>
  );
}
