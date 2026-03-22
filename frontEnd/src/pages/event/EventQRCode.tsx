import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { QrCode, Download, Copy, Check, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { evenementService } from '@/services/evenement.service';

interface EventQRCodeProps {
  eventId: number;
  eventTitle?: string;
}

export default function EventQRCode({ eventId, eventTitle }: EventQRCodeProps) {
  const { t } = useTranslation();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [eventUrl, setEventUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchQR = async () => {
      setLoading(true);
      const response = await evenementService.getQRCode(eventId, 400);
      if (response.success && response.data) {
        setQrDataUrl(response.data.qr_data_url);
        setEventUrl(response.data.event_url);
      }
      setLoading(false);
    };
    fetchQR();
  }, [eventId]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `event-${eventId}-qrcode.png`;
    link.click();
  };

  const handleCopyLink = async () => {
    if (!eventUrl) return;
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = eventUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: eventTitle || t('event.share.title', 'Partager l\'événement'),
          url: eventUrl,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      handleCopyLink();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <div className="w-64 h-64 bg-muted animate-pulse rounded-lg" />
          <div className="w-32 h-4 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!qrDataUrl) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <QrCode className="h-12 w-12 mx-auto mb-2 opacity-40" />
          <p>{t('event.qrcode.unavailable', 'QR Code non disponible')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 flex flex-col items-center gap-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          {t('event.qrcode.title', 'QR Code de l\'événement')}
        </h3>

        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <img
            src={qrDataUrl}
            alt={t('event.qrcode.alt', 'QR Code pour accéder à l\'événement')}
            className="w-64 h-64"
          />
        </div>

        <p className="text-sm text-muted-foreground text-center max-w-xs">
          {t('event.qrcode.description', 'Scannez ce QR code pour accéder directement à la page de l\'événement.')}
        </p>

        <div className="flex flex-wrap gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" />
            {t('event.qrcode.download', 'Télécharger')}
          </Button>

          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            {copied ? <Check className="h-4 w-4 mr-1 text-green-600" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? t('event.qrcode.copied', 'Copié !') : t('event.qrcode.copyLink', 'Copier le lien')}
          </Button>

          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-1" />
            {t('event.qrcode.share', 'Partager')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
