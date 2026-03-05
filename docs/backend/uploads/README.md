# Structure des Uploads

## Organisation des fichiers

- **images/** : Photos, illustrations, logos
  - Formats acceptés : JPG, PNG, GIF, WebP
  - Taille max : 5242880
  
- **documents/** : Documents texte
  - Formats acceptés : PDF, DOC, DOCX, XLS, XLSX
  - Taille max : 10485760
  
- **videos/** : Vidéos
  - Formats acceptés : MP4, WebM, MOV, AVI
  - Taille max : 104857600
  
- **temp/** : Fichiers temporaires (nettoyés automatiquement)

## Sécurité

- Les noms de fichiers sont automatiquement sécurisés
- Les types MIME sont vérifiés
- Les extensions sont validées
- Organisation par date (YYYY-MM) pour éviter trop de fichiers par dossier

## Configuration

Voir le fichier `.env` pour modifier les limites et types autorisés.
