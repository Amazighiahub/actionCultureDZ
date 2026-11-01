/**
 * EventDocuments — documents PDF de l'événement (programme complet, présentation…), à
 * télécharger depuis la page. Rien n'est affiché quand l'événement n'en a pas.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FileText, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { evenementService } from '@/services/evenement.service';
import { useTranslateData } from '@/hooks/useTranslateData';
import { getAssetUrl } from '@/helpers/assetUrl';

const EventDocuments: React.FC<{ eventId: number }> = ({ eventId }) => {
  const { t } = useTranslation();
  const { td } = useTranslateData();
  const { data: documents = [] } = useQuery({
    queryKey: ['event-documents', eventId],
    queryFn: async () => {
      const res = await evenementService.getDocuments(eventId);
      return res.success && Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 5 * 60 * 1000
  });

  if (!documents.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
          {t('event.documents.titre', 'Documents à télécharger')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {documents.map(doc => (
            <li key={doc.id_media} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <span className="flex items-center gap-2 font-medium min-w-0" dir="auto">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="truncate">{td(doc.titre)}</span>
                <span className="text-xs text-muted-foreground">PDF</span>
              </span>
              <Button asChild size="sm" variant="outline">
                <a href={getAssetUrl(doc.lien)} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 me-2" aria-hidden="true" />
                  {t('common.download', 'Télécharger')}
                </a>
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default EventDocuments;
