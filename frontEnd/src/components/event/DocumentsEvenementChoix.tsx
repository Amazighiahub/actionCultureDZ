/**
 * DocumentsEvenementChoix — à la création d'un événement : l'organisateur choisit ses PDF
 * (programme complet, présentation…) ; ils sont envoyés juste après l'enregistrement de
 * l'événement (envoyerDocumentsEvenement), un document devant être rattaché à un événement existant.
 * En modification, le formulaire affiche DocumentsEvenementGestion (envoi immédiat).
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { evenementService } from '@/services/evenement.service';
import { uploadService } from '@/services/upload.service';

export interface DocumentChoisi {
  fichier: File;
  titre: string;
}

const PDF_MAX = 50 * 1024 * 1024;
const MAX_DOCUMENTS = 5;

/** Envoie les PDF choisis ; renvoie le nombre de documents qui n'ont pas pu être ajoutés */
export async function envoyerDocumentsEvenement(idEvenement: number, documents: DocumentChoisi[]): Promise<number> {
  let echecs = 0;
  for (const doc of documents) {
    try {
      const envoye = await uploadService.uploadDocument(doc.fichier);
      const ajoute = envoye.success && envoye.data?.url
        ? await evenementService.ajouterDocument(idEvenement, envoye.data.url, doc.titre.trim())
        : null;
      if (!ajoute?.success) echecs++;
    } catch {
      echecs++;
    }
  }
  return echecs;
}

const DocumentsEvenementChoix: React.FC<{
  documents: DocumentChoisi[];
  onChange: (documents: DocumentChoisi[]) => void;
}> = ({ documents, onChange }) => {
  const { t } = useTranslation();
  const [erreur, setErreur] = useState<string | null>(null);
  const [cleChamp, setCleChamp] = useState(0);

  const choisir = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    setCleChamp(c => c + 1);
    if (!fichier) return;
    if (fichier.type !== 'application/pdf') {
      setErreur(t('pro.participants.messages.pdfSeulement', 'Choisissez un fichier PDF.'));
      return;
    }
    if (fichier.size > PDF_MAX) {
      setErreur(t('pro.participants.messages.pdfTropGros', 'Le PDF est trop lourd (50 Mo au plus).'));
      return;
    }
    setErreur(null);
    // Titre proposé à partir du nom du fichier, modifiable
    onChange([...documents, { fichier, titre: fichier.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim() }]);
  };

  const changerTitre = (index: number, titre: string) =>
    onChange(documents.map((d, i) => (i === index ? { ...d, titre } : d)));

  return (
    <div className="space-y-3">
      {documents.map((doc, index) => (
        <div key={`${doc.fichier.name}-${index}`} className="flex items-end gap-2 rounded-lg border p-3">
          <FileText className="h-5 w-5 mb-2 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <Label htmlFor={`document-titre-${index}`} className="text-xs text-muted-foreground truncate block">
              {doc.fichier.name}
            </Label>
            <Input id={`document-titre-${index}`} value={doc.titre} maxLength={150} className="mt-1"
              onChange={e => changerTitre(index, e.target.value)}
              placeholder={t('event.documents.titreExemple', 'ex. Programme complet')}
              aria-label={t('event.documents.titreChamp', 'Titre affiché')} />
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={() => onChange(documents.filter((_, i) => i !== index))}
            aria-label={t('event.documents.retirer', 'Retirer le document')}>
            <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
          </Button>
        </div>
      ))}

      {documents.length < MAX_DOCUMENTS && (
        <div>
          <input key={cleChamp} type="file" id="documents-evenement" accept="application/pdf,.pdf" className="hidden" onChange={choisir} />
          <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('documents-evenement')?.click()}>
            <Plus className="h-4 w-4 me-2" aria-hidden="true" />
            {t('event.documents.choisir', 'Ajouter un PDF')}
          </Button>
        </div>
      )}
      {erreur && <p className="text-sm text-destructive" role="alert">{erreur}</p>}
    </div>
  );
};

export default DocumentsEvenementChoix;
