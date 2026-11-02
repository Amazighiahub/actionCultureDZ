/**
 * DocumentsEvenementGestion — l'organisateur joint des PDF à son événement (programme complet,
 * présentation…) ; ils apparaissent sur la page de l'événement, à télécharger.
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FileText, Trash2, Upload, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { evenementService } from '@/services/evenement.service';
import { uploadService } from '@/services/upload.service';
import { useTranslateData } from '@/hooks/useTranslateData';
import { getAssetUrl } from '@/helpers/assetUrl';
import { ConfirmDialog } from '@/components/shared';

const PDF_MAX = 50 * 1024 * 1024;
const MAX_DOCUMENTS = 5;

const DocumentsEvenementGestion: React.FC<{ evenementId: number }> = ({ evenementId }) => {
  const { t } = useTranslation();
  const { td } = useTranslateData();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cle = ['event-documents', evenementId];
  const [titre, setTitre] = useState('');
  const [fichier, setFichier] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // Changer la clé vide le champ fichier après un ajout
  const [cleChamp, setCleChamp] = useState(0);
  const [aRetirer, setARetirer] = useState<number | null>(null);
  const [retraitEnCours, setRetraitEnCours] = useState(false);

  const { data: documents = [] } = useQuery({
    queryKey: cle,
    queryFn: async () => {
      const res = await evenementService.getDocuments(evenementId);
      return res.success && Array.isArray(res.data) ? res.data : [];
    }
  });

  const choisir = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setErreur(null);
    if (f && f.type !== 'application/pdf') {
      setErreur(t('pro.participants.messages.pdfSeulement', 'Choisissez un fichier PDF.'));
      e.target.value = '';
      setFichier(null);
      return;
    }
    if (f && f.size > PDF_MAX) {
      setErreur(t('pro.participants.messages.pdfTropGros', 'Le PDF est trop lourd (50 Mo au plus).'));
      e.target.value = '';
      setFichier(null);
      return;
    }
    setFichier(f);
    // Titre proposé à partir du nom du fichier, modifiable
    if (f && !titre.trim()) setTitre(f.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim());
  };

  const ajouter = async () => {
    if (!fichier || !titre.trim()) return;
    setEnvoi(true); setErreur(null);
    try {
      const envoye = await uploadService.uploadDocument(fichier);
      if (!envoye.success || !envoye.data?.url) {
        throw new Error(envoye.error || t('pro.participants.messages.pdfEchec', 'Le PDF n’a pas pu être envoyé, réessayez.'));
      }
      const res = await evenementService.ajouterDocument(evenementId, envoye.data.url, titre.trim());
      if (!res.success) throw new Error(res.error);
      setTitre(''); setFichier(null); setCleChamp(c => c + 1);
      toast({ title: t('event.documents.ajoute', 'Document ajouté à la page de l’événement') });
      queryClient.invalidateQueries({ queryKey: cle });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : t('common.error', 'Erreur'));
    } finally {
      setEnvoi(false);
    }
  };

  const retirer = async () => {
    if (aRetirer === null) return;
    setRetraitEnCours(true);
    const res = await evenementService.retirerDocument(evenementId, aRetirer);
    setRetraitEnCours(false);
    setARetirer(null);
    if (res.success) {
      queryClient.invalidateQueries({ queryKey: cle });
    } else {
      toast({ title: t('common.error', 'Erreur'), description: res.error, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('event.documents.gestionTitre', 'Documents PDF de l’événement')}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('event.documents.gestionAide', 'Programme complet, présentation… Ils s’affichent sur la page de l’événement, à télécharger.')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {documents.length > 0 && (
          <ul className="space-y-2">
            {documents.map(doc => (
              <li key={doc.id_media} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <span className="flex items-center gap-2 min-w-0" dir="auto">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate">{td(doc.titre)}</span>
                </span>
                <span className="flex gap-1 shrink-0">
                  <Button asChild size="icon" variant="ghost" aria-label={t('common.download', 'Télécharger')}>
                    <a href={getAssetUrl(doc.lien)} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" aria-hidden="true" /></a>
                  </Button>
                  <Button type="button" size="icon" variant="ghost" onClick={() => setARetirer(doc.id_media)} aria-label={t('event.documents.retirer', 'Retirer le document')}>
                    <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}

        {documents.length < MAX_DOCUMENTS ? (
          <div className="space-y-3 rounded-lg border border-dashed p-4">
            <div>
              <Label htmlFor="document-pdf">{t('event.documents.fichier', 'Fichier PDF')}</Label>
              <Input key={cleChamp} id="document-pdf" type="file" accept="application/pdf,.pdf" onChange={choisir} disabled={envoi} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="document-titre">{t('event.documents.titreChamp', 'Titre affiché')}</Label>
              <Input id="document-titre" value={titre} onChange={e => setTitre(e.target.value)} maxLength={150}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ajouter(); } }}
                placeholder={t('event.documents.titreExemple', 'ex. Programme complet')} disabled={envoi} className="mt-1" />
            </div>
            {erreur && <p className="text-sm text-destructive" role="alert">{erreur}</p>}
            {/* type="button" : la section est aussi dans le formulaire de l'événement, qu'elle ne doit pas envoyer */}
            <Button type="button" onClick={ajouter} disabled={!fichier || !titre.trim() || envoi}>
              <Upload className="h-4 w-4 me-2" aria-hidden="true" />
              {envoi ? t('event.documents.envoi', 'Envoi…') : t('event.documents.ajouter', 'Ajouter le document')}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('event.documents.max', '5 documents au plus : retirez-en un pour en ajouter un autre.')}
          </p>
        )}
      </CardContent>
      <ConfirmDialog
        open={aRetirer !== null}
        onOpenChange={(o) => { if (!o && !retraitEnCours) setARetirer(null); }}
        title={t('event.documents.retirerTitre', 'Retirer ce document ?')}
        description={t('event.documents.retirerAide', 'Il disparaît de la page de l’événement.')}
        confirmLabel={t('event.documents.retirer', 'Retirer le document')}
        cancelLabel={t('common.cancel', 'Annuler')}
        variant="destructive"
        loading={retraitEnCours}
        onConfirm={retirer}
      />
    </Card>
  );
};

export default DocumentsEvenementGestion;
