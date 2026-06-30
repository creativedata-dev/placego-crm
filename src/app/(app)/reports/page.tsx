import { requireRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileDown } from "lucide-react";
import { TagReportCard } from "./tag-report-card";

export default async function ReportsPage() {
  await requireRole(["admin_placego", "sdr"]);

  const reports = [
    {
      title: "Leads completo",
      description: "Todos os leads com status, origem, score e SDR responsável.",
      endpoint: "/api/reports/leads.csv",
    },
    {
      title: "Pipeline de corretores",
      description: "Todos os assignments com etapa, corretor, data de atribuição e motivo de perda.",
      endpoint: "/api/reports/pipeline.csv",
    },
    {
      title: "Performance por SDR",
      description: "Leads tratados, tempo médio de qualificação e taxa de rejeição por SDR.",
      endpoint: "/api/reports/sdr-performance.csv",
    },
    {
      title: "Volume por tenant",
      description: "Total de leads, qualificados, ganhos e taxa de conversão por tenant.",
      endpoint: "/api/reports/tenant-volume.csv",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground text-sm">Exportar dados em CSV para análise externa</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {reports.map((r) => (
          <Card key={r.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{r.title}</CardTitle>
              <CardDescription className="text-sm">{r.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<a href={r.endpoint} download />}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </CardContent>
          </Card>
        ))}
        <TagReportCard />
      </div>
    </div>
  );
}
