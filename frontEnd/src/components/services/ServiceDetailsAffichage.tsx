/**
 * Page d'un service, lot 2 « comme TripAdvisor » : boutons « Réserver » (WhatsApp, lien de
 * réservation, téléphone) et équipements, langues parlées, capacité. Rien ne s'affiche sans données.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarCheck, Languages, MessageCircle, Phone, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { safeExternalUrl } from '@/utils/safeUrl';
import { EQUIPEMENTS_SERVICE, LANGUES_SERVICE, UNITE_CAPACITE, lienWhatsapp } from '@/constants/serviceDetails';

export function BoutonsReserver({ nom, whatsapp, lienReservation, telephone }: {
  nom: string; whatsapp?: string | null; lienReservation?: string | null; telephone?: string | null;
}) {
  const { t } = useTranslation();
  const wa = whatsapp ? lienWhatsapp(whatsapp) : null;
  const lien = lienReservation ? safeExternalUrl(lienReservation) : null;
  if (!wa && !lien) return null;
  const message = t('servicesVisiteurs.reserver.messageWhatsapp', 'Bonjour, je vous contacte depuis Tala DZ au sujet de « {{nom}} ».', { nom });
  return (
    <div className="mb-6 flex flex-wrap gap-2" data-testid="boutons-reserver">
      {wa && (
        <Button asChild className="gap-2 bg-[#1f7a4d] hover:bg-[#186640]">
          <a href={`${wa}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />{t('servicesVisiteurs.reserver.whatsapp', 'Réserver sur WhatsApp')}
          </a>
        </Button>
      )}
      {lien && (
        <Button asChild variant={wa ? 'outline' : 'default'} className="gap-2">
          <a href={lien} target="_blank" rel="noopener noreferrer">
            <CalendarCheck className="h-4 w-4" aria-hidden="true" />{t('servicesVisiteurs.reserver.enLigne', 'Réserver en ligne')}
          </a>
        </Button>
      )}
      {telephone && (
        <Button asChild variant="outline" className="gap-2">
          <a href={`tel:${telephone.replace(/\s/g, '')}`}>
            <Phone className="h-4 w-4" aria-hidden="true" />{t('servicesVisiteurs.reserver.appeler', 'Appeler')}
          </a>
        </Button>
      )}
    </div>
  );
}

export function EquipementsService({ equipements, langues, capacite, typeService }: {
  equipements?: unknown; langues?: unknown; capacite?: number | null; typeService?: string;
}) {
  const { t } = useTranslation();
  const choisis = Array.isArray(equipements) ? EQUIPEMENTS_SERVICE.filter((e) => equipements.includes(e.cle)) : [];
  const parlees = Array.isArray(langues) ? LANGUES_SERVICE.filter((l) => langues.includes(l.code)) : [];
  const unite = typeService ? UNITE_CAPACITE[typeService] : undefined;
  if (!choisis.length && !parlees.length && !capacite) return null;
  return (
    <section className="mb-8 space-y-4" aria-labelledby="equipements-titre">
      <h2 id="equipements-titre" className="text-xl font-semibold">{t('servicesVisiteurs.equipementsTitre', 'Équipements et services')}</h2>
      {choisis.length > 0 && (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          {choisis.map(({ cle, icone: Icone, libelle }) => (
            <li key={cle} className="flex items-center gap-2 text-sm">
              <Icone className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{t(`servicesVisiteurs.equipements.${cle}`, libelle)}
            </li>
          ))}
        </ul>
      )}
      {parlees.length > 0 && (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <Languages className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="font-medium">{t('servicesVisiteurs.languesParlees', 'Langues parlées :')}</span>
          {parlees.map((l) => <span key={l.code} dir="auto" className="rounded-full bg-muted px-2 py-0.5">{l.libelle}</span>)}
        </p>
      )}
      {!!capacite && (
        <p className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="font-medium">{t('servicesVisiteurs.capacite', 'Capacité :')}</span>
          {capacite}{unite ? ` ${t(`service.details.unite.${typeService}`, unite)}` : ''}
        </p>
      )}
    </section>
  );
}
