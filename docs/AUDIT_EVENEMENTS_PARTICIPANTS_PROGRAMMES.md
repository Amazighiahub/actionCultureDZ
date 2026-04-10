# Audit: Gestion Evenements, Participants & Programmes

> Audit cible sur les 3 modules interconnectes. Classement par **priorite** (Critique > Majeur > Mineur).

---

## RESUME EXECUTIF

| Module | Bugs | Critique | Majeur | Mineur |
|--------|------|----------|--------|--------|
| Evenements | 8 | 2 | 4 | 2 |
| Participants | 7 | 3 | 3 | 1 |
| Programmes | 7 | 1 | 4 | 2 |
| **Total** | **22** | **6** | **11** | **5** |

---

## A. EVENEMENTS

### EVT-01 [CRITIQUE] Race condition sur la verification de capacite
- **Fichiers**: `backend/services/evenement/evenementService.js:354-363`, `backend/repositories/evenementRepository.js:324-334`
- **Probleme**: `countParticipants()` ne compte que les statuts `['confirme', 'present']` mais `registerParticipant()` cree des inscriptions avec statut `'inscrit'`. Si 100 users s'inscrivent simultanement a un evenement de capacite 50, **tous passent** car aucun n'est encore `confirme` au moment du count.
- **Impact**: L'evenement peut depasser sa capacite maximale.
- **Solution**:
```js
// countParticipants doit aussi compter les 'inscrit' (en attente de confirmation)
async countParticipants(evenementId, options = {}) {
  return this.models.EvenementUser.count({
    where: {
      id_evenement: evenementId,
      statut_participation: { [Op.in]: ['inscrit', 'confirme', 'present'] }
    },
    ...options
  });
}
```

---

### EVT-02 [CRITIQUE] Pas de verification de propriete sur cancel
- **Fichier**: `backend/routes/evenementRoutes.js:101`
- **Probleme**: La route `POST /:id/cancel` requiert `authenticate` + `validateId()` mais **aucun** `requireValidatedProfessional` ou `requireVerifiedEmail`. N'importe quel utilisateur authentifie peut annuler n'importe quel evenement s'il connait l'ID, car le service fait le check ownership mais via `parseInt` comparison qui peut etre contournee si `id_user` est string vs number.
- **Impact**: Un visiteur pourrait potentiellement annuler des evenements.
- **Solution**: Ajouter `requireVerifiedEmail` sur la route, et dans le service, toujours comparer avec `parseInt`:
```js
// Route:
router.post('/:id/cancel', authenticate, requireVerifiedEmail, validateId(), 
  asyncHandler((req, res) => evenementController.cancel(req, res)));
```

---

### EVT-03 [MAJEUR] Modification restreinte aux brouillons seulement
- **Fichier**: `backend/services/evenement/evenementService.js:235-237`
- **Probleme**: `update()` refuse toute modification si `statut !== 'brouillon'`. Un organisateur ne peut donc **pas corriger** le lieu, la description ou l'horaire d'un evenement deja publie.
- **Impact**: UX bloquante — l'organisateur doit demander a un admin d'annuler puis re-creer.
- **Solution**: Autoriser la modification de certains champs (description, lieu, horaires, image) meme en statut `publie` ou `planifie`, tout en bloquant les champs sensibles (nom, type, dates principales):
```js
const editableWhenPublished = ['description', 'image_url', 'contact_email', 
  'contact_telephone', 'capacite_max', 'accessibilite'];
if (existing.statut !== 'brouillon') {
  // Filtrer pour ne garder que les champs modifiables
  const restrictedKeys = Object.keys(updateData).filter(k => !editableWhenPublished.includes(k));
  if (restrictedKeys.length > 0) {
    throw this._validationError('Seuls certains champs sont modifiables apres publication');
  }
}
```

---

### EVT-04 [MAJEUR] Suppression possible seulement en brouillon (pas d'annulation soft)
- **Fichier**: `backend/services/evenement/evenementService.js:317-318`
- **Probleme**: `delete()` fait un `repository.delete(id)` qui est un **hard delete** en base. Pas de soft delete. Si un admin supprime un evenement publie avec des participants, les inscriptions deviennent des orphelins en base (FK sans ON DELETE CASCADE probable).
- **Impact**: Donnees orphelines, historique perdu.
- **Solution**: Implementer un soft delete (champ `deleted_at`) ou interdire la suppression si des participants existent:
```js
if (!options.isAdmin) {
  const participantCount = await this.repository.countParticipants(id);
  if (participantCount > 0) {
    throw this._validationError('Impossible de supprimer un evenement avec des participants. Utilisez l\'annulation.');
  }
}
```

---

### EVT-05 [MAJEUR] Pas de notification aux participants lors d'une modification
- **Fichier**: `backend/services/evenement/evenementService.js:270-297`
- **Probleme**: `update()` ne notifie pas les participants inscrits quand le lieu, la date ou l'horaire change. Seul `cancel()` envoie une notification.
- **Impact**: Les participants ne sont pas informes des changements importants.
- **Solution**: Ajouter une notification conditionnelle dans `update()` si des champs critiques changent:
```js
const criticalFields = ['date_debut', 'date_fin', 'id_lieu', 'url_virtuel'];
const hasCriticalChange = criticalFields.some(f => updateData[f] !== undefined);
if (hasCriticalChange && this.models?.Notification) {
  // Fire-and-forget notification
  notifService.notifierModificationEvenement(id, Object.keys(updateData))
    .catch(err => this.logger.error('Notification modification failed:', err));
}
```

---

### EVT-06 [MAJEUR] Route reorder oeuvres conflit avec oeuvreId parametre
- **Fichier**: `backend/routes/evenementRoutes.js:94`
- **Probleme**: `PUT /:id/oeuvres/reorder` est definie APRES `PUT /:id/oeuvres/:oeuvreId` (ligne 93). Express matche `reorder` comme valeur de `:oeuvreId` au lieu de la route specifique.
- **Impact**: La route reorder n'est **jamais atteinte** — elle retourne 404 ou une erreur de validation ID car `"reorder"` n'est pas un entier.
- **Solution**: Deplacer la route reorder AVANT la route avec `:oeuvreId`:
```js
// Reorder AVANT la route paramétrique
router.put('/:id/oeuvres/reorder', authenticate, validateId(), 
  asyncHandler((req, res) => evenementController.reorderOeuvres(req, res)));
router.put('/:id/oeuvres/:oeuvreId', authenticate, validateId(), validateId('oeuvreId'), 
  asyncHandler((req, res) => evenementController.updateOeuvre(req, res)));
```

---

### EVT-07 [MINEUR] `_assertEventOwnerOrAdmin` compare int vs potentiel string
- **Fichier**: `backend/services/evenement/evenementService.js:391`
- **Probleme**: `evenement.id_user !== userId` — comparison stricte sans `parseInt`. Si `id_user` vient de la DB comme number et `userId` de `req.user.id_user` comme string (ou inversement), le check ownership echoue.
- **Impact**: Un organisateur legitime pourrait etre bloque.
- **Solution**: 
```js
if (parseInt(evenement.id_user) !== parseInt(userId) && !isAdmin) {
```

---

### EVT-08 [MINEUR] SQL injection dans reorderOeuvres via CASE WHEN
- **Fichier**: `backend/repositories/evenementRepository.js:534`
- **Probleme**: Les valeurs `idOeuvre` et `ordre` sont inserees directement dans la requete SQL via string interpolation: `` `WHEN ${p.idOeuvre} THEN ${p.ordre}` ``. Bien que `parseInt` soit applique (ligne 525-526), si `parseInt` retourne `NaN`, la requete SQL devient invalide mais pas dangereuse. Cependant, c'est un **anti-pattern**.
- **Impact**: Risque faible (parseInt protege), mais mauvaise pratique.
- **Solution**: Utiliser des replacements Sequelize parametres ou valider explicitement:
```js
const parsed = oeuvres.map(item => {
  const idOeuvre = parseInt(item.id_oeuvre);
  const ordre = parseInt(item.ordre ?? item.ordre_presentation);
  if (!Number.isInteger(idOeuvre) || !Number.isInteger(ordre)) {
    throw new Error('Donnees de reorganisation invalides');
  }
  if (idOeuvre <= 0 || ordre <= 0) {
    throw new Error('ID et ordre doivent etre positifs');
  }
  return { idOeuvre, ordre };
});
```

---

## B. PARTICIPANTS

### PART-01 [CRITIQUE] Participant annule ne peut JAMAIS se re-inscrire
- **Fichier**: `backend/repositories/evenementRepository.js:291-295`
- **Probleme**: Si un organisateur rejette une participation (`statut_participation = 'annule'`), le participant recoit une erreur `'Inscription refusee'` s'il tente de se re-inscrire. Il n'y a **aucun moyen** pour le participant de revenir, meme si l'organisateur change d'avis.
- **Impact**: Blocage permanent d'un participant sans recours.
- **Solution**: Permettre la re-inscription si le participant a ete annule par erreur, en ajoutant un delai ou un flag:
```js
if (existing) {
  if (existing.statut_participation === 'annule') {
    // Permettre la re-inscription apres un delai (ou sur decision de l'organisateur)
    // Option 1: permettre la re-inscription automatique
    await existing.update({ 
      statut_participation: 'inscrit', 
      date_inscription: new Date() 
    });
    return existing;
    // Option 2: throw avec un message explicatif
    // throw new Error('Votre participation a ete annulee. Contactez l\'organisateur.');
  }
  return existing;
}
```

---

### PART-02 [CRITIQUE] Desinscription = hard delete sans verification de statut
- **Fichier**: `backend/repositories/evenementRepository.js:312-318`
- **Probleme**: `unregisterParticipant()` fait un `destroy()` qui supprime completement l'enregistrement. Aucune verification:
  1. L'evenement est-il en cours ou passe? (on peut se desinscrire d'un evenement termine)
  2. Le participant est-il deja `present` (confirme sur place)?
  3. Pas de soft delete — l'historique est perdu.
- **Impact**: Perte de donnees de participation, statistiques faussees.
- **Solution**:
```js
async unregisterParticipant(evenementId, userId) {
  if (!this.models.EvenementUser) return false;
  
  const participation = await this.models.EvenementUser.findOne({
    where: { id_evenement: evenementId, id_user: userId }
  });
  if (!participation) return false;
  
  // Interdire la desinscription si deja present
  if (['present', 'absent'].includes(participation.statut_participation)) {
    throw new Error('Impossible de se desinscrire apres la confirmation de presence');
  }
  
  // Soft delete: changer le statut au lieu de supprimer
  await participation.update({ 
    statut_participation: 'desiste', 
    date_desinscription: new Date() 
  });
  return true;
}
```

---

### PART-03 [CRITIQUE] `nombre_personnes` ignore cote backend
- **Fichier**: `backend/services/evenement/evenementService.js:338-367` + `frontEnd/src/pages/event/EventRegistration.tsx:244`
- **Probleme**: Le frontend envoie `nombre_personnes` dans la requete d'inscription, mais le backend (`registerParticipant`) ne recoit que `(evenementId, userId)`. Le nombre de personnes est **completement ignore**. Le check de capacite ne compte que 1 place par inscription.
- **Impact**: Un utilisateur inscrit pour 5 personnes ne reserve qu'1 place. L'evenement depasse sa capacite.
- **Solution**: Propager `nombre_personnes` dans le service et le repository:
```js
// Service
async registerParticipant(evenementId, userId, options = {}) {
  const { nombre_personnes = 1 } = options;
  // ...
  if (evenement.capacite_max) {
    const count = await this.repository.countTotalParticipants(evenementId, { transaction });
    if (count + nombre_personnes > evenement.capacite_max) {
      throw this._validationError('Pas assez de places disponibles');
    }
  }
  return this.repository.registerParticipant(evenementId, userId, { 
    transaction, nombre_personnes 
  });
}
```

---

### PART-04 [MAJEUR] Pas de validation d'email verifie pour l'inscription
- **Fichier**: `backend/routes/evenementRoutes.js:88`
- **Probleme**: La route `POST /:id/register` requiert `authenticate` + `requireVerifiedEmail`. C'est correct. Cependant, la route de desinscription `DELETE /:id/register` (ligne 89) n'a pas `requireValidatedProfessional` ce qui est normal, mais il manque un rate limiter — un script pourrait s'inscrire/desinscrire en boucle.
- **Impact**: Risque de spam d'inscriptions/desinscriptions.
- **Solution**: Ajouter un rate limiter sur les routes d'inscription:
```js
router.post('/:id/register', authenticate, requireVerifiedEmail, 
  createContentLimiter, validateId(), 
  asyncHandler((req, res) => evenementController.register(req, res)));
```

---

### PART-05 [MAJEUR] Validation de participation sans notification fiable
- **Fichier**: `backend/services/evenement/evenementService.js:448-456`
- **Probleme**: `validateParticipation()` instancie un **nouveau** `NotificationService` a chaque appel: `new NotificationService(this.models)`. Ce service n'est pas le singleton du container. Si le service de notification a besoin du cache ou d'autres dependances, elles manquent.
- **Impact**: Notifications potentiellement non envoyees ou avec configuration incomplete.
- **Solution**: Utiliser le service du container:
```js
const container = require('../../services/serviceContainer');
if (container.isInitialized) {
  container.notificationService.notifierValidationParticipation(...)
    .catch(err => this.logger.error('...', err));
}
```

---

### PART-06 [MAJEUR] `getPublicParticipants` expose `date_inscription` sans anonymisation
- **Fichier**: `backend/repositories/evenementRepository.js:343-357`
- **Probleme**: L'endpoint public expose `date_inscription` exacte de chaque participant. Combine avec `nom`, `prenom`, `photo_url`, cela permet de profiler les habitudes d'inscription des utilisateurs.
- **Impact**: Risque RGPD — donnees personnelles exposees publiquement.
- **Solution**: Retirer `date_inscription` de l'endpoint public ou l'arrondir au mois:
```js
attributes: ['role_participation'], // Retirer date_inscription
```

---

### PART-07 [MINEUR] Statuts de participation inconsistants entre frontend et backend
- **Fichier**: Frontend `EventRegistration.tsx:265-286` vs Backend `evenementRepository.js:303`
- **Probleme**: Le frontend utilise `pending`, `confirmed`, `cancelled`, `waiting_list` comme cles de statut, mais le backend stocke `inscrit`, `confirme`, `annule`, `present`, `absent`. Le mapping n'est fait nulle part — le badge de statut affiche toujours "En attente" car `registrationStatus` ne matche jamais `confirmed`.
- **Impact**: Le statut d'inscription affiche dans l'UI est toujours incorrect.
- **Solution**: Ajouter un mapping dans le frontend:
```ts
const statusMapping: Record<string, string> = {
  'inscrit': 'pending',
  'confirme': 'confirmed', 
  'annule': 'cancelled',
  'present': 'confirmed',
  'absent': 'cancelled',
  'desiste': 'cancelled'
};
const mappedStatus = statusMapping[registrationStatus || ''] || 'pending';
```

---

## C. PROGRAMMES

### PROG-01 [CRITIQUE] Le controller ne gere pas les `{ error: ... }` retournes par le service
- **Fichier**: `backend/controllers/programmeController.js` (toutes les methodes d'ecriture)
- **Probleme**: `programmeService.createProgramme()`, `updateProgramme()`, `deleteProgramme()`, etc. retournent `{ error: 'notFound' }` ou `{ error: 'forbidden' }` au lieu de **throw**. Le controller appelle `this._handleError(res, error)` dans le catch, mais il ne verifie **jamais** le retour `{ error }`. Resultat: le controller retourne `200 OK` avec `{ error: 'forbidden' }` dans le body.
- **Impact**: Le client recoit un succes (200) alors que l'operation a echoue. Aucune erreur HTTP correcte.
- **Solution A** (modifier le controller):
```js
async createProgramme(req, res) {
  try {
    const result = await this.programmeService.createProgramme(
      req.params.evenementId, req.user.id_user, req.lang || 'fr', req.body
    );
    
    if (result.error) {
      const statusMap = { notFound: 404, forbidden: 403, evenementNotFound: 404, lieuNotFound: 404 };
      return res.status(statusMap[result.error] || 400).json({ 
        success: false, error: req.t(`programme.${result.error}`) 
      });
    }
    
    res.status(201).json({ success: true, data: result.programme });
  } catch (error) {
    this._handleError(res, error);
  }
}
```
- **Solution B** (modifier le service pour throw au lieu de return error — plus coherent avec le reste de l'architecture):
```js
// Dans programmeService.createProgramme:
if (!evenement) throw this._notFoundError('Evenement non trouve');
if (evenement.id_user !== userId) throw this._forbiddenError('Acces non autorise');
```

---

### PROG-02 [MAJEUR] `updateIntervenantStatus` compare `id_intervenant` avec `id_user`
- **Fichier**: `backend/services/programmeService.js:344,357-359`
- **Probleme**: Le code fait `const isIntervenant = targetUserId === requestUserId` puis cherche `ProgrammeIntervenant` avec `id_intervenant: targetUserId`. Mais `targetUserId` vient du param `intervenantId` de la route, qui est suppose etre un `id_intervenant`, pas un `id_user`. La comparaison `targetUserId === requestUserId` n'a aucun sens car elle compare un ID intervenant avec un ID user.
- **Impact**: Un intervenant ne peut jamais confirmer/decliner sa propre participation car le check `isIntervenant` echoue toujours.
- **Solution**:
```js
async updateIntervenantStatus(programmeId, intervenantId, requestUserId, statut) {
  // ...
  const pi = await this.models.ProgrammeIntervenant.findOne({
    where: { id_programme: programmeId, id_intervenant: intervenantId }
  });
  if (!pi) return { error: 'intervenantNotFound' };
  
  // Verifier si le requestUser est l'intervenant lie
  const intervenant = await this.models.Intervenant.findByPk(intervenantId);
  const isIntervenant = intervenant?.id_user === requestUserId;
  const isEventOwner = programme.Evenement.id_user === requestUserId;
  // ...
}
```

---

### PROG-03 [MAJEUR] `_groupByDay` parse `heure_debut` (TIME) comme Date
- **Fichier**: `backend/services/programmeService.js:503-513`
- **Probleme**: `heure_debut` est stocke en format TIME (`09:00:00`) dans MySQL, pas en datetime. `new Date('09:00:00').toLocaleDateString('fr-FR')` retourne `"Invalid Date"` sur la plupart des environnements. Le groupement par jour ne fonctionne pas.
- **Impact**: `byDay` est toujours vide ou contient des cles `"Invalid Date"`.
- **Solution**: Utiliser le champ `date_programme` (si existant) ou le `heure_debut` du programme combine avec la date de l'evenement:
```js
_groupByDay(programmes) {
  const byDay = {};
  programmes.forEach(p => {
    // Utiliser date_programme si disponible, sinon la date de l'evenement
    const dateKey = p.date_programme || p.Evenement?.date_debut?.split('T')[0] || 'sans_date';
    if (!byDay[dateKey]) byDay[dateKey] = [];
    byDay[dateKey].push(p);
  });
  return byDay;
}
```

---

### PROG-04 [MAJEUR] `formatProgrammesToCSV` meme probleme avec TIME vs datetime
- **Fichier**: `backend/services/programmeService.js:526-533`
- **Probleme**: Meme issue que PROG-03 — `new Date(p.heure_debut).toLocaleDateString('fr-FR')` avec une valeur TIME produit "Invalid Date".
- **Impact**: Export CSV avec des dates/heures invalides.
- **Solution**: Afficher directement la valeur TIME sans conversion:
```js
const heureDebut = p.heure_debut || '';
const heureFin = p.heure_fin || '';
const date = p.date_programme || '';
```

---

### PROG-05 [MAJEUR] `duplicateProgramme` ne duplique PAS les intervenants
- **Fichier**: `backend/services/programmeService.js:241-279`
- **Probleme**: La duplication copie les champs du programme mais pas les associations `ProgrammeIntervenant`. Un programme duplique perd tous ses intervenants.
- **Impact**: L'organisateur doit re-ajouter manuellement tous les intervenants apres duplication.
- **Solution**:
```js
// Apres creation du newProgramme:
const intervenants = await this.models.ProgrammeIntervenant.findAll({
  where: { id_programme: id }
});
for (const pi of intervenants) {
  await this.models.ProgrammeIntervenant.create({
    id_programme: newProgramme.id_programme,
    id_intervenant: pi.id_intervenant,
    role_intervenant: pi.role_intervenant,
    sujet_intervention: pi.sujet_intervention,
    ordre_intervention: pi.ordre_intervention,
    duree_intervention: pi.duree_intervention,
    statut_confirmation: 'en_attente' // Reset le statut
  }, { transaction });
}
```

---

### PROG-06 [MINEUR] `heure_debut` TIME parsing fragile dans EditProgrammePage
- **Fichier**: `frontEnd/src/pages/EditProgrammePage.tsx:96-97`
- **Probleme**: `programme.heure_debut.split('T')[1]?.substring(0, 5)` suppose un format ISO datetime. Si le backend retourne un format TIME (`09:00:00`), `split('T')` retourne un seul element et `[1]` est `undefined`.
- **Impact**: Les heures ne sont pas pre-remplies dans le formulaire d'edition.
- **Solution**:
```ts
const parseTime = (value: string | undefined): string => {
  if (!value) return '';
  // Format TIME direct: "09:00:00"
  if (/^\d{2}:\d{2}/.test(value)) return value.substring(0, 5);
  // Format ISO: "2026-01-01T09:00:00Z"
  const match = value.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : '';
};
heure_debut: parseTime(programme.heure_debut),
heure_fin: parseTime(programme.heure_fin),
```

---

### PROG-07 [MINEUR] `_sendIntervenantInviteEmail` est une methode morte
- **Fichier**: `backend/services/programmeService.js:449-471`
- **Probleme**: La methode `_sendIntervenantInviteEmail` existe mais n'est **appelee nulle part** dans le code. `_resolveIntervenant` cree l'intervenant mais ne l'appelle jamais.
- **Impact**: Les intervenants nouvellement crees ne recoivent aucun email d'invitation.
- **Solution**: Appeler la methode apres creation d'un intervenant avec email:
```js
// Dans _resolveIntervenant, apres creation:
if (newIntervenant.email) {
  this._sendIntervenantInviteEmail(
    { email: newIntervenant.email }, 
    null // Pas de mot de passe temporaire si l'intervenant n'a pas de compte
  ).catch(() => {});
}
```

---

## PLAN DE CORRECTION RECOMMANDE

### Phase 1 — Critiques (cette semaine, ~3h)
| # | Bug | Temps | Impact |
|---|-----|-------|--------|
| 1 | **EVT-01** Race condition capacite | 15 min | Surreservation |
| 2 | **PART-03** nombre_personnes ignore | 45 min | Capacite faussee |
| 3 | **PART-01** Re-inscription bloquee | 20 min | UX bloquante |
| 4 | **PART-02** Hard delete desinscription | 30 min | Perte donnees |
| 5 | **PROG-01** 200 OK sur erreurs programme | 30 min | API cassee |
| 6 | **EVT-02** Cancel sans verification | 10 min | Securite |

### Phase 2 — Majeurs (semaine prochaine, ~4h)
| # | Bug | Temps |
|---|-----|-------|
| 7 | **EVT-06** Route reorder jamais atteinte | 5 min |
| 8 | **PROG-02** Intervenant ne peut pas confirmer | 30 min |
| 9 | **PROG-03 + PROG-04** TIME vs Date parsing | 20 min |
| 10 | **PROG-05** Duplication sans intervenants | 20 min |
| 11 | **PART-05** NotificationService non-singleton | 15 min |
| 12 | **PART-06** RGPD date_inscription exposee | 5 min |
| 13 | **PART-07** Mapping statuts frontend/backend | 20 min |
| 14 | **EVT-03** Modification post-publication | 30 min |
| 15 | **EVT-04** Hard delete evenement | 30 min |
| 16 | **EVT-05** Pas de notif sur modification | 30 min |

### Phase 3 — Mineurs (a planifier)
| # | Bug | Temps |
|---|-----|-------|
| 17 | **EVT-07** parseInt dans _assertOwner | 5 min |
| 18 | **EVT-08** SQL interpolation reorder | 10 min |
| 19 | **PROG-06** TIME parsing frontend | 15 min |
| 20 | **PROG-07** Email intervenant mort | 20 min |
| 21 | **PART-04** Rate limit inscription | 5 min |

---

## DIAGRAMME DE FLUX ACTUEL vs CORRIGE

### Inscription participant (actuel — bugge)
```
User -> POST /register -> authenticate -> validateId 
  -> service.registerParticipant(eventId, userId)  // nombre_personnes PERDU
     -> count WHERE statut IN ('confirme','present')  // 'inscrit' NON COMPTE
     -> create EvenementUser(statut='inscrit')
     <- 200 OK
```

### Inscription participant (corrige)
```
User -> POST /register -> authenticate -> requireVerifiedEmail -> rateLimiter -> validateId
  -> service.registerParticipant(eventId, userId, { nombre_personnes })
     -> count WHERE statut IN ('inscrit','confirme','present')  // TOUS comptes
     -> verifier count + nombre_personnes <= capacite_max
     -> create EvenementUser(statut='inscrit', nombre_personnes)
     <- 200 OK
```

---

## BILAN

| Aspect | Note | Commentaire |
|--------|------|-------------|
| Architecture evenements | B+ | Service/Repository clean, DTO bien utilises |
| Gestion participants | C | Race conditions, hard deletes, nombre_personnes ignore |
| Gestion programmes | C+ | Return error au lieu de throw, TIME mal parse |
| Securite inscriptions | B- | Auth OK, mais rate limit manquant sur register |
| Notifications | C | Non-singleton, email intervenant mort |
| Coherence front/back | C | Statuts non mappes, TIME parsing fragile |
| RGPD | B- | Endpoint public expose trop de donnees |

**Temps total estime: ~7 heures pour tout corriger.**
