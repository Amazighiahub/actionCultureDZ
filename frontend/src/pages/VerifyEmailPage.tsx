import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { authService } from '@/services/auth.service';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';


const VerifyEmailPage = () => {
    // Hooks pour la navigation et les paramètres d'URL
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    // États pour gérer l'affichage
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Vérification de votre compte en cours...');

    useEffect(() => {
        // S'exécute une seule fois au chargement de la page
        if (!token) {
            setStatus('error');
            setMessage("Aucun jeton de vérification n'a été fourni.");
            return;
        }

        const handleVerification = async () => {
            try {
                const response = await authService.verifyEmail(token);

                if (response.success) {
                    setStatus('success');
                    setMessage('Votre compte a été vérifié avec succès ! Redirection en cours...');
                    
                    // Rediriger l'utilisateur vers son tableau de bord après 3 secondes
                    setTimeout(() => {
                        navigate('/');
                    }, 3000);

                } else {
                    setStatus('error');
                    setMessage(response.error || 'Le jeton est invalide ou a expiré.');
                }
            } catch (error: any) {
                setStatus('error');
                setMessage(error.response?.data?.error || "Impossible de communiquer avec le serveur.");
            }
        };

        handleVerification();
    }, [token, navigate]);


    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="p-8 max-w-md w-full">
                {status === 'loading' && (
                    <div className="flex flex-col items-center text-center">
                        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                        <p className="text-lg font-medium">{message}</p>
                    </div>
                )}

                {status === 'success' && (
                    <Alert variant="default" className="bg-green-100 border-green-400 text-green-800">
                        <AlertTitle className="font-bold">Vérification Réussie !</AlertTitle>
                        <AlertDescription>{message}</AlertDescription>
                    </Alert>
                )}

                {status === 'error' && (
                    <Alert variant="destructive">
                        <AlertTitle className="font-bold">Erreur lors de la vérification</AlertTitle>
                        <AlertDescription>{message}</AlertDescription>
                        <Button asChild className="mt-4">
                            <Link to="/">Retour à la page d'accueil</Link>
                        </Button>
                    </Alert>
                )}
            </div>
        </div>
    );
};

export default VerifyEmailPage;