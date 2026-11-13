/**
 * Affichette imprimable d'un site du patrimoine (audit V11 OUT-12) : à poser sur place, elle relie le
 * lieu réel à sa fiche. Nom dans chaque écriture renseignée (français, arabe, tamazight latin et
 * tifinagh), QR code, « Écoutez l'histoire » s'il y a un enregistrement, localisation, adresse du site.
 *
 * Imprimée depuis la page elle-même (pas une fenêtre à part) : les polices du site, dont le tifinagh,
 * restent disponibles. À l'impression, seule l'affichette est montrée (index.css, .affichette-qr).
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { httpClient } from '@/services/httpClient';

interface Props {
  idLieu: number;
  /** Nom affiché (langue du site) : en repli si les autres langues ne peuvent pas être lues */
  nom: string;
  qrDataUrl: string | null;
  lieu?: string | null;
  avecAudio?: boolean;
}

const ORDRE: Array<{ code: string; dir: 'ltr' | 'rtl'; classe?: string }> = [
  { code: 'fr', dir: 'ltr' },
  { code: 'ar', dir: 'rtl' },
  { code: 'tz-ltn', dir: 'ltr' },
  { code: 'tz-tfng', dir: 'ltr', classe: 'font-tifinagh' },
];

export default function AffichetteQR({ idLieu, nom, qrDataUrl, lieu, avecAudio }: Props) {
  const { t } = useTranslation();
  const [impression, setImpression] = useState(false);
  const [noms, setNoms] = useState<Partial<Record<string, string>>>({});
  const [preparation, setPreparation] = useState(false);

  // Le nom dans toutes les langues (la fiche ne reçoit que celle de l'affichage)
  const preparer = async () => {
    setPreparation(true);
    try {
      const res = await httpClient.get<{ nom?: Record<string, string> | string }>(`/patrimoine/${idLieu}`, { i18n: 'all' });
      const n = res.success ? res.data?.nom : undefined;
      setNoms(n && typeof n === 'object' ? n : { fr: nom });
    } catch {
      setNoms({ fr: nom });
    } finally {
      setPreparation(false);
      setImpression(true);
    }
  };

  useEffect(() => {
    if (!impression) return;
    const fin = () => setImpression(false);
    window.addEventListener('afterprint', fin, { once: true });
    // Laisser l'affichette s'afficher avant d'ouvrir la fenêtre d'impression
    const minuteur = setTimeout(() => window.print(), 100);
    return () => { clearTimeout(minuteur); window.removeEventListener('afterprint', fin); };
  }, [impression]);

  const lignes = ORDRE.filter(({ code }) => (noms[code] || '').trim());
  // Une même écriture répétée (nom identique en français et en tamazight latin) n'est imprimée qu'une fois
  const vus = new Set<string>();
  const uniques = lignes.filter(({ code }) => { const n = noms[code]!.trim(); if (vus.has(n)) return false; vus.add(n); return true; });

  return (
    <>
      <Button variant="outline" size="sm" className="w-full" onClick={preparer} disabled={!qrDataUrl || preparation}>
        <Printer className="h-4 w-4 me-2" aria-hidden="true" />
        {t('patrimoine.affichette.imprimer', 'Imprimer l’affichette')}
      </Button>
      {impression && qrDataUrl && createPortal(
        <div className="affichette-qr" aria-hidden="true">
          <img src="/logo-taladz.webp" alt="" className="affichette-logo" />
          <div className="affichette-noms">
            {uniques.map(({ code, dir, classe }, i) => (
              <p key={code} dir={dir} lang={code === 'tz-ltn' ? 'ber-Latn' : code === 'tz-tfng' ? 'ber-Tfng' : code}
                className={`${i === 0 ? 'affichette-nom-principal' : 'affichette-nom'} ${classe || ''}`}>
                {noms[code]}
              </p>
            ))}
          </div>
          <img src={qrDataUrl} alt="" className="affichette-qr-image" />
          {/* Affichette bilingue français-arabe, quelle que soit la langue du site */}
          <p className="affichette-consigne" lang="fr">
            {avecAudio ? 'Scannez pour découvrir ce lieu et écouter son histoire' : 'Scannez pour découvrir ce lieu'}
          </p>
          <p className="affichette-consigne" dir="rtl" lang="ar">
            {avecAudio ? 'امسح الرمز لاكتشاف هذا المكان والاستماع إلى تاريخه' : 'امسح الرمز لاكتشاف هذا المكان'}
          </p>
          {lieu && <p className="affichette-lieu">{lieu}</p>}
          <p className="affichette-site">taladz.com</p>
        </div>,
        document.body
      )}
    </>
  );
}
