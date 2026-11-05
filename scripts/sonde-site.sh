#!/usr/bin/env bash
# ============================================================================
# Le site répond-il, vu de l'extérieur, comme pour un visiteur ?
# Lancé toutes les 15 minutes par .github/workflows/surveillance.yml (aucun accès au serveur).
#
#   scripts/sonde-site.sh [adresse]         défaut : https://taladz.com
#
# Contrôles : page d'accueil, une page du site, santé de l'API (base de données comprise),
# lecture réelle de données, temps de réponse, date de fin du certificat.
# Une panne doit durer : chaque contrôle en échec est refait après une attente, pour ne pas
# alerter sur une mise en ligne ou une coupure de quelques secondes.
#
# Code retour : 0 tout va bien, 1 panne confirmée. Le détail est écrit dans le fichier
# $SONDE_RAPPORT s'il est défini (repris dans l'alerte). Rien de secret n'y figure.
# Variables : SONDE_ESSAIS (3), SONDE_ATTENTE en secondes (60), SONDE_LENT en secondes (5),
#             SONDE_CERTIFICAT_JOURS (14)
# ============================================================================
set -uo pipefail

BASE="${1:-https://taladz.com}"
BASE="${BASE%/}"
ESSAIS="${SONDE_ESSAIS:-3}"
ATTENTE="${SONDE_ATTENTE:-60}"
LENT="${SONDE_LENT:-5}"
CERT_JOURS="${SONDE_CERTIFICAT_JOURS:-14}"
RAPPORT="${SONDE_RAPPORT:-}"
AGENT="TalaDZ-surveillance/1.0"

problemes=()
lignes=()

# controle <nom> <chemin> [texte attendu dans la réponse]
controle() {
  local nom="$1" chemin="$2" attendu="${3:-}" essai corps resultat code temps detail=""
  corps="$(mktemp)"
  for ((essai = 1; essai <= ESSAIS; essai++)); do
    resultat="$(curl -sS -L -o "$corps" -w '%{http_code} %{time_total}' --max-time 30 -A "$AGENT" "$BASE$chemin" 2>/dev/null)" || resultat="000 30"
    code="${resultat%% *}"
    temps="${resultat##* }"
    detail=""
    if [ "$code" != "200" ]; then
      detail="code $code"
    elif [ -n "$attendu" ] && ! grep -q -- "$attendu" "$corps"; then
      detail="réponse inattendue"
    fi
    [ -z "$detail" ] && break
    [ "$essai" -lt "$ESSAIS" ] && sleep "$ATTENTE"
  done
  rm -f -- "$corps"
  if [ -n "$detail" ]; then
    problemes+=("$nom : $detail, après $ESSAIS essais")
    lignes+=("| $nom | EN PANNE ($detail) | $temps s |")
  elif awk -v t="$temps" -v l="$LENT" 'BEGIN { exit !(t > l) }'; then
    lignes+=("| $nom | lent | $temps s |")
  else
    lignes+=("| $nom | OK | $temps s |")
  fi
}

controle "Page d'accueil" "/" 'id="root"'
controle "Page Artisanat" "/artisanat" 'id="root"'
controle "Santé de l'API et de la base" "/api/health" '"status":"OK"'
controle "Lecture des œuvres" "/api/oeuvres?limit=1" '"success":true'

# Certificat : un renouvellement en panne se voit des semaines avant l'expiration
case "$BASE" in
  https://*)
    hote="${BASE#https://}"; hote="${hote%%/*}"
    fin="$(echo | openssl s_client -servername "$hote" -connect "$hote:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)"
    if [ -z "$fin" ]; then
      problemes+=("Certificat : illisible")
      lignes+=("| Certificat | ILLISIBLE | |")
    else
      jours=$(( ( $(date -d "$fin" +%s) - $(date +%s) ) / 86400 ))
      if [ "$jours" -lt "$CERT_JOURS" ]; then
        problemes+=("Certificat : expire dans $jours jours")
        lignes+=("| Certificat | EXPIRE dans $jours jours | |")
      else
        lignes+=("| Certificat | OK, $jours jours restants | |")
      fi
    fi
    ;;
esac

{
  echo "Contrôle de $BASE le $(date -u '+%Y-%m-%d à %H:%M') (heure UTC)"
  echo
  echo "| Contrôle | État | Temps |"
  echo "|---|---|---|"
  printf '%s\n' "${lignes[@]}"
} | tee "${RAPPORT:-/dev/null}"

if [ "${#problemes[@]}" -gt 0 ]; then
  printf 'PANNE : %s\n' "${problemes[@]}" >&2
  exit 1
fi
exit 0
