/**
 * FicheIntervenantDialog — fiche complète d'un intervenant (photo, titre, organisme, biographie,
 * dates de vie). Sert à modifier une fiche existante, ou à préparer une nouvelle fiche (mode
 * « creation », ex. nouvelle personnalité d'un site patrimonial) : les données sont alors rendues
 * à l'appelant, qui les enregistre.
 * Un professionnel ne peut modifier que les intervenants qu'il a ajoutés (présents uniquement dans
 * ses événements ou rattachés par lui à des sites, sans compte sur le site) : le serveur le
 * vérifie et le dit (peut_modifier).
 */
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MultiLangInput from '@/components/MultiLangInput';
import { Loader2, Upload, Info } from 'lucide-react';
import { httpClient } from '@/services/httpClient';
import { uploadService } from '@/services/upload.service';
import { texteLangue } from '@/utils/programmeIntervenants';

type Multilingue = Record<string, string | undefined>;

interface Fiche {
  id_intervenant: number;
  prenom?: Multilingue | string | null;
  nom?: Multilingue | string | null;
  biographie?: Multilingue | string | null;
  titre_professionnel?: string | null;
  organisation?: string | null;
  site_web?: string | null;
  photo_url?: string | null;
  date_naissance?: string | null;
  lieu_naissance?: string | null;
  date_deces?: string | null;
  lieu_deces?: string | null;
  wikipedia_url?: string | null;
  peut_modifier: boolean;
  raison?: 'compte' | 'autre_organisateur' | null;
}

/** Données de la fiche, au format attendu par le serveur */
export interface DonneesFiche {
  prenom: { fr: string };
  nom: { fr: string };
  biographie: Multilingue;
  titre_professionnel: string | null;
  organisation: string | null;
  site_web: string | null;
  photo_url: string | null;
  date_naissance: string | null;
  lieu_naissance: string | null;
  date_deces: string | null;
  lieu_deces: string | null;
  wikipedia_url: string | null;
}

interface Props {
  idIntervenant: number | null;
  /** Nouvelle fiche (pré-remplie avec le nom saisi) : rien n'est enregistré ici, voir onCree */
  creation?: { prenom?: string; nom?: string } | null;
  onCree?: (donnees: DonneesFiche) => void;
  /** Titre de la fenêtre (par défaut : « Fiche de l'intervenant ») */
  titre?: string;
  onClose: () => void;
  /** Appelé après l'enregistrement avec le prénom et le nom (français) mis à jour */
  onSaved?: (maj: { prenom: string; nom: string }) => void;
  /** Texte sous le titre (par défaut : page de l'événement) */
  description?: string;
}

const enObjet = (v: Fiche['biographie']): Multilingue =>
  !v ? {} : typeof v === 'string' ? { fr: v } : v;

const FicheIntervenantDialog: React.FC<Props> = ({ idIntervenant, creation, onCree, titre, onClose, onSaved, description }) => {
  const { t } = useTranslation();
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [photoEnvoi, setPhotoEnvoi] = useState(false);
  const fichierRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    prenom: '', nom: '', titre_professionnel: '', organisation: '', site_web: '', photo_url: '',
    date_naissance: '', lieu_naissance: '', date_deces: '', lieu_deces: '', wikipedia_url: '',
    biographie: {} as Multilingue
  });

  // Nouvelle fiche : formulaire vide (nom déjà saisi repris), modifiable
  useEffect(() => {
    if (!creation) return;
    setErreur(null);
    setFiche({ id_intervenant: 0, peut_modifier: true });
    setForm({
      prenom: creation.prenom || '', nom: creation.nom || '', titre_professionnel: '', organisation: '', site_web: '', photo_url: '',
      date_naissance: '', lieu_naissance: '', date_deces: '', lieu_deces: '', wikipedia_url: '', biographie: {}
    });
  }, [creation]);

  useEffect(() => {
    if (!idIntervenant) return;
    let actif = true;
    setChargement(true); setErreur(null); setFiche(null);
    httpClient.get<Fiche>(`/intervenants/${idIntervenant}/edition`)
      .then(res => {
        if (!actif) return;
        if (!res.success || !res.data) { setErreur(res.error || t('common.error', 'Erreur')); return; }
        const f = res.data;
        setFiche(f);
        setForm({
          prenom: texteLangue(f.prenom), nom: texteLangue(f.nom),
          titre_professionnel: f.titre_professionnel || '', organisation: f.organisation || '',
          site_web: f.site_web || '', photo_url: f.photo_url || '',
          date_naissance: f.date_naissance || '', lieu_naissance: f.lieu_naissance || '',
          date_deces: f.date_deces || '', lieu_deces: f.lieu_deces || '', wikipedia_url: f.wikipedia_url || '',
          biographie: enObjet(f.biographie)
        });
      })
      .catch(() => actif && setErreur(t('common.error', 'Erreur')))
      .finally(() => actif && setChargement(false));
    return () => { actif = false; };
    // Recharger seulement quand l'intervenant change (pas à chaque changement de langue)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idIntervenant]);

  const envoyerPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setPhotoEnvoi(true); setErreur(null);
    try {
      const res = await uploadService.uploadImage(fichier);
      if (res.success && res.data?.url) setForm(f => ({ ...f, photo_url: res.data!.url }));
      else setErreur(res.error || t('upload.error', 'Échec de l’envoi de la photo'));
    } finally {
      setPhotoEnvoi(false);
      if (fichierRef.current) fichierRef.current.value = '';
    }
  };

  const enregistrer = async () => {
    if (!idIntervenant && !creation) return;
    if (!form.nom.trim() && !form.prenom.trim()) {
      setErreur(t('programme.form.errors.intervenantNameRequired', 'Indiquez le nom de chaque intervenant (ou supprimez la ligne vide)'));
      return;
    }
    if (creation && !form.nom.trim()) {
      setErreur(t('personnalites.nomRequis', 'Le nom est requis'));
      return;
    }
    const donnees: DonneesFiche = {
        prenom: { fr: form.prenom.trim() },
        nom: { fr: form.nom.trim() },
        biographie: form.biographie,
        titre_professionnel: form.titre_professionnel.trim() || null,
        organisation: form.organisation.trim() || null,
        site_web: form.site_web.trim() || null,
        photo_url: form.photo_url || null,
        // Personnalités (patrimoine) : dates et lieux de vie ; vides → effacés
        date_naissance: form.date_naissance || null,
        lieu_naissance: form.lieu_naissance.trim() || null,
        date_deces: form.date_deces || null,
        lieu_deces: form.lieu_deces.trim() || null,
        wikipedia_url: form.wikipedia_url.trim() || null
    };
    if (creation) {
      onCree?.(donnees);
      onClose();
      return;
    }
    setEnvoi(true); setErreur(null);
    try {
      const res = await httpClient.put(`/intervenants/${idIntervenant}`, donnees);
      if (!res.success) { setErreur(res.error || t('common.error', 'Erreur')); return; }
      onSaved?.({ prenom: form.prenom.trim(), nom: form.nom.trim() });
      onClose();
    } finally {
      setEnvoi(false);
    }
  };

  const lectureSeule = !!fiche && !fiche.peut_modifier;

  return (
    <Dialog open={idIntervenant !== null || !!creation} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titre || t('programme.speakerCard.title', 'Fiche de l’intervenant')}</DialogTitle>
          <DialogDescription>
            {description || t('programme.speakerCard.description', 'Présentation affichée sur la page de l’événement.')}
          </DialogDescription>
        </DialogHeader>

        {chargement && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /></div>}

        {lectureSeule && (
          <div role="status" className="flex items-start gap-2 p-3 rounded-lg border bg-muted/50 text-sm">
            <Info className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              {fiche?.raison === 'compte'
                ? t('programme.speakerCard.hasAccount', 'Cet intervenant a son propre compte sur Tala DZ : il gère lui-même son profil.')
                : t('programme.speakerCard.shared', 'Cet intervenant figure aussi dans l’événement d’un autre organisateur : seule l’administration peut modifier sa fiche.')}
              {' '}{t('programme.speakerCard.shortBioHint', 'Vous pouvez toujours renseigner la « biographie courte » de votre activité.')}
            </span>
          </div>
        )}

        {fiche && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <img
                src={form.photo_url || '/images/default-avatar.svg'}
                alt=""
                className="h-16 w-16 rounded-full object-cover border"
              />
              {!lectureSeule && (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={() => fichierRef.current?.click()} disabled={photoEnvoi}>
                    {photoEnvoi ? <Loader2 className="h-4 w-4 me-2 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4 me-2" aria-hidden="true" />}
                    {t('programme.speakerCard.photo', 'Changer la photo')}
                  </Button>
                  <input ref={fichierRef} type="file" accept="image/*" className="hidden" onChange={envoyerPhoto} aria-label={t('programme.speakerCard.photo', 'Changer la photo')} />
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fiche-prenom">{t('programme.form.participants.firstName', 'Prénom')}</Label>
                <Input id="fiche-prenom" value={form.prenom} disabled={lectureSeule} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fiche-nom">{t('programme.form.participants.lastName', 'Nom (ou nom de l’organisme)')}</Label>
                <Input id="fiche-nom" value={form.nom} disabled={lectureSeule} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fiche-titre">{t('programme.speakerCard.jobTitle', 'Titre ou métier')}</Label>
                <Input id="fiche-titre" value={form.titre_professionnel} disabled={lectureSeule} placeholder={t('programme.speakerCard.jobTitlePlaceholder', 'Ex. : potière, artiste peintre')} onChange={e => setForm(f => ({ ...f, titre_professionnel: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fiche-organisation">{t('programme.speakerCard.organisation', 'Organisme')}</Label>
                <Input id="fiche-organisation" value={form.organisation} disabled={lectureSeule} onChange={e => setForm(f => ({ ...f, organisation: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fiche-site">{t('programme.speakerCard.website', 'Site web')}</Label>
              <Input id="fiche-site" type="url" value={form.site_web} disabled={lectureSeule} placeholder="https://" onChange={e => setForm(f => ({ ...f, site_web: e.target.value }))} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fiche-naissance">{t('personnalites.birthDate', 'Date de naissance')}</Label>
                <Input id="fiche-naissance" type="date" value={form.date_naissance} disabled={lectureSeule} onChange={e => setForm(f => ({ ...f, date_naissance: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fiche-lieu-naissance">{t('personnalites.birthPlace', 'Lieu de naissance')}</Label>
                <Input id="fiche-lieu-naissance" value={form.lieu_naissance} disabled={lectureSeule} onChange={e => setForm(f => ({ ...f, lieu_naissance: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fiche-deces">{t('personnalites.deathDate', 'Date de décès')}</Label>
                <Input id="fiche-deces" type="date" value={form.date_deces} disabled={lectureSeule} onChange={e => setForm(f => ({ ...f, date_deces: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fiche-lieu-deces">{t('personnalites.deathPlace', 'Lieu de décès')}</Label>
                <Input id="fiche-lieu-deces" value={form.lieu_deces} disabled={lectureSeule} onChange={e => setForm(f => ({ ...f, lieu_deces: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fiche-wikipedia">{t('personnalites.wikipedia', 'Page Wikipédia')}</Label>
              <Input id="fiche-wikipedia" type="url" value={form.wikipedia_url} disabled={lectureSeule} placeholder="https://fr.wikipedia.org/wiki/…" onChange={e => setForm(f => ({ ...f, wikipedia_url: e.target.value }))} />
            </div>

            <MultiLangInput
              name="fiche-biographie"
              label={t('programme.speakerCard.biography', 'Biographie')}
              value={form.biographie}
              onChange={(v) => setForm(f => ({ ...f, biographie: v as Multilingue }))}
              type="textarea"
              rows={5}
              disabled={lectureSeule}
            />
          </div>
        )}

        {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {lectureSeule ? t('common.close', 'Fermer') : t('common.cancel', 'Annuler')}
          </Button>
          {fiche && !lectureSeule && (
            <Button type="button" onClick={enregistrer} disabled={envoi || photoEnvoi}>
              {envoi && <Loader2 className="h-4 w-4 me-2 animate-spin" aria-hidden="true" />}
              {creation ? t('common.continue', 'Continuer') : t('common.save', 'Enregistrer')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FicheIntervenantDialog;
