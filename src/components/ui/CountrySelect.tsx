'use client';

/**
 * Searchable country dropdown — ISO 3166-1 alpha-2, ~195 countries.
 * Search by name or code; keyboard nav; max height 320px; smooth scroll.
 */

import { useMemo, useState, useRef, useEffect } from 'react';
import { getAllCountries, getCountryByCode, type Country } from '@/lib/countries';

const SORTED_COUNTRIES = [...getAllCountries()].sort((a, b) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
);

function filterCountries(list: Country[], query: string): Country[] {
  if (!query.trim()) return list;
  const q = query.trim().toLowerCase();
  return list.filter(
    (c) =>
      c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
  );
}

export type CountrySelectProps = {
  value: string;
  onChange: (code: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Override trigger button styles (e.g. auth glass forms) */
  buttonClassName?: string;
  'aria-label'?: string;
};

export default function CountrySelect({
  value,
  onChange,
  id,
  placeholder = 'Select country',
  disabled = false,
  className = '',
  buttonClassName,
  'aria-label': ariaLabel = 'Country',
}: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = getCountryByCode(value);
  const filtered = useMemo(
    () => filterCountries(SORTED_COUNTRIES, search),
    [search]
  );
  const count = filtered.length;

  // Reset highlight when filter changes; keep in bounds
  useEffect(() => {
    setHighlightedIndex((i) => Math.min(Math.max(0, i), count - 1));
  }, [search, count]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!isOpen || !listRef.current || count === 0) return;
    const el = listRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlightedIndex, isOpen, count]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus search when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setHighlightedIndex(0);
      inputRef.current?.focus();
    }
  }, [isOpen]);

  function open() {
    if (!disabled) setIsOpen(true);
  }

  function select(code: string) {
    onChange(code);
    setIsOpen(false);
    setSearch('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        open();
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((i) => (i + 1) % count);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((i) => (i - 1 + count) % count);
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[highlightedIndex]) select(filtered[highlightedIndex].code);
        break;
      default:
        break;
    }
  }

  const baseInputClass =
    'w-full h-12 px-4 rounded-[12px] bg-canvas-tertiary border border-[rgba(255,255,255,0.08)] text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 text-[15px]';
  const triggerClass = buttonClassName ?? baseInputClass;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={id ? `${id}-listbox` : undefined}
        onClick={open}
        onKeyDown={handleKeyDown}
        className={`${triggerClass} flex items-center justify-between text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span className="truncate">
          {selected ? (
            <>
              <span aria-hidden className="mr-2">{selected.flagEmoji}</span>
              {selected.name}
            </>
          ) : (
            <span className="text-text-muted">{placeholder}</span>
          )}
        </span>
        <span
          aria-hidden
          className={`shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 rounded-[12px] overflow-hidden border border-[rgba(255,255,255,0.08)] bg-canvas-tertiary shadow-lg"
          role="combobox"
          aria-expanded="true"
        >
          <div className="p-2 border-b border-[rgba(255,255,255,0.06)]">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search countries..."
              className={`${baseInputClass} h-10 text-[14px]`}
              aria-autocomplete="list"
              aria-controls={id ? `${id}-listbox` : undefined}
            />
          </div>
          <ul
            ref={listRef}
            id={id ? `${id}-listbox` : undefined}
            role="listbox"
            className="max-h-[320px] overflow-y-auto overscroll-contain py-1 scroll-smooth"
            style={{ scrollBehavior: 'smooth' }}
          >
            {count === 0 ? (
              <li className="px-4 py-3 text-[14px] text-text-muted">
                No countries match &quot;{search}&quot;
              </li>
            ) : (
              filtered.map((c, i) => (
                <li
                  key={c.code}
                  data-index={i}
                  role="option"
                  aria-selected={value === c.code}
                  className={`flex items-center gap-2 px-4 py-2.5 cursor-pointer text-[14px] text-text-primary transition-colors ${
                    i === highlightedIndex
                      ? 'bg-white/10 text-white'
                      : 'hover:bg-white/5'
                  }`}
                  onClick={() => select(c.code)}
                  onMouseEnter={() => setHighlightedIndex(i)}
                >
                  <span aria-hidden className="shrink-0 text-[1.1em]">
                    {c.flagEmoji}
                  </span>
                  <span className="truncate">{c.name}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
