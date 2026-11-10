import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TypeOeuvre, Materiau, Technique } from '@/types/models/references.types';
import type { ExtendedMetadata, FormData, PisteAlbum } from './types';
import { TECHNIQUES_ART, SUPPORTS_ART, FORMATS_MUSIQUE, INSTRUMENTS_MUSIQUE } from './types';

/**
 * Champ numérique vidé → null (envoyé au serveur, qui efface la valeur). Avant : undefined, absent de
 * l'envoi — « Modifié » s'affichait mais l'ancien nombre restait.
 */
const nombreOuVide = (valeur: string, entier = false): number | null => {
  if (valeur.trim() === '') return null;
  const n = entier ? parseInt(valeur, 10) : parseFloat(valeur);
  return Number.isNaN(n) ? null : n;
};

/* eslint-disable @typescript-eslint/no-explicit-any */

// Composant champs Art avec sélecteurs
const ArtFields: React.FC<{ formData: FormData; handleInputChange: (field: string, value: any) => void; t: any }> = ({ formData, handleInputChange, t }) => {
  const [customTechnique, setCustomTechnique] = React.useState(false);
  const [customSupport, setCustomSupport] = React.useState(false);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
      <div className="space-y-2">
        <Label htmlFor="technique_art">{t("ajouteroeuvre.technique_artistique")}</Label>
        {customTechnique ? (
          <div className="flex gap-2">
            <Input
              id="technique_art"
              placeholder={t("ajouteroeuvre.preciserTechnique", "Précisez la technique...")}
              maxLength={200}
              value={formData.technique_art || ''}
              onChange={(e) => handleInputChange('technique_art', e.target.value)} />
            <Button type="button" variant="outline" size="sm" onClick={() => { setCustomTechnique(false); handleInputChange('technique_art', ''); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <select
            id="technique_art"
            className="w-full p-3 border rounded-lg hover:border-primary focus:border-primary"
            value={formData.technique_art || ''}
            onChange={(e) => {
              if (e.target.value === '__autre__') { setCustomTechnique(true); handleInputChange('technique_art', ''); }
              else handleInputChange('technique_art', e.target.value);
            }}>
            <option value="">{t("ajouteroeuvre.choisirTechnique", "-- Choisir une technique --")}</option>
            {TECHNIQUES_ART.map(tech => <option key={tech} value={tech}>{tech}</option>)}
            <option value="__autre__">{t("common.other", "Autre...")}</option>
          </select>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="dimensions_art">{t("ajouteroeuvre.dimensions_1")}</Label>
        <Input
          id="dimensions_art"
          placeholder={t("ajouteroeuvre.placeholder_100x80", "100x80 cm")}
          maxLength={50}
          value={formData.dimensions_art || ''}
          onChange={(e) => handleInputChange('dimensions_art', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="support">{t("ajouteroeuvre.support")}</Label>
        {customSupport ? (
          <div className="flex gap-2">
            <Input
              id="support"
              placeholder={t("ajouteroeuvre.preciserSupport", "Précisez le support...")}
              maxLength={200}
              value={formData.support || ''}
              onChange={(e) => handleInputChange('support', e.target.value)} />
            <Button type="button" variant="outline" size="sm" onClick={() => { setCustomSupport(false); handleInputChange('support', ''); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <select
            id="support"
            className="w-full p-3 border rounded-lg hover:border-primary focus:border-primary"
            value={formData.support || ''}
            onChange={(e) => {
              if (e.target.value === '__autre__') { setCustomSupport(true); handleInputChange('support', ''); }
              else handleInputChange('support', e.target.value);
            }}>
            <option value="">{t("ajouteroeuvre.choisirSupport", "-- Choisir un support --")}</option>
            {SUPPORTS_ART.map(sup => <option key={sup} value={sup}>{sup}</option>)}
            <option value="__autre__">{t("common.other", "Autre...")}</option>
          </select>
        )}
      </div>
    </div>
  );
};

// Champs Musique : format, titres, liens d'écoute, instruments
const MusiqueFields: React.FC<{
  formData: FormData;
  fieldErrors: Record<string, string>;
  handleInputChange: (field: keyof FormData, value: FormData[keyof FormData] | null) => void;
  t: any;
}> = ({ formData, fieldErrors, handleInputChange, t }) => {
  const [autreInstrument, setAutreInstrument] = React.useState('');
  const pistes = formData.pistes || [];
  const liens = formData.liens_ecoute || [];
  const instruments = formData.instruments || [];

  const changerPiste = (index: number, champ: keyof PisteAlbum, valeur: string) =>
    handleInputChange('pistes', pistes.map((p, i) => (i === index ? { ...p, [champ]: valeur } : p)));
  const basculerInstrument = (code: string) =>
    handleInputChange('instruments', instruments.includes(code) ? instruments.filter((i) => i !== code) : [...instruments, code]);
  const ajouterAutreInstrument = () => {
    const nom = autreInstrument.trim();
    if (nom && !instruments.includes(nom) && instruments.length < 20) handleInputChange('instruments', [...instruments, nom]);
    setAutreInstrument('');
  };
  const libelleInstrument = (code: string) => t(`instruments.${code}`, { defaultValue: code });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-2">
          <Label htmlFor="format_album">{t('musique.format', 'Format')}</Label>
          <select
            id="format_album"
            className="w-full p-3 border rounded-lg hover:border-primary focus:border-primary"
            value={formData.format_album || ''}
            onChange={(e) => handleInputChange('format_album', e.target.value || null)}>
            <option value="">{t('musique.choisirFormat', '-- Choisir --')}</option>
            {FORMATS_MUSIQUE.map((f) => <option key={f} value={f}>{t(`musique.formats.${f}`)}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="duree_album">{t("ajouteroeuvre.dure_totale")}</Label>
          <Input
            id="duree_album"
            placeholder={t("ajouteroeuvre.placeholder_4530")}
            maxLength={10}
            value={formData.duree_album || ''}
            onChange={(e) => handleInputChange('duree_album', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="label">{t("ajouteroeuvre.label_maison_production")}</Label>
          <Input
            id="label"
            placeholder={t("ajouteroeuvre.placeholder_nom_label")}
            maxLength={100}
            value={formData.label || ''}
            onChange={(e) => handleInputChange('label', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nb_pistes">{t("ajouteroeuvre.nb_pistes", "Nombre de pistes")}</Label>
          <Input
            id="nb_pistes"
            type="number"
            min={1}
            max={500}
            placeholder={t("ajouteroeuvre.placeholder_nb_pistes", "Ex: 12")}
            value={formData.nb_pistes || ''}
            aria-invalid={!!fieldErrors.nb_pistes || undefined}
            aria-describedby={fieldErrors.nb_pistes ? 'nb_pistes-error' : undefined}
            onChange={(e) => handleInputChange('nb_pistes', nombreOuVide(e.target.value, true))} />
          {fieldErrors.nb_pistes && <p id="nb_pistes-error" role="alert" className="text-sm text-destructive">{fieldErrors.nb_pistes}</p>}
        </div>
      </div>

      {/* Titres */}
      <div className="space-y-3">
        <div>
          <Label>{t('musique.pistes', 'Liste des titres')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
          <p className="text-xs text-muted-foreground mt-1">{t('musique.pistesAide', 'Le nom de chaque morceau, sa durée et son compositeur si vous les connaissez.')}</p>
        </div>
        {pistes.map((piste, index) => (
          <div key={index} className="grid grid-cols-[2rem_1fr_6rem_auto] md:grid-cols-[2rem_2fr_6rem_1.5fr_auto] gap-2 items-center">
            <span className="text-sm text-muted-foreground text-center">{index + 1}</span>
            <Input aria-label={t('musique.titreMorceau', 'Titre du morceau')} placeholder={t('musique.titreMorceau', 'Titre du morceau')}
              maxLength={200} value={piste.titre} onChange={(e) => changerPiste(index, 'titre', e.target.value)} />
            <Input aria-label={t('musique.dureeMorceau', 'Durée')} placeholder="3:45" maxLength={10}
              value={piste.duree || ''} onChange={(e) => changerPiste(index, 'duree', e.target.value)} />
            <Input aria-label={t('musique.compositeurMorceau', 'Compositeur')} placeholder={t('musique.compositeurMorceau', 'Compositeur')}
              className="hidden md:block" maxLength={200} value={piste.compositeur || ''} onChange={(e) => changerPiste(index, 'compositeur', e.target.value)} />
            <Button type="button" variant="ghost" size="sm" aria-label={t('musique.retirer', 'Retirer')}
              onClick={() => handleInputChange('pistes', pistes.filter((_, i) => i !== index))}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {pistes.length < 100 && (
          <Button type="button" variant="outline" size="sm" onClick={() => handleInputChange('pistes', [...pistes, { titre: '' }])}>
            <Plus className="h-4 w-4 me-1" />{t('musique.ajouterPiste', 'Ajouter un titre')}
          </Button>
        )}
      </div>

      {/* Liens d'écoute */}
      <div className="space-y-3">
        <div>
          <Label>{t('musique.liens', "Liens d'écoute")} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
          <p className="text-xs text-muted-foreground mt-1">{t('musique.liensAide', 'YouTube, Spotify, Deezer, SoundCloud, Anghami… L’adresse doit commencer par https://')}</p>
        </div>
        {liens.map((lien, index) => (
          <div key={index} className="flex gap-2">
            <Input type="url" inputMode="url" autoComplete="url" maxLength={500} placeholder="https://"
              aria-label={t('musique.liens', "Liens d'écoute")} aria-invalid={!!fieldErrors.liens_ecoute || undefined}
              value={lien} onChange={(e) => handleInputChange('liens_ecoute', liens.map((l, i) => (i === index ? e.target.value : l)))} />
            <Button type="button" variant="ghost" size="sm" aria-label={t('musique.retirer', 'Retirer')}
              onClick={() => handleInputChange('liens_ecoute', liens.filter((_, i) => i !== index))}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {fieldErrors.liens_ecoute && <p id="liens_ecoute-error" role="alert" className="text-sm text-destructive">{fieldErrors.liens_ecoute}</p>}
        {liens.length < 10 && (
          <Button type="button" variant="outline" size="sm" onClick={() => handleInputChange('liens_ecoute', [...liens, ''])}>
            <Plus className="h-4 w-4 me-1" />{t('musique.ajouterLien', 'Ajouter un lien')}
          </Button>
        )}
      </div>

      {/* Instruments */}
      <div className="space-y-3">
        <div>
          <Label>{t('musique.instruments', 'Instruments')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
          <p className="text-xs text-muted-foreground mt-1">{t('musique.instrumentsAide', 'Cliquez sur les instruments joués, ou ajoutez-en un autre.')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {INSTRUMENTS_MUSIQUE.map((code) => (
            <Button key={code} type="button" size="sm" aria-pressed={instruments.includes(code)}
              variant={instruments.includes(code) ? 'default' : 'outline'} onClick={() => basculerInstrument(code)}>
              {libelleInstrument(code)}
            </Button>
          ))}
          {instruments.filter((i) => !(INSTRUMENTS_MUSIQUE as readonly string[]).includes(i)).map((nom) => (
            <Button key={nom} type="button" size="sm" variant="default" aria-pressed onClick={() => basculerInstrument(nom)}>
              {nom}<X className="h-3 w-3 ms-1" />
            </Button>
          ))}
        </div>
        <div className="flex gap-2 max-w-sm">
          <Input maxLength={50} placeholder={t('musique.autreInstrument', 'Autre instrument…')} value={autreInstrument}
            aria-label={t('musique.autreInstrument', 'Autre instrument…')}
            onChange={(e) => setAutreInstrument(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ajouterAutreInstrument(); } }} />
          <Button type="button" size="sm" variant="outline" disabled={!autreInstrument.trim()} onClick={ajouterAutreInstrument}
            aria-label={t('musique.ajouterInstrument', 'Ajouter cet instrument')}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Composant principal des champs spécifiques
interface OeuvreSpecificFieldsProps {
  metadata: ExtendedMetadata;
  formData: FormData;
  fieldErrors: Record<string, string>;
  handleInputChange: (field: keyof FormData, value: FormData[keyof FormData] | null) => void;
}

const OeuvreSpecificFields: React.FC<OeuvreSpecificFieldsProps> = ({
  metadata,
  formData,
  fieldErrors,
  handleInputChange
}) => {
  const { t } = useTranslation();

  if (!metadata.types_oeuvres || metadata.types_oeuvres.length === 0) return null;

  const typeOeuvre = metadata.types_oeuvres.find((type: TypeOeuvre) => type.id_type_oeuvre === formData.id_type_oeuvre);
  if (!typeOeuvre) return null;

  // Utiliser id_type_oeuvre (numérique) au lieu de nom_type (traduit selon la langue)
  const fieldsConfig: Record<number, React.ReactNode> = {
    1: /* Livre */
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-2">
          <Label htmlFor="isbn">{t("ajouteroeuvre.isbn")} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
          <Input
          id="isbn"
          placeholder="978-2-1234-5678-9"
          maxLength={17}
          autoComplete="off"
          value={formData.isbn || ''}
          aria-invalid={!!fieldErrors.isbn || undefined}
          aria-describedby={fieldErrors.isbn ? 'isbn-error' : 'isbn-helper'}
          onChange={(e) => handleInputChange('isbn', e.target.value)} />
          <p id="isbn-helper" className="text-xs text-muted-foreground">{t("ajouteroeuvre.isbnHelper", "Format : 978-2-1234-5678-9")}</p>
          {fieldErrors.isbn && <p id="isbn-error" role="alert" className="text-sm text-destructive">{fieldErrors.isbn}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="nb_pages">{t("ajouteroeuvre.nombre_pages")}</Label>
          <Input
          id="nb_pages"
          type="number"
          placeholder={t("ajouteroeuvre.placeholder_250")}
          value={formData.nb_pages || ''}
          onChange={(e) => handleInputChange('nb_pages', nombreOuVide(e.target.value, true))} />
        </div>
        {/* Les lecteurs le lisent avec « Lire un extrait » sur la page du livre */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="extrait">{t('ajouteroeuvre.extrait', 'Extrait du livre')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
          <Textarea
          id="extrait"
          dir="auto"
          rows={8}
          maxLength={20000}
          placeholder={t('ajouteroeuvre.extraitPlaceholder', 'Copiez ici quelques pages : le début du livre, un chapitre, un poème…')}
          value={formData.extrait || ''}
          aria-describedby="extrait-helper"
          onChange={(e) => handleInputChange('extrait', e.target.value)} />
          <p id="extrait-helper" className="text-xs text-muted-foreground">
            {t('ajouteroeuvre.extraitAide', 'Donnez envie de lire la suite. Ne mettez pas le livre entier.')} {(formData.extrait || '').length}/20000
          </p>
        </div>
      </div>,

    2: /* Film */
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-2">
          <Label htmlFor="duree_minutes">{t("ajouteroeuvre.dure_minutes")}</Label>
          <Input
          id="duree_minutes"
          type="number"
          placeholder={t("ajouteroeuvre.placeholder_120")}
          value={formData.duree_minutes || ''}
          onChange={(e) => handleInputChange('duree_minutes', nombreOuVide(e.target.value, true))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="realisateur">{t("ajouteroeuvre.ralisateur")}</Label>
          <Input
          id="realisateur"
          placeholder={t("ajouteroeuvre.placeholder_nom_ralisateur")}
          maxLength={200}
          autoComplete="name"
          value={formData.realisateur || ''}
          onChange={(e) => handleInputChange('realisateur', e.target.value)} />
        </div>
      </div>,

    3: /* Musique (album, EP, chanson, concert) */
    <MusiqueFields formData={formData} fieldErrors={fieldErrors} handleInputChange={handleInputChange} t={t} />,

    4: /* Article */
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-2">
            <Label htmlFor="auteur">{t("ajouteroeuvre.auteur")}</Label>
            <Input
            id="auteur"
            placeholder={t("ajouteroeuvre.placeholder_nom_lauteur")}
            maxLength={200}
            autoComplete="name"
            value={formData.auteur || ''}
            onChange={(e) => handleInputChange('auteur', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">{t("ajouteroeuvre.source_publication")}</Label>
            <Input
            id="source"
            placeholder={t("ajouteroeuvre.placeholder_watan_monde")}
            maxLength={300}
            value={formData.source || ''}
            onChange={(e) => handleInputChange('source', e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="resume_article">{t("ajouteroeuvre.rsum_larticle")}</Label>
          <Textarea
          id="resume_article"
          placeholder={t("ajouteroeuvre.placeholder_rsum_chapeau_larticle")}
          className="min-h-[100px]"
          maxLength={5000}
          value={formData.resume_article || ''}
          onChange={(e) => handleInputChange('resume_article', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="url_source">{t("ajouteroeuvre.url_larticle_optionnel")}</Label>
          <Input
          id="url_source"
          type="text"
          autoComplete="url"
          maxLength={2048}
          placeholder="https://..."
          value={formData.url_source || ''}
          aria-invalid={!!fieldErrors.url_source || undefined}
          aria-describedby={fieldErrors.url_source ? 'url_source-error' : 'url_source-helper'}
          onChange={(e) => handleInputChange('url_source', e.target.value)} />
          <p id="url_source-helper" className="text-xs text-muted-foreground">{t('common.urlHelper')}</p>
          {fieldErrors.url_source && <p id="url_source-error" role="alert" className="text-sm text-destructive">{fieldErrors.url_source}</p>}
        </div>
      </div>,

    5: /* Article Scientifique */
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-2">
            <Label htmlFor="journal">{t("ajouteroeuvre.journal_revue")}</Label>
            <Input
            id="journal"
            placeholder={t("ajouteroeuvre.placeholder_nom_journal_scientifique")}
            maxLength={300}
            value={formData.journal || ''}
            onChange={(e) => handleInputChange('journal', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doi">{t("ajouteroeuvre.doi")} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
            <Input
            id="doi"
            placeholder={t("ajouteroeuvre.placeholder_101234example")}
            maxLength={100}
            value={formData.doi || ''}
            onChange={(e) => handleInputChange('doi', e.target.value)} />
            <p className="text-xs text-muted-foreground">{t("ajouteroeuvre.doiHelper", "Format : 10.1234/example")}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="volume">{t("ajouteroeuvre.volume")}</Label>
            <Input
            id="volume"
            placeholder={t("ajouteroeuvre.placeholder_ex_12")}
            maxLength={20}
            value={formData.volume || ''}
            onChange={(e) => handleInputChange('volume', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="numero">{t("ajouteroeuvre.numro")}</Label>
            <Input
            id="numero"
            placeholder={t("ajouteroeuvre.placeholder_ex_3")}
            maxLength={20}
            value={formData.numero || ''}
            onChange={(e) => handleInputChange('numero', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pages">{t("ajouteroeuvre.pages")}</Label>
            <Input
            id="pages"
            placeholder={t("ajouteroeuvre.placeholder_123145")}
            maxLength={20}
            value={formData.pages || ''}
            onChange={(e) => handleInputChange('pages', e.target.value)} />
          </div>
          <div className="space-y-2 flex items-center">
            <Checkbox
            id="peer_reviewed"
            checked={formData.peer_reviewed || false}
            onCheckedChange={(checked) => handleInputChange('peer_reviewed', checked === true)} />
            <Label htmlFor="peer_reviewed" className="ms-2">{t("ajouteroeuvre.article_valu_par")}</Label>
          </div>
        </div>
      </div>,

    7: /* Artisanat */
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-2">
          <Label htmlFor="id_materiau">{t("ajouteroeuvre.matriau_principal")}</Label>
          <Select
          value={formData.id_materiau?.toString() || ''}
          onValueChange={(value) => handleInputChange('id_materiau', value ? parseInt(value) : undefined)}>
            <SelectTrigger id="id_materiau">
              <SelectValue placeholder={t("ajouteroeuvre.placeholder_slectionnez_matriau")} />
            </SelectTrigger>
            <SelectContent>
              {metadata.materiaux?.map((materiau: Materiau) =>
            <SelectItem key={materiau.id_materiau} value={materiau.id_materiau.toString()}>
                  {materiau.nom}
                </SelectItem>
            ) || <SelectItem value="0" disabled>{t("ajouteroeuvre.aucun_matriau_disponible")}</SelectItem>}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="id_technique">{t("ajouteroeuvre.technique_utilise")}</Label>
          <Select
          value={formData.id_technique?.toString() || ''}
          onValueChange={(value) => handleInputChange('id_technique', value ? parseInt(value) : undefined)}>
            <SelectTrigger id="id_technique">
              <SelectValue placeholder={t("ajouteroeuvre.placeholder_slectionnez_une_technique")} />
            </SelectTrigger>
            <SelectContent>
              {metadata.techniques?.map((technique: Technique) =>
            <SelectItem key={technique.id_technique} value={technique.id_technique.toString()}>
                  {technique.nom}
                </SelectItem>
            ) || <SelectItem value="0" disabled>{t("ajouteroeuvre.aucune_technique_disponible")}</SelectItem>}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dimensions">{t("ajouteroeuvre.dimensions_1")}</Label>
          <Input
          id="dimensions"
          placeholder={t("ajouteroeuvre.placeholder_30x20x15")}
          maxLength={50}
          value={formData.dimensions || ''}
          onChange={(e) => handleInputChange('dimensions', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="poids">{t("ajouteroeuvre.poids")}</Label>
          <Input
          id="poids"
          type="number"
          step="0.1"
          placeholder={t("ajouteroeuvre.placeholder_ex_1_5")}
          value={formData.poids || ''}
          onChange={(e) => handleInputChange('poids', nombreOuVide(e.target.value))} />
        </div>
      </div>,

    6: /* Œuvre d'Art */
    <ArtFields formData={formData} handleInputChange={handleInputChange} t={t} />
  };

  return fieldsConfig[typeOeuvre.id_type_oeuvre] || null;
};

export default OeuvreSpecificFields;
