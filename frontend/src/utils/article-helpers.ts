// utils/article-helpers.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Article, ArticleScientifique } from '@/types/models/oeuvres-specialisees.types';

// Type union discriminé pour les articles
export type ArticleData = 
  | { type: 'article'; data: Article }
  | { type: 'article_scientifique'; data: ArticleScientifique }
  | { type: 'none'; data: null };

// Helper pour créer le bon type d'article
export function getArticleData(
  oeuvre: any,
  isScientific: boolean
): ArticleData {
  if (isScientific && oeuvre?.ArticleScientifique) {
    return { type: 'article_scientifique', data: oeuvre.ArticleScientifique };
  } else if (!isScientific && oeuvre?.Article) {
    return { type: 'article', data: oeuvre.Article };
  }
  return { type: 'none', data: null };
}

// Helpers pour accéder aux propriétés communes et spécifiques
export const articleHelpers = {
  // Propriétés communes
  getResume: (articleData: ArticleData): string | undefined => {
    switch (articleData.type) {
      case 'article':
        return articleData.data.resume;
      case 'article_scientifique':
        return articleData.data.resume;
      default:
        return undefined;
    }
  },

  // Propriétés spécifiques aux articles normaux
  getAuteur: (articleData: ArticleData): string | undefined => {
    return articleData.type === 'article' ? articleData.data.auteur : undefined;
  },

  getSousTitre: (articleData: ArticleData): string | undefined => {
    return articleData.type === 'article' ? articleData.data.sous_titre : undefined;
  },

  getSource: (articleData: ArticleData): string | undefined => {
    return articleData.type === 'article' ? articleData.data.source : undefined;
  },

  isFactChecked: (articleData: ArticleData): boolean => {
    return articleData.type === 'article' ? articleData.data.fact_checked : false;
  },

  // Propriétés spécifiques aux articles scientifiques
  getJournal: (articleData: ArticleData): string | undefined => {
    return articleData.type === 'article_scientifique' ? articleData.data.journal : undefined;
  },

  isPeerReviewed: (articleData: ArticleData): boolean => {
    return articleData.type === 'article_scientifique' ? articleData.data.peer_reviewed : false;
  },

  isOpenAccess: (articleData: ArticleData): boolean => {
    return articleData.type === 'article_scientifique' ? articleData.data.open_access : false;
  },

  getDoi: (articleData: ArticleData): string | undefined => {
    return articleData.type === 'article_scientifique' ? articleData.data.doi : undefined;
  },

  getVolume: (articleData: ArticleData): string | undefined => {
    return articleData.type === 'article_scientifique' ? articleData.data.volume : undefined;
  },

  getNumero: (articleData: ArticleData): string | undefined => {
    return articleData.type === 'article_scientifique' ? articleData.data.numero : undefined;
  },

  getPages: (articleData: ArticleData): string | undefined => {
    return articleData.type === 'article_scientifique' ? articleData.data.pages : undefined;
  },

  getIssn: (articleData: ArticleData): string | undefined => {
    return articleData.type === 'article_scientifique' ? articleData.data.issn : undefined;
  },

  getImpactFactor: (articleData: ArticleData): number | undefined => {
    return articleData.type === 'article_scientifique' ? articleData.data.impact_factor : undefined;
  },

  getCitationApa: (articleData: ArticleData): string | undefined => {
    return articleData.type === 'article_scientifique' ? articleData.data.citation_apa : undefined;
  },

  // Helpers supplémentaires pour les champs de dates
  getDatePublication: (articleData: ArticleData): string | undefined => {
    switch (articleData.type) {
      case 'article':
        return articleData.data.date_publication;
      case 'article_scientifique':
        return articleData.data.date_publication;
      default:
        return undefined;
    }
  },

  // Helper pour obtenir toutes les métadonnées bibliographiques
  getBibliographicData: (articleData: ArticleData) => {
    if (articleData.type !== 'article_scientifique') return null;
    
    const data = articleData.data;
    return {
      journal: data.journal,
      doi: data.doi,
      pages: data.pages,
      volume: data.volume,
      numero: data.numero,
      issn: data.issn,
      impactFactor: data.impact_factor,
      peerReviewed: data.peer_reviewed,
      openAccess: data.open_access,
      citationApa: data.citation_apa,
      datePublication: data.date_publication,
      dateAcceptation: data.date_acceptation,
      dateSoumission: data.date_soumission
    };
  },

  // Helper pour obtenir l'URL source
  getSourceUrl: (articleData: ArticleData): string | undefined => {
    if (articleData.type === 'article') {
      return articleData.data.url_source;
    }
    return undefined;
  },

  // Helper pour vérifier si l'article a du contenu
  hasContent: (articleData: ArticleData): boolean => {
    if (articleData.type === 'article') {
      return Boolean(articleData.data.contenu_complet || articleData.data.resume);
    }
    return articleData.type === 'article_scientifique' && Boolean(articleData.data.resume);
  }
};