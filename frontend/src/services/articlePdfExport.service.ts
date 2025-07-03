// services/articlePdfExport.service.ts
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { Oeuvre } from '@/types/models/oeuvre.types';
import type { ArticleBlock } from '@/types/models/articles.types';

export class ArticlePdfExportService {
  /**
   * Exporter un article en PDF
   */
  async exportToPdf(
    oeuvre: Oeuvre, 
    blocks: ArticleBlock[],
    options?: {
      includeComments?: boolean;
      includeMetadata?: boolean;
      paperSize?: 'a4' | 'letter';
    }
  ) {
    const { 
      includeComments = false, 
      includeMetadata = true,
      paperSize = 'a4' 
    } = options || {};

    // Créer un nouveau document PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: paperSize
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    // Ajouter le titre
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    const titleLines = pdf.splitTextToSize(oeuvre.titre, contentWidth);
    pdf.text(titleLines, margin, yPosition);
    yPosition += titleLines.length * 10 + 10;

    // Ajouter les métadonnées si demandé
    if (includeMetadata) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      
      const articleData = oeuvre.id_type_oeuvre === 5 ? 
        oeuvre.ArticleScientifique : 
        oeuvre.Article;

      if (articleData?.auteur) {
        pdf.text(`Auteur: ${articleData.auteur}`, margin, yPosition);
        yPosition += 8;
      }

      if (oeuvre.annee_creation) {
        pdf.text(`Année: ${oeuvre.annee_creation}`, margin, yPosition);
        yPosition += 8;
      }

      if (articleData?.source || articleData?.journal) {
        pdf.text(
          `Source: ${articleData.journal || articleData.source}`, 
          margin, 
          yPosition
        );
        yPosition += 8;
      }

      yPosition += 10; // Espace avant le contenu
    }

    // Ajouter le contenu des blocs
    for (const block of blocks) {
      // Vérifier si on a besoin d'une nouvelle page
      if (yPosition > pageHeight - margin - 20) {
        pdf.addPage();
        yPosition = margin;
      }

      switch (block.type_block) {
        case 'heading':
          const level = block.metadata?.level || 2;
          pdf.setFontSize(level === 1 ? 20 : level === 2 ? 16 : 14);
          pdf.setFont('helvetica', 'bold');
          
          const headingLines = pdf.splitTextToSize(block.contenu || '', contentWidth);
          pdf.text(headingLines, margin, yPosition);
          yPosition += headingLines.length * (level === 1 ? 9 : level === 2 ? 7 : 6) + 8;
          break;

        case 'text':
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'normal');
          
          const textLines = pdf.splitTextToSize(block.contenu || '', contentWidth);
          pdf.text(textLines, margin, yPosition);
          yPosition += textLines.length * 6 + 6;
          break;

        case 'citation':
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'italic');
          pdf.setTextColor(100);
          
          const quoteLines = pdf.splitTextToSize(block.contenu || '', contentWidth - 10);
          pdf.text(quoteLines, margin + 10, yPosition);
          yPosition += quoteLines.length * 6;
          
          if (block.metadata?.author) {
            pdf.setFontSize(10);
            pdf.text(`— ${block.metadata.author}`, margin + 10, yPosition + 4);
            yPosition += 10;
          }
          
          pdf.setTextColor(0);
          yPosition += 6;
          break;

        case 'list':
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'normal');
          
          if (block.contenu_json && Array.isArray(block.contenu_json)) {
            block.contenu_json.forEach((item: string, index: number) => {
              const bullet = block.metadata?.listType === 'ordered' ? 
                `${index + 1}.` : '•';
              
              const itemLines = pdf.splitTextToSize(item, contentWidth - 10);
              pdf.text(bullet, margin, yPosition);
              pdf.text(itemLines, margin + 10, yPosition);
              yPosition += itemLines.length * 6 + 4;
            });
          }
          yPosition += 6;
          break;

        case 'separator':
          pdf.setDrawColor(200);
          pdf.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 10;
          break;

        case 'image':
          // Pour les images, on pourrait les inclure si elles sont en base64
          // ou ajouter un placeholder
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'italic');
          pdf.text('[Image]', margin, yPosition);
          if (block.metadata?.caption) {
            const captionLines = pdf.splitTextToSize(
              block.metadata.caption, 
              contentWidth
            );
            pdf.text(captionLines, margin, yPosition + 6);
            yPosition += captionLines.length * 5;
          }
          yPosition += 10;
          break;

        // Ajouter d'autres types de blocs selon les besoins
      }
    }

    // Ajouter le pied de page avec numéro de page
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(
        `Page ${i} / ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Sauvegarder le PDF
    const filename = `${oeuvre.titre.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
    pdf.save(filename);
  }

  /**
   * Alternative : Exporter en utilisant la mise en page HTML
   */
  async exportFromHtml(elementId: string, filename: string) {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
      // Capturer l'élément en canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Créer le PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // Ajouter l'image au PDF, page par page si nécessaire
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.95),
        'JPEG',
        0,
        position,
        imgWidth,
        imgHeight
      );
      heightLeft -= 297; // A4 height in mm

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(
          canvas.toDataURL('image/jpeg', 0.95),
          'JPEG',
          0,
          position,
          imgWidth,
          imgHeight
        );
        heightLeft -= 297;
      }

      pdf.save(filename);
    } catch (error) {
      console.error('Erreur export PDF:', error);
      throw error;
    }
  }
}

// Export singleton
export const articlePdfExportService = new ArticlePdfExportService();

// Utilisation dans ArticleViewPage :
/*
import { articlePdfExportService } from '@/services/articlePdfExport.service';

const handleDownloadPdf = async () => {
  try {
    await articlePdfExportService.exportToPdf(oeuvre, blocks, {
      includeMetadata: true,
      includeComments: false
    });
  } catch (error) {
    console.error('Erreur export PDF:', error);
    alert('Erreur lors de l\'export PDF');
  }
};

// Ou pour exporter depuis le HTML :
const handleDownloadPdfFromHtml = async () => {
  try {
    await articlePdfExportService.exportFromHtml(
      'article-content',
      `${oeuvre.titre}.pdf`
    );
  } catch (error) {
    console.error('Erreur export PDF:', error);
  }
};
*/