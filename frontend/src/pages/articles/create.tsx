// Dans vos routes (pages/articles/create.tsx)
import ArticleEditor from '@/components/article/ArticleEditor';
import { useNavigate } from 'react-router-dom';

export default function CreateArticle() {
  const navigate = useNavigate();
  
  return (
    <ArticleEditor 
      onBack={() => navigate('/articles')}
      onSave={(data) => {
        // Redirection après création
        if (data?.article?.id_oeuvre) {
          navigate(`/articles/${data.article.id_oeuvre}`);
        }
      }}
    />
  );
}