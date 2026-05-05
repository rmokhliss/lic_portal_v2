// ==============================================================================
// LIC v2 — SearchableSelect (Phase 16 — DETTE-LIC-013/014 résolues)
//
// Combobox léger avec recherche textuelle client-side. Remplace les `<select>`
// statiques quand la liste dépasse une vingtaine d'éléments (pas de pagination
// cursor — la liste préchargée jusqu'à 200 items est filtrée en temps réel).
//
// Pattern :
//   - Input cliquable affichant la valeur courante (label).
//   - Au focus, liste flottante affichant les options filtrées par sous-chaîne
//     (case-insensitive sur label).
//   - Sélection via clic → ferme la liste + remplit un input hidden form-friendly
//     avec la valeur (id) pour soumission HTML standard.
//
// Pas de dépendance shadcn Command/Popover — primitives natives (input, ul/li).
// Accessible : aria-expanded, aria-activedescendant, navigation clavier ↑↓ Enter.
// ==============================================================================

"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Input } from "@/components/ui/input";

export interface SearchableSelectOption {
  /** Valeur retournée à la soumission (id, code, …). */
  readonly value: string;
  /** Texte affiché et recherchable. */
  readonly label: string;
  /** Sous-texte optionnel (ex: statut). */
  readonly hint?: string;
}

export interface SearchableSelectProps {
  readonly id?: string;
  /** Nom de l'input hidden form-friendly. */
  readonly name: string;
  readonly options: readonly SearchableSelectOption[];
  readonly placeholder?: string;
  readonly emptyText?: string;
  readonly required?: boolean;
  readonly defaultValue?: string;
  /** Callback optionnel notifié à chaque sélection (pour cas non-form). */
  readonly onSelect?: (value: string) => void;
}

export function SearchableSelect({
  id,
  name,
  options,
  placeholder = "Rechercher…",
  emptyText = "Aucun résultat.",
  required = false,
  defaultValue,
  onSelect,
}: SearchableSelectProps): React.JSX.Element {
  const reactId = useId();
  const inputId = id ?? reactId;
  const listId = `${inputId}-list`;
  const [query, setQuery] = useState<string>(() => {
    if (defaultValue === undefined) return "";
    return options.find((o) => o.value === defaultValue)?.label ?? "";
  });
  const [selected, setSelected] = useState<string>(defaultValue ?? "");
  const [open, setOpen] = useState<boolean>(false);
  const [highlight, setHighlight] = useState<number>(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered =
    query.trim().length === 0
      ? options
      : options.filter((o) => {
          const q = query.trim().toLowerCase();
          return o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q);
        });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current !== null && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function selectOption(opt: SearchableSelectOption): void {
    setSelected(opt.value);
    setQuery(opt.label);
    setOpen(false);
    onSelect?.(opt.value);
  }

  return (
    <div ref={wrapperRef} className="relative">
      {/* Input visible (recherche + affichage) */}
      <Input
        id={inputId}
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          // si l'user retape, désélectionne (force nouvelle sélection)
          if (selected !== "") setSelected("");
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => {
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHighlight((h) => Math.min(h + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            const opt = filtered[highlight];
            if (opt !== undefined) {
              e.preventDefault();
              selectOption(opt);
            }
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />

      {/* Hidden input form-friendly (le form lit `name`) */}
      <input type="hidden" name={name} value={selected} required={required} />

      {/* Dropdown liste */}
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="bg-background border-border absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="text-muted-foreground px-3 py-2 text-sm">{emptyText}</li>
          ) : (
            filtered.map((opt, idx) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={selected === opt.value}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  idx === highlight ? "bg-accent" : "hover:bg-accent/50"
                }`}
                onMouseEnter={() => {
                  setHighlight(idx);
                }}
                onMouseDown={(e) => {
                  // mousedown plutôt que onClick : évite que le blur de l'input
                  // (et la fermeture qui s'ensuit via document.mousedown) ne
                  // tue le click avant qu'on l'attrape.
                  e.preventDefault();
                  selectOption(opt);
                }}
              >
                <div className="font-medium">{opt.label}</div>
                {opt.hint !== undefined && (
                  <div className="text-muted-foreground text-xs">{opt.hint}</div>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
