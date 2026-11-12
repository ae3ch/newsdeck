import { useState, type FormEvent } from 'react';
import { MAX_MUTED, MAX_MUTED_LENGTH, cleanMutedWords } from '../../lib/mute';
import { CloseIcon } from '../icons';

interface Props {
  words: string[];
  onChange: (words: string[]) => void;
}

/** Wörter und Phrasen, deren Schlagzeilen ausgeblendet werden. */
export function MutedWords({ words, onChange }: Props) {
  const [input, setInput] = useState('');
  const full = words.length >= MAX_MUTED;

  const add = (e: FormEvent) => {
    e.preventDefault();
    // Mehrere auf einmal, durch Komma getrennt.
    const next = cleanMutedWords([...words, ...input.split(',')]);
    if (next.length !== words.length) onChange(next);
    setInput('');
  };

  return (
    <div>
      <form onSubmit={add} className="flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Word or phrase to hide</span>
          <input
            type="text"
            value={input}
            maxLength={MAX_MUTED_LENGTH * 4}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. deal, sponsored, Black Friday"
            disabled={full}
            className="h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm text-ink placeholder:text-muted disabled:opacity-50"
          />
        </label>
        <button
          type="submit"
          disabled={full || !input.trim()}
          className="h-10 shrink-0 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-50"
        >
          Hide
        </button>
      </form>
      {words.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Muted words">
          {words.map((w) => (
            <li key={w}>
              <button
                type="button"
                onClick={() => onChange(words.filter((x) => x !== w))}
                aria-label={`Show headlines with "${w}" again`}
                className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-bg pl-3 pr-2 text-sm hover:border-danger hover:text-danger sm:h-8"
              >
                {w}
                <CloseIcon width={14} height={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-sm text-muted">
        Matches whole words in headlines, ignoring case: "AI" hides "New AI model" but not "said".
        {full && ` You can hide up to ${MAX_MUTED} words.`}
      </p>
    </div>
  );
}
