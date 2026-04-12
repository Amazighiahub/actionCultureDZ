# Registre des traitements de données personnelles

**Responsable du traitement** : Tala DZ — taladz.com
**Contact DPO** : contact@taladz.com
**Date de création** : 12 avril 2026
**Dernière mise à jour** : 12 avril 2026

> Document requis par l'article 30 du RGPD. À mettre à jour à chaque nouveau traitement de données personnelles.

---

## Traitement 1 — Gestion des comptes utilisateurs

| Champ | Valeur |
|---|---|
| **Finalité** | Inscription, authentification, gestion du profil |
| **Base légale** | Exécution du contrat (CGU acceptées à l'inscription) |
| **Catégories de personnes** | Utilisateurs inscrits (visiteurs et professionnels) |
| **Données collectées** | Email, mot de passe (hashé bcrypt 14 rounds), nom, prénom |
| **Données optionnelles** | Date de naissance, sexe, téléphone, adresse, photo de profil, biographie, wilaya de résidence |
| **Données professionnelles** | Entreprise, spécialités, certifications, site web, réseaux sociaux, documents justificatifs |
| **Données techniques** | IP d'inscription, date d'acceptation CGU, IP d'acceptation CGU, dernière connexion |
| **Destinataires** | Administrateurs de la Plateforme |
| **Sous-traitants** | Cloudinary (stockage photos profil), Brevo (emails transactionnels) |
| **Transfert hors UE/Algérie** | Cloudinary (USA) |
| **Durée de conservation** | Tant que le compte est actif. Suppression sur demande via profil ou contact@taladz.com |
| **Mesures de sécurité** | Bcrypt 14 rounds, JWT avec rotation, refresh tokens hashés SHA256, HTTPS/TLS 1.2+, rate limiting Redis |

---

## Traitement 2 — Consentement et preuve (RGPD Art. 7)

| Champ | Valeur |
|---|---|
| **Finalité** | Tracer le consentement de l'utilisateur aux CGU et à la politique de confidentialité |
| **Base légale** | Obligation légale (RGPD Art. 7 — preuve du consentement) |
| **Catégories de personnes** | Utilisateurs inscrits |
| **Données collectées** | Date et heure d'acceptation des CGU, adresse IP lors de l'acceptation |
| **Destinataires** | Administrateurs uniquement |
| **Durée de conservation** | Tant que le compte est actif + 1 an après suppression (preuve en cas de litige) |
| **Mesures de sécurité** | Stockage en base de données sécurisée, accès restreint aux administrateurs |

---

## Traitement 3 — Newsletter

| Champ | Valeur |
|---|---|
| **Finalité** | Envoi de la newsletter culturelle (événements, nouvelles œuvres, patrimoine) |
| **Base légale** | Consentement explicite (case séparée, non pré-cochée) |
| **Catégories de personnes** | Utilisateurs inscrits ayant coché la case newsletter |
| **Données collectées** | Adresse email |
| **Destinataires** | Brevo (ex-Sendinblue) — sous-traitant email |
| **Transfert hors UE/Algérie** | Brevo est basé en France (conforme RGPD) |
| **Durée de conservation** | Jusqu'au désabonnement (modifiable dans les préférences du profil) |
| **Mesures de sécurité** | HTTPS, désabonnement en un clic |

---

## Traitement 4 — Publication de contenus culturels

| Champ | Valeur |
|---|---|
| **Finalité** | Permettre aux utilisateurs de publier des œuvres, événements, artisanat, sites patrimoniaux |
| **Base légale** | Exécution du contrat (CGU) |
| **Catégories de personnes** | Utilisateurs inscrits (contributeurs) |
| **Données collectées** | Contenus publiés (textes multilingues, images, métadonnées), identité du contributeur (nom affiché) |
| **Destinataires** | Public (contenus publiés visibles par tous), administrateurs (modération) |
| **Sous-traitants** | Cloudinary (stockage images et médias) |
| **Transfert hors UE/Algérie** | Cloudinary (USA) |
| **Durée de conservation** | Tant que le contenu est publié. Anonymisé si le compte est supprimé (le contenu reste visible sans attribution) |
| **Mesures de sécurité** | Sanitisation HTML, validation des fichiers (magic number), limitation taille uploads |

---

## Traitement 5 — Statistiques de fréquentation (vues)

| Champ | Valeur |
|---|---|
| **Finalité** | Comptage des vues sur les œuvres, événements, sites patrimoniaux (pas de profilage individuel) |
| **Base légale** | Intérêt légitime (amélioration de la Plateforme) |
| **Catégories de personnes** | Tous les visiteurs (inscrits et anonymes) |
| **Données collectées** | IP anonymisée (dernier octet tronqué), user agent, page consultée, session anonyme |
| **Destinataires** | Administrateurs (statistiques agrégées uniquement) |
| **Durée de conservation** | 90 jours (purge automatique via cron hebdomadaire) |
| **Mesures de sécurité** | IP anonymisée avant stockage (recommandation CNIL), aucun cookie de traçage tiers |

---

## Traitement 6 — Formulaire de contact

| Champ | Valeur |
|---|---|
| **Finalité** | Recevoir et traiter les messages des visiteurs et utilisateurs |
| **Base légale** | Consentement (soumission volontaire du formulaire) |
| **Catégories de personnes** | Tout visiteur du site |
| **Données collectées** | Nom, prénom (optionnels), email (obligatoire), sujet, message |
| **Destinataires** | Équipe Tala DZ (via email contact@taladz.com) |
| **Sous-traitants** | Brevo (envoi email) |
| **Durée de conservation** | Durée nécessaire au traitement de la demande |
| **Mesures de sécurité** | Rate limiting (5 messages/heure par IP), validation des entrées |

---

## Traitement 7 — Commentaires et évaluations

| Champ | Valeur |
|---|---|
| **Finalité** | Permettre aux utilisateurs de commenter et évaluer les contenus |
| **Base légale** | Exécution du contrat (CGU) |
| **Catégories de personnes** | Utilisateurs inscrits et authentifiés |
| **Données collectées** | Contenu du commentaire, note, date, identité de l'auteur |
| **Destinataires** | Public (commentaires visibles), administrateurs (modération) |
| **Durée de conservation** | Tant que le contenu commenté existe. Anonymisé si le compte est supprimé |
| **Mesures de sécurité** | Authentification requise, sanitisation HTML, modération admin |

---

## Traitement 8 — Favoris et notifications

| Champ | Valeur |
|---|---|
| **Finalité** | Permettre aux utilisateurs de marquer des contenus en favoris et recevoir des notifications |
| **Base légale** | Exécution du contrat (CGU) |
| **Catégories de personnes** | Utilisateurs inscrits |
| **Données collectées** | Liste des favoris, préférences de notifications (6 booléens granulaires) |
| **Destinataires** | L'utilisateur lui-même uniquement |
| **Durée de conservation** | Notifications : 90 jours (purge automatique). Favoris : tant que le compte est actif |
| **Mesures de sécurité** | Accès restreint au propriétaire du compte |

---

## Traitement 9 — Sécurité et journalisation

| Champ | Valeur |
|---|---|
| **Finalité** | Prévention des abus, détection d'intrusions, audit des actions critiques |
| **Base légale** | Intérêt légitime (sécurité de la Plateforme) |
| **Catégories de personnes** | Tous les visiteurs et utilisateurs |
| **Données collectées** | IP (dans les logs Winston), user ID, action effectuée, horodatage |
| **Destinataires** | Administrateurs, Sentry (monitoring d'erreurs, optionnel) |
| **Durée de conservation** | Logs fichiers : rotation automatique (max 10 Mo × 10 fichiers). Audit logs : 90 jours |
| **Mesures de sécurité** | Logs structurés JSON, mots de passe et tokens jamais loggés, accès fichiers restreint |

---

## Sous-traitants

| Sous-traitant | Usage | Données transmises | Localisation | DPA |
|---|---|---|---|---|
| **Cloudinary** | Stockage images et médias | Fichiers médias uploadés | USA (Delaware) | Disponible sur cloudinary.com/gdpr |
| **Brevo** (ex-Sendinblue) | Emails transactionnels + newsletter | Adresse email, contenu email | France (UE) | Conforme RGPD, DPA intégré |
| **OpenStreetMap / Nominatim** | Géocodage d'adresses | Texte d'adresse recherchée | UE (serveurs publics) | Service public, aucune donnée personnelle transmise |
| **Let's Encrypt** | Certificats SSL | Nom de domaine uniquement | USA | Service public gratuit |

---

## Droits des personnes — implémentation technique

| Droit | Article RGPD | Route API | Implémentation |
|---|---|---|---|
| Accès | Art. 15 | `GET /api/users/profile` | Consultation profil complet |
| Export | Art. 15 + 20 | `GET /api/users/profile/export` | Export JSON machine-readable (toutes données) |
| Rectification | Art. 16 | `PUT /api/users/profile` | Modification profil en ligne |
| Effacement | Art. 17 | `DELETE /api/users/profile` | Hard delete + anonymisation contenus + audit trail |
| Opposition notifications | Art. 21 | `PUT /api/users/preferences` | 6 booléens granulaires |
| Confidentialité profil | Art. 21 | `PUT /api/users/privacy` | profil_public, email_public, telephone_public |

---

## Historique des modifications

| Date | Modification | Auteur |
|---|---|---|
| 12 avril 2026 | Création du registre (9 traitements) | DPO Tala DZ |
