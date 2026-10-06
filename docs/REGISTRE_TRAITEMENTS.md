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
| **Données collectées** | Email, mot de passe (hashé bcrypt, coût 12), nom, prénom |
| **Données optionnelles** | Date de naissance, sexe, téléphone, adresse, photo de profil, biographie, wilaya de résidence |
| **Données professionnelles** | Entreprise, spécialités, certifications, site web, réseaux sociaux, documents justificatifs |
| **Données techniques** | IP d'inscription, date d'acceptation CGU, IP d'acceptation CGU, dernière connexion |
| **Destinataires** | Administrateurs de la Plateforme |
| **Sous-traitants** | Cloudinary (stockage photos profil), prestataire SMTP (emails transactionnels) — **à confirmer : Brevo ou Gmail** |
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
| **Durée de conservation** | Tant que le compte est actif. À la suppression du compte, la preuve du consentement est effacée avec lui (suppression définitive) ; seule une empreinte SHA-256 de l'email est conservée dans le journal d'audit |
| **Mesures de sécurité** | Stockage en base de données sécurisée, accès restreint aux administrateurs |

---

## Traitement 3 — Newsletter

| Champ | Valeur |
|---|---|
| **Finalité** | Envoi de la newsletter culturelle (événements, nouvelles œuvres, patrimoine) |
| **Base légale** | Consentement explicite (case séparée, non pré-cochée) |
| **Catégories de personnes** | Utilisateurs inscrits ayant coché la case newsletter |
| **Données collectées** | Adresse email |
| **Destinataires** | Prestataire SMTP — **à confirmer** |
| **Transfert hors UE/Algérie** | Selon le prestataire SMTP retenu (à confirmer) |
| **Durée de conservation** | Jusqu'au désabonnement : lien signé dans chaque email (en-têtes List-Unsubscribe), ou section « Mes données » du profil. Champ unique : `accepte_newsletter` |
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
| **Sous-traitants** | Prestataire SMTP (à confirmer) |
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
| **Données collectées** | IP (logs HTTP), user ID, action effectuée, horodatage. Emails et téléphones masqués dans les logs ; jetons retirés des URL journalisées ; données personnelles masquées dans le journal d'audit |
| **Destinataires** | Administrateurs, Sentry (monitoring d'erreurs, optionnel) |
| **Durée de conservation** | Logs fichiers : rotation automatique (max 10 Mo × 10 fichiers). Audit logs : 90 jours |
| **Mesures de sécurité** | Logs structurés JSON, mots de passe et tokens jamais loggés, accès fichiers restreint |

---

## Traitement 10 — Comptes professionnels et justificatifs

| Champ | Valeur |
|---|---|
| **Finalité** | Vérifier et valider les comptes professionnels (artistes, artisans, institutions) |
| **Base légale** | Exécution du contrat (CGU) |
| **Catégories de personnes** | Professionnels inscrits |
| **Données collectées** | Entreprise, spécialités, site web, réseaux sociaux, certifications, documents justificatifs (URL), motif de rejet |
| **Destinataires** | Administrateurs et modérateurs (coordonnées personnelles masquées pour les modérateurs) |
| **Durée de conservation** | Tant que le compte existe ; justificatifs supprimés avec le compte |
| **Sous-traitants** | Cloudinary (stockage des justificatifs) |

---

## Traitement 11 — Inscriptions aux événements

| Champ | Valeur |
|---|---|
| **Finalité** | Gérer les participations aux événements |
| **Base légale** | Exécution du contrat |
| **Catégories de personnes** | Participants inscrits |
| **Données collectées** | Identité, statut de participation, évaluation et commentaire de l'événement |
| **Destinataires** | Organisateur de l'événement (liste et export des participants), administrateurs |
| **Durée de conservation** | Tant que le compte existe |

---

## Traitement 12 — Modération (signalements)

| Champ | Valeur |
|---|---|
| **Finalité** | Traiter les signalements de contenus ou de comptes |
| **Base légale** | Intérêt légitime (sécurité et qualité de la Plateforme) |
| **Données collectées** | Signalant, motif, description, capture éventuelle, décision du modérateur |
| **Destinataires** | Modérateurs et administrateurs |
| **Durée de conservation** | Supprimés avec le compte du signalant ou du compte signalé |

---

## Traitement 13 — Sauvegardes

| Champ | Valeur |
|---|---|
| **Finalité** | Restauration en cas d'incident |
| **Base légale** | Intérêt légitime (continuité de service) |
| **Données** | Copie complète de la base de données |
| **Durée de conservation** | 7 dernières sauvegardes ; copie hors site chiffrée (age) si activée |
| **Mesures de sécurité** | Chiffrement par clé publique, clé privée conservée hors du serveur |

---

## Sous-traitants

| Sous-traitant | Usage | Données transmises | Localisation | DPA |
|---|---|---|---|---|
| **Cloudinary** | Stockage images et médias | Fichiers médias uploadés | USA (Delaware) | Disponible sur cloudinary.com/gdpr |
| **Prestataire SMTP** (à confirmer : Brevo ou Gmail) | Emails transactionnels + newsletter | Adresse email, contenu email | À confirmer | À vérifier |
| **OpenStreetMap / Nominatim** | Fonds de carte et géocodage | Adresse IP du visiteur (tuiles), texte d'adresse recherchée | UE (serveurs publics) | Service public |
| **Unsplash** | Images d'illustration | Adresse IP du visiteur | USA | — |
| **Sentry** (si SENTRY_DSN défini) | Suivi des erreurs | Traces techniques, identifiant utilisateur | Selon la région du projet Sentry | DPA Sentry |
| **Let's Encrypt** | Certificats SSL | Nom de domaine uniquement | USA | Service public gratuit |

---

## Droits des personnes — implémentation technique

| Droit | Article RGPD | Route API | Implémentation |
|---|---|---|---|
| Accès | Art. 15 | `GET /api/users/profile` | Consultation profil complet |
| Export | Art. 15 + 20 | `GET /api/users/profile/export` | Export JSON machine-readable (toutes données) |
| Rectification | Art. 16 | `PUT /api/users/profile` | Modification profil en ligne |
| Effacement | Art. 17 | `DELETE /api/users/profile` (+ section « Mes données ») | Suppression définitive ; contenus exigeant un auteur rattachés au compte « Utilisateur supprimé » ; fichiers Cloudinary supprimés ; audit sans email en clair |
| Opposition notifications | Art. 21 | `PUT /api/users/preferences` | Booléens de notification ; newsletter = `accepte_newsletter` |
| Retrait du consentement newsletter | Art. 7.3 | `GET/POST /api/users/newsletter/unsubscribe` | Lien signé HMAC dans chaque email, sans connexion |
| Confidentialité profil | Art. 21 | `PUT /api/users/privacy` | profil_public, email_public, telephone_public |

---

## Historique des modifications

| Date | Modification | Auteur |
|---|---|---|
| 12 avril 2026 | Création du registre (9 traitements) | DPO Tala DZ |
| 6 octobre 2026 | Mise en conformité avec le code : effacement, export, désinscription newsletter, logs, sous-traitants, traitements 10 à 13 | Audit V3 |
