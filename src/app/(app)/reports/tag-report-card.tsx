"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { listTags } from "@/app/actions/tags";
import { FileDown } from "lucide-react";
import type { Tag } from "@/db/schema";

export function TagReportCard() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    listTags().then(setTags);
  }, []);

  const href = selected
    ? `/api/reports/tags.csv?tag=${selected}`
    : `/api/reports/tags.csv`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Contatos por tag</CardTitle>
        <CardDescription className="text-sm">
          Útil para eventos e campanhas pontuais — ex: contatos de um banner com QR code.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50"
        >
          <option value="">Todas as tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<a href={href} download />}
        >
          <FileDown className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </CardContent>
    </Card>
  );
}
