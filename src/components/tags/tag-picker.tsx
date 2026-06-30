"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { listTags, createTag, applyTagToContact, removeTagFromContact } from "@/app/actions/tags";
import { X, Plus, Tag as TagIcon } from "lucide-react";
import type { Tag } from "@/db/schema";

interface Props {
  contactId: string;
  initialTags: Tag[];
  compact?: boolean;
}

export function TagPicker({ contactId, initialTags, compact = false }: Props) {
  const [contactTags, setContactTags] = useState<Tag[]>(initialTags);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) listTags().then(setAllTags);
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const appliedIds = new Set(contactTags.map((t) => t.id));
  const filtered = allTags.filter((t) =>
    !appliedIds.has(t.id) && t.name.toLowerCase().includes(search.toLowerCase())
  );
  const exactMatch = allTags.some((t) => t.name.toLowerCase() === search.trim().toLowerCase());
  const canCreate = search.trim().length > 0 && !exactMatch;

  function handleApply(tag: Tag) {
    setContactTags((prev) => [...prev, tag]);
    setSearch("");
    startTransition(() => applyTagToContact(contactId, tag.id));
  }

  function handleCreate() {
    const name = search.trim();
    startTransition(async () => {
      const tag = await createTag(name);
      if (tag) {
        setContactTags((prev) => [...prev, tag]);
        setAllTags((prev) => [...prev, tag]);
      }
      setSearch("");
    });
  }

  function handleRemove(tagId: string) {
    setContactTags((prev) => prev.filter((t) => t.id !== tagId));
    startTransition(() => removeTagFromContact(contactId, tagId));
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap gap-1.5 items-center">
        {!compact && contactTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full text-white group"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            <button
              onClick={() => handleRemove(tag.id)}
              className="opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        <button
          onClick={() => setOpen((v) => !v)}
          className={compact
            ? "inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
            : "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
          }
        >
          <Plus className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} /> Tag
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-30 w-64 bg-background border rounded-xl shadow-lg p-2">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ou criar tag..."
            className="w-full h-8 px-2 text-sm rounded-lg border border-input outline-none focus:ring-2 focus:ring-ring/50 mb-2"
            onKeyDown={(e) => {
              if (e.key === "Enter" && canCreate) handleCreate();
            }}
          />

          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {filtered.length === 0 && !canCreate && (
              <p className="text-xs text-muted-foreground text-center py-2">
                {allTags.length === 0 ? "Nenhuma tag criada ainda" : "Nenhuma tag encontrada"}
              </p>
            )}
            {filtered.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleApply(tag)}
                disabled={isPending}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted text-left text-sm"
              >
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </button>
            ))}
            {canCreate && (
              <button
                onClick={handleCreate}
                disabled={isPending}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted text-left text-sm text-primary font-medium"
              >
                <TagIcon className="h-3.5 w-3.5" />
                Criar "{search.trim()}"
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
