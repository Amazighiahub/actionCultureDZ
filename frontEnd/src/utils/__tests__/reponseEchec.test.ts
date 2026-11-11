import { describe, expect, it } from 'vitest';
import { detailsDesChamps, echecEnvoi, messageErreurServeur, reponseEchec } from '@/utils/erreurServeur';

// Erreur telle que la produit httpClient (HttpError) : message lisible, statut, code, détail des champs
const erreurHttp = (props: Record<string, unknown>) => Object.assign(new Error(String(props.message ?? '')), props);

describe('échec renvoyé par un service (audit V11 FRM-18)', () => {
  it('garde le détail des champs, le code et le statut', () => {
    const r = reponseEchec(erreurHttp({ message: 'Données invalides', status: 400, code: 'VALIDATION_ERROR',
      details: [{ field: 'adresse', message: 'Indiquez l’adresse de livraison.' }] }), 'défaut');
    expect(r.success).toBe(false);
    expect(r.status).toBe(400);
    expect(r.code).toBe('VALIDATION_ERROR');
    expect(detailsDesChamps(r)).toEqual([{ field: 'adresse', message: 'Indiquez l’adresse de livraison.' }]);
    expect(messageErreurServeur(r, 'défaut')).toBe('Indiquez l’adresse de livraison.');
  });

  it('réseau coupé reconnu après le passage par le service (avant : impossible, seul le texte restait)', () => {
    const r = reponseEchec(erreurHttp({ message: 'Problème de connexion.', code: 'ERR_NETWORK' }), 'défaut');
    expect(echecEnvoi(r, { defaut: 'D', nonParti: 'pas parti', reponseTarde: 'tarde' })).toEqual({ ok: false, erreur: 'pas parti' });
  });

  it('délai dépassé reconnu : vérifier avant de réessayer', () => {
    const r = reponseEchec(erreurHttp({ message: 'Trop long', code: 'ECONNABORTED' }), 'défaut');
    expect(echecEnvoi(r, { defaut: 'D', nonParti: 'pas parti', reponseTarde: 'tarde' }).erreur).toBe('tarde');
  });

  it('texte technique jamais montré', () => {
    expect(reponseEchec(erreurHttp({ message: 'Request failed with status code 500', status: 500 }), 'Réessayez').error).toBe('Réessayez');
  });
});
