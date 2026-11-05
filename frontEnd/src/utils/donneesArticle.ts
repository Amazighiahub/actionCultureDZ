/**
 * Données d'un article envoyées au serveur : les mêmes à la création et à la modification.
 */
import type {
  ContributeurOeuvre, EditeurOeuvre, IntervenantExistant, NouvelIntervenant,
} from '@/types/api/oeuvre-creation.types';

type Champs = Record<string, unknown>;

/**
 * Champs propres au type d'article. En modification, un champ vidé doit s'effacer (null) ;
 * à la création, il est simplement absent.
 */
export function detailsArticle(f: Champs, { modification = false } = {}): Record<string, Champs> {
  const vide = modification ? null : undefined;
  const v = (cle: string) => f[cle] || vide;
  if (f.type === 'article_scientifique') {
    return {
      article_scientifique: {
        journal: v('journal'), doi: v('doi'), volume: v('volume'), numero: v('numero'), pages: v('pages'),
        peer_reviewed: !!f.peer_reviewed,
        ...(modification ? { resume: v('resume'), url_hal: v('url_source') } : {}),
      },
    };
  }
  return { article: { auteur: v('auteur'), source: v('source'), resume: v('resume'), url_source: v('url_source') } };
}

interface Contributeurs {
  existants?: IntervenantExistant[];
  nouveaux?: NouvelIntervenant[];
  contributeurs?: ContributeurOeuvre[];
}

/** Intervenants et éditeurs saisis dans l'onglet Métadonnées */
export function liensArticle(contribs?: Contributeurs, editeurs?: Array<EditeurOeuvre | number>) {
  return {
    utilisateurs_inscrits: contribs?.contributeurs?.map((c) => ({
      id_user: c.id_user,
      id_type_user: c.id_type_user,
      personnage: c.personnage || c.description_role || '',
    })) || [],
    intervenants_non_inscrits: contribs?.existants?.map((c) => ({
      id_intervenant: c.id_intervenant,
      id_type_user: c.id_type_user,
      personnage: c.personnage || '',
    })) || [],
    nouveaux_intervenants: contribs?.nouveaux?.map((c) => ({
      nom: c.nom,
      prenom: c.prenom,
      role: c.personnage || 'Contributeur',
      id_type_user: c.id_type_user,
    })) || [],
    editeurs: editeurs?.map((e) => (typeof e === 'object' ? e : { id_editeur: e })) || [],
  };
}

/** Nom d'un mot-clé : chargé pour modification, il arrive avec toutes ses langues */
export function nomDuTag(tag: unknown): string {
  if (typeof tag === 'object' && tag !== null && 'nom' in tag) {
    const nom = (tag as { nom: unknown }).nom;
    if (typeof nom === 'string') return nom;
    if (nom && typeof nom === 'object') {
      const n = nom as Record<string, string>;
      return n.fr || n.ar || n.en || Object.values(n)[0] || '';
    }
    return '';
  }
  return String(tag ?? '');
}
