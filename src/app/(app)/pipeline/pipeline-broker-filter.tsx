"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface Props {
  brokers: { id: string; name: string }[];
  selected: string;
}

export function PipelineBrokerFilter({ brokers, selected }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("broker", e.target.value);
    } else {
      params.delete("broker");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={selected}
      onChange={handleChange}
      className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="">Todos os corretores</option>
      {brokers.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </select>
  );
}
