#!/bin/bash
# ============================================================
# Script de vérification des fichiers dupliqués (casse uniquement)
# ============================================================
# Détecte les chemins qui diffèrent uniquement par la casse
# (ex: components/ui/ vs components/UI/) — problématique sous Linux/Docker
#
# Usage: bash scripts/check-duplicates.sh
# ============================================================

echo ""
echo "============================================"
echo "  Vérification des doublons (casse)"
echo "============================================"
echo ""

# Lister tous les fichiers Git, normaliser en minuscules, trouver les doublons
DUPLICATES=$(git ls-files | awk '
{
  key = tolower($0)
  count[key]++
  paths[key] = paths[key] ? paths[key] "\n  - " $0 : "  - " $0
}
END {
  for (k in count) {
    if (count[k] > 1) {
      print "DOUBLON:", k
      print paths[k]
      print ""
    }
  }
}
')

if [ -z "$DUPLICATES" ]; then
  echo "✅ Aucun doublon détecté (chemins identiques à la casse près)"
  echo ""
  exit 0
else
  echo "⚠️  Doublons détectés (risque sous Linux/Docker) :"
  echo ""
  echo "$DUPLICATES"
  exit 1
fi
