/**
 * « Site web et réseaux sociaux » (onglet Mon portfolio des professionnels, 2026-11-23).
 * Avant : dans « Mon profil », enregistré avec les informations personnelles. Séparé sur le conseil
 * d'une écrivaine : le profil s'arrête à la biographie, le portfolio réunit presse, réseaux et œuvres.
 * N'envoie que site_web et reseaux_sociaux : le serveur ne touche pas aux autres champs.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { httpClient } from '@/services/httpClient';
import { messageErreurServeur } from '@/utils/erreurServeur';
import { lienWebValide } from '@/utils/validationChamps';
import SocialLinks, { SOCIAL_NETWORKS, isValidSocialUrl, parseSocialLinks, type SocialLinksValue } from '@/components/shared/SocialLinks';

export default function SiteEtReseauxCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user: compte, refreshUser } = useAuth();
  // Champs des professionnels, absents du type commun du compte
  const user = compte as { site_web?: string | null; reseaux_sociaux?: SocialLinksValue } | null;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [siteWeb, setSiteWeb] = useState('');
  const [reseaux, setReseaux] = useState<Record<string, string>>({});
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);

  const commencer = () => {
    setSiteWeb(user?.site_web || '');
    setReseaux(parseSocialLinks(user?.reseaux_sociaux));
    setErreurs({}); setErreurEnvoi(null);
    setEditing(true);
  };

  // Même vérification que le serveur, avant l'envoi
  const valider = (): boolean => {
    const e: Record<string, string> = {};
    if (siteWeb.trim() && !lienWebValide(siteWeb)) {
      e.site_web = t('service.errors.urlInvalid', 'URL du site web invalide (doit commencer par http:// ou https://)');
    }
    for (const n of SOCIAL_NETWORKS) {
      if (!isValidSocialUrl(n.key, reseaux[n.key] || '')) {
        e[n.key] = t('profile.socialInvalid', 'Lien {{network}} invalide (ex. : {{example}})', { network: n.label, example: n.placeholder });
      }
    }
    setErreurs(e);
    return Object.keys(e).length === 0;
  };

  const enregistrer = async () => {
    if (!valider()) return;
    setSaving(true); setErreurEnvoi(null);
    try {
      const res = await httpClient.put('/users/profile', { site_web: siteWeb.trim(), reseaux_sociaux: reseaux });
      if (!res.success) { setErreurEnvoi(messageErreurServeur(res, t('dashboarduser.updateFailed', 'Erreur lors de la mise à jour'))); return; }
      toast({ title: t('dashboarduser.profileUpdated', 'Profil mis à jour') });
      setEditing(false);
      await refreshUser();
    } catch (err) {
      setErreurEnvoi(messageErreurServeur(err, t('dashboarduser.updateFailed', 'Erreur lors de la mise à jour')));
    } finally {
      setSaving(false);
    }
  };

  const aDesLiens = !!user?.site_web || Object.keys(parseSocialLinks(user?.reseaux_sociaux)).length > 0;

  return (
    <section className="mt-8 pt-6 border-t" aria-labelledby="portfolio-reseaux-titre">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="portfolio-reseaux-titre" className="text-lg font-semibold">{t('profile.socialTitle', 'Site web et réseaux sociaux')}</h3>
        {!editing && (
          <Button variant="outline" size="sm" onClick={commencer}>
            <Pencil className="h-4 w-4 me-2" aria-hidden="true" />
            {t('profile.modifierLiens', 'Modifier mes liens')}
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-4">{t('profile.socialHint', 'Ces liens apparaissent sur votre fiche publique (événements que vous organisez, profil).')}</p>
      {editing ? (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            {[{ key: 'site_web', label: t('common.website', 'Site web'), placeholder: 'https://…' }, ...SOCIAL_NETWORKS].map((champ) => {
              const valeur = champ.key === 'site_web' ? siteWeb : reseaux[champ.key] || '';
              const erreur = erreurs[champ.key];
              return (
                <div key={champ.key}>
                  <label htmlFor={`profil-lien-${champ.key}`} className="block text-sm font-medium mb-2">{champ.label}</label>
                  <input id={`profil-lien-${champ.key}`} type="url" inputMode="url" autoComplete="url" dir="ltr"
                    className="w-full p-3 border rounded-lg" placeholder={champ.placeholder} value={valeur}
                    aria-invalid={!!erreur} aria-describedby={erreur ? `profil-lien-${champ.key}-erreur` : undefined}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (champ.key === 'site_web') setSiteWeb(v); else setReseaux((r) => ({ ...r, [champ.key]: v }));
                    }} />
                  {erreur && <p id={`profil-lien-${champ.key}-erreur`} role="alert" className="text-sm text-destructive mt-1">{erreur}</p>}
                </div>
              );
            })}
          </div>
          {erreurEnvoi && <Alert variant="destructive" className="mt-4" role="alert"><AlertDescription>{erreurEnvoi}</AlertDescription></Alert>}
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>{t('common.cancel', 'Annuler')}</Button>
            <Button onClick={enregistrer} disabled={saving}>
              {saving && <RefreshCw className="h-4 w-4 me-2 animate-spin" aria-hidden="true" />}
              {t('common.save', 'Enregistrer')}
            </Button>
          </div>
        </>
      ) : aDesLiens
        ? <SocialLinks links={user?.reseaux_sociaux} website={user?.site_web} />
        : <p className="text-sm text-muted-foreground">{t('common.notProvided', 'Non renseigné')}</p>}
    </section>
  );
}
