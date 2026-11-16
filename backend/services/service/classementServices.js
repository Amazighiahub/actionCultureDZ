/**
 * Classement des services par wilaya et par type, « comme TripAdvisor » (accord de la responsable,
 * 2026-11-16) : « N° 1 sur 5 restaurants à Alger ».
 *
 * Note pondérée (moyenne bayésienne) : un seul avis à 5 étoiles ne passe pas devant vingt avis à 4,8.
 * score = (n × moyenne + M × moyenneGenerale) / (n + M). Seuls les services qui ont au moins un avis
 * noté sont classés ; le total compte tous les services validés du même type dans la wilaya.
 */
const M = 3;

/**
 * @param {Array<{id:number, type_service:string, wilaya?:{id_wilaya:number}|null}>} services - tous les services validés
 * @param {Map<number,{moyenne:number,nombre:number}>} notes
 * @returns {Map<number,{rang:number,total:number}>}
 */
function classer(services, notes) {
  const notees = [...notes.values()].filter((n) => n.nombre > 0);
  const totalAvis = notees.reduce((s, n) => s + n.nombre, 0);
  const generale = totalAvis ? notees.reduce((s, n) => s + n.moyenne * n.nombre, 0) / totalAvis : 0;
  const score = (n) => (n.nombre * n.moyenne + M * generale) / (n.nombre + M);

  const groupes = new Map();
  for (const s of services) {
    if (!s.wilaya?.id_wilaya || !s.type_service) continue;
    const cle = `${s.type_service}:${s.wilaya.id_wilaya}`;
    if (!groupes.has(cle)) groupes.set(cle, []);
    groupes.get(cle).push(s);
  }
  const rangs = new Map();
  for (const groupe of groupes.values()) {
    const classes = groupe
      .filter((s) => notes.get(Number(s.id))?.nombre > 0)
      .map((s) => ({ id: Number(s.id), n: notes.get(Number(s.id)) }))
      // À égalité : plus d'avis d'abord, puis le plus ancien (identifiant) pour un ordre stable
      .sort((a, b) => score(b.n) - score(a.n) || b.n.nombre - a.n.nombre || a.id - b.id);
    classes.forEach((c, i) => rangs.set(c.id, { rang: i + 1, total: groupe.length }));
  }
  return rangs;
}

module.exports = { classer, M };
