/**
 * QR code du portfolio d'un professionnel : à montrer, imprimer (cartes de visite,
 * affiches, stand) ou partager. PNG pour les réseaux et messageries, SVG pour l'impression.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ShareButtons from '@/components/shared/ShareButtons';
import { httpClient } from '@/services/httpClient';
import { API_BASE_URL } from '@/config/api';

interface PortfolioQRCodeProps {
  userId: number;
  name: string;
}

const PortfolioQRCode: React.FC<PortfolioQRCodeProps> = ({ userId, name }) => {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['portfolio-qrcode', userId],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const response = await httpClient.get<{ qr_data_url: string; portfolio_url: string }>(
        `/users/professionals/${userId}/qrcode`, { size: 400 }
      );
      if (!response.success || !response.data) throw new Error(response.error || 'qrcode');
      return response.data;
    },
  });

  const fileUrl = (format: 'png' | 'svg') =>
    `${API_BASE_URL}/users/professionals/${userId}/qrcode?format=${format}&size=1000`;

  if (isError) {
    return <p className="text-sm text-destructive">{t('qrcode.error', 'QR code indisponible pour le moment.')}</p>;
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="rounded-lg border bg-white p-3">
        {isLoading || !data ? (
          <Skeleton className="h-40 w-40" />
        ) : (
          <img
            src={data.qr_data_url}
            alt={t('qrcode.alt', 'QR code du portfolio de {{name}}', { name })}
            width={160}
            height={160}
            className="h-40 w-40"
          />
        )}
      </div>
      <div className="space-y-3 text-center sm:text-start">
        <p className="text-sm text-muted-foreground max-w-xs">
          {t('qrcode.hint', 'Scanné avec un téléphone, il ouvre votre portfolio. Ajoutez-le à vos cartes de visite, affiches ou à votre stand.')}
        </p>
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <Button asChild size="sm">
            <a href={fileUrl('png')} download={`taladz-portfolio-${userId}.png`}>
              <Download className="h-4 w-4 me-2" aria-hidden="true" />
              {t('qrcode.downloadPng', 'Télécharger (PNG)')}
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={fileUrl('svg')} download={`taladz-portfolio-${userId}.svg`}>
              <Printer className="h-4 w-4 me-2" aria-hidden="true" />
              {t('qrcode.downloadSvg', 'Pour impression (SVG)')}
            </a>
          </Button>
        </div>
        {data && <ShareButtons url={data.portfolio_url} title={name} full />}
      </div>
    </div>
  );
};

export default PortfolioQRCode;
