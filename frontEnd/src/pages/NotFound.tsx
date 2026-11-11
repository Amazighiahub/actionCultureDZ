import { useTranslation } from "react-i18next";
import ContenuIntrouvable from "@/components/shared/ContenuIntrouvable";

/** Adresse inconnue : même page « introuvable » que les fiches (audit V11 UX-7) */
const NotFound = () => {
  const { t } = useTranslation();
  return (
    <ContenuIntrouvable
      grand404
      titre={t("notfound.oops_page_not", "Page introuvable")}
      message={t("notfound.description", "La page que vous recherchez n'existe pas ou a été déplacée.")}
      lienListe={{ to: "/", libelle: t("notfound.return_home", "Retour à l'accueil") }}
    />
  );
};

export default NotFound;
