import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/UI/button";
import { Card, CardContent } from "@/components/UI/card";
import { Home, ArrowLeft, Search } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container flex items-center justify-center py-12">
        <Card className="max-w-lg w-full text-center shadow-lg">
          <CardContent className="pt-12 pb-8 px-8">
            {/* Illustration 404 */}
            <div className="relative mb-8">
              <span className="text-[120px] sm:text-[150px] font-bold text-primary/10 leading-none select-none">
                404
              </span>
              <div className="absolute inset-0 flex items-center justify-center">
                <Search className="h-16 w-16 sm:h-20 sm:w-20 text-primary/60" />
              </div>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold font-serif mb-4">
              {t("notfound.oops_page_not", "Page introuvable")}
            </h1>
            
            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
              {t("notfound.description", "La page que vous recherchez n'existe pas ou a été déplacée.")}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                variant="outline" 
                onClick={() => window.history.back()}
                className="min-h-[44px]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("common.back", "Retour")}
              </Button>
              
              <Link to="/">
                <Button className="w-full sm:w-auto min-h-[44px]">
                  <Home className="h-4 w-4 mr-2" />
                  {t("notfound.return_home", "Retour à l'accueil")}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
      
      <Footer />
    </div>
  );
};

export default NotFound;