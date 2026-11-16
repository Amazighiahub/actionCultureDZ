/**
 * Inventaire des fichiers Cloudinary inutilisés : toute mention (adresse, adresse transformée, chemin
 * seul) garde le fichier ; seuls les fichiers cités nulle part et vieux de plus de 30 jours sortent.
 */
const { idsDansTexte, estCite, inutilises, resume, refusDeplacement, versCorbeille, depuisCorbeille } = require('../../services/inventaireCloudinary');
const { lireUrlCloudinary } = require('../../services/cloudinaryService');

const C = 'https://res.cloudinary.com/compte-essai';

describe('inventaire Cloudinary', () => {
  it('reconnaît une adresse, une adresse transformée, un PDF et un chemin seul dans un texte', () => {
    const texte = `<p><img src="${C}/image/upload/w_400,c_fill/v12/eventculture/images/a.jpg"></p>
      {"url":"${C}/raw/upload/v3/eventculture/documents/prog.pdf"} et eventculture/oeuvres/images/b.png.`;
    const ids = idsDansTexte(texte, lireUrlCloudinary);
    expect(ids.has('eventculture/images/a')).toBe(true);
    expect(ids.has('eventculture/documents/prog.pdf')).toBe(true);
    expect(ids.has('eventculture/oeuvres/images/b')).toBe(true);
  });

  it('fichiers inutilisés : cités nulle part et vieux de plus de 30 jours', () => {
    const maintenant = Date.parse('2026-11-16T00:00:00Z');
    const f = (public_id, jours, bytes = 1000) => ({ public_id, bytes, resource_type: 'image', created_at: new Date(maintenant - jours * 86400000).toISOString() });
    const refs = new Set(['eventculture/images/garde', 'eventculture/documents/x.pdf']);
    const liste = inutilises([f('eventculture/images/garde', 90), f('eventculture/images/vieux', 90), f('eventculture/images/recent', 5),
      f('eventculture/documents/x.pdf', 90)], refs, maintenant);
    expect(liste.map((x) => x.public_id)).toEqual(['eventculture/images/vieux']);
    expect(resume(liste)).toEqual({ nombre: 1, octets: 1000, parDossier: { 'eventculture/images': { nombre: 1, octets: 1000 } } });
  });

  it('un PDF cité sans son extension est gardé', () => {
    expect(estCite('eventculture/documents/x.pdf', new Set(['eventculture/documents/x']))).toBe(true);
  });

  it('adresses écrites autrement : \/ dans un JSON, %2F dans un lien de partage, &quot;', () => {
    const ids = idsDansTexte('{"u":"https:\/\/res.cloudinary.com\/c\/image\/upload\/v1\/eventculture\/images\/x.jpg"} '
      + 'https%3A%2F%2Fres.cloudinary.com%2Fc%2Fimage%2Fupload%2Fv2%2Feventculture%2Fimages%2Fy.png '
      + '&quot;https://res.cloudinary.com/c/image/upload/v3/eventculture/images/z.jpg&quot;', lireUrlCloudinary);
    for (const id of ['eventculture/images/x', 'eventculture/images/y', 'eventculture/images/z']) expect(ids.has(id)).toBe(true);
  });

  it('corbeille : aller et retour', () => {
    expect(versCorbeille('eventculture/images/a')).toBe('corbeille-eventculture/images/a');
    expect(depuisCorbeille('corbeille-eventculture/images/a')).toBe('eventculture/images/a');
  });

  it('garde-fous du déplacement : production, taladz.com, base qui cite des fichiers, part raisonnable', () => {
    const prod = { NODE_ENV: 'production', FRONTEND_URL: 'https://taladz.com' };
    expect(refusDeplacement({ env: prod, citees: 500, total: 1000, aDeplacer: 100 })).toBeNull();
    expect(refusDeplacement({ env: { ...prod, NODE_ENV: 'development' }, citees: 500, total: 1000, aDeplacer: 10 })).toMatch(/production/);
    expect(refusDeplacement({ env: { ...prod, FRONTEND_URL: 'http://localhost:3000' }, citees: 500, total: 1000, aDeplacer: 10 })).toMatch(/taladz/);
    expect(refusDeplacement({ env: prod, citees: 5, total: 1000, aDeplacer: 10 })).toMatch(/cités/);
    expect(refusDeplacement({ env: prod, citees: 500, total: 1000, aDeplacer: 300 })).toMatch(/20 %/);
  });
});
