/**
 * Conseils pour être bien trouvé sur Google, Bing et ChatGPT, adaptés à ce que le professionnel
 * est en train de remplir. Repliés par défaut : ils aident sans encombrer le formulaire.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';

export type TypeConseil = 'oeuvre' | 'artisanat' | 'evenement' | 'article' | 'lieu' | 'profil';

// Textes français par défaut ; les traductions sont dans seo.conseils.<type>.<n>
const CONSEILS: Record<TypeConseil, string[]> = {
  oeuvre: [
    'Titre : le vrai titre, écrit comme on le chercherait sur Google.',
    'Résumé : au moins 3 ou 4 phrases. De quoi parle l’œuvre, quand et où elle a été créée, pour qui.',
    'Glissez les mots que les gens tapent : la ville ou la région, le genre (roman, poésie, chaâbi, peinture…).',
    'Une photo nette, bien éclairée : la couverture, l’affiche ou l’œuvre de face.',
    'Si vous le pouvez, écrivez aussi le titre et le résumé en arabe ou en anglais : vous serez trouvé dans ces langues.',
  ],
  artisanat: [
    'Nom précis : l’objet, la matière et la région. Par exemple : « Tapis de Ghardaïa en laine ».',
    'Description : la technique, le temps de fabrication, l’histoire du motif, l’usage.',
    'Indiquez les dimensions, le poids et le prix : les acheteurs les cherchent.',
    'Plusieurs photos nettes : l’objet entier, un détail, et l’objet en situation.',
  ],
  evenement: [
    'Nom clair, avec la ville si possible. Par exemple : « Salon du livre de Béjaïa ».',
    'Choisissez le lieu exact : l’événement apparaît alors sur la carte et dans les recherches de la wilaya.',
    'Description : le programme, les invités, le public visé, le prix.',
    'Ajoutez une affiche ou une photo : un événement sans image est rarement ouvert.',
  ],
  article: [
    'Un titre qui annonce le sujet, pas une simple formule.',
    'Un chapeau de deux phrases qui résume l’article : c’est souvent lui que Google affiche.',
    'Des intertitres pour découper le texte, et des noms de lieux, de personnes et de dates précis.',
    'Citez vos sources et ajoutez des liens : ils renforcent la confiance des lecteurs et des moteurs.',
  ],
  lieu: [
    'Le nom officiel du lieu, et ses autres noms s’il en a (en arabe, en tamazight, nom populaire).',
    'La commune exacte et la position sur la carte.',
    'Son histoire, ce qu’on peut y voir, les horaires et l’accès.',
    'Des photos récentes et nettes.',
  ],
  profil: [
    'Biographie d’au moins 300 caractères : votre métier, votre ville, vos œuvres principales, vos prix ou expositions.',
    'Utilisez partout le même nom (site, réseaux, presse) : les moteurs relient ainsi vos pages entre elles.',
    'Une photo de vous nette, de face.',
    'Ajoutez vos articles de presse et vos réseaux (YouTube, Instagram, Facebook…) dans « Dans la presse et en ligne ».',
  ],
};

const ConseilReferencement: React.FC<{ type: TypeConseil; className?: string }> = ({ type, className = '' }) => {
  const { t } = useTranslation();
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className={`rounded-lg border border-primary/30 bg-primary/5 text-sm ${className}`}>
      <button type="button" onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start font-medium">
        <span className="flex items-center gap-2"><Search className="h-4 w-4 text-primary" aria-hidden="true" />
          {t('seo.conseils.titre', 'Conseils pour être bien trouvé sur Google')}</span>
        {ouvert ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
      </button>
      {ouvert && (
        <ul className="list-disc space-y-1.5 px-4 pb-4 ps-8">
          {CONSEILS[type].map((texte, i) => <li key={i}>{t(`seo.conseils.${type}.${i}`, texte)}</li>)}
        </ul>
      )}
    </div>
  );
};

export { CONSEILS };
export default ConseilReferencement;
