// services/programme.service.ts - Service de gestion des programmes d'événements

import { apiService, ApiResponse } from './api.service';
import { API_ENDPOINTS } from '../config/api';
import { 
  Programme, 
  ProgrammeStatut,
  TypeActivite,
  NiveauRequis,
  Intervenant,
  ProgrammeIntervenant
} from '../types/Evenement.types';

export interface ProgrammeFilters {
  statut?: ProgrammeStatut;
  typeActivite?: TypeActivite;
  niveauRequis?: NiveauRequis;
  dateDebut?: string;
  dateFin?: string;
  avecIntervenant?: boolean;
  diffusionLive?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface CreateProgrammeData {
  titre: string;
  description?: string;
  idLieu?: number;
  heureDebut?: string;
  heureFin?: string;
  lieuSpecifique?: string;
  ordre?: number;
  typeActivite?: TypeActivite;
  dureeEstimee?: number;
  nbParticipantsMax?: number;
  materielRequis?: string[];
  niveauRequis?: NiveauRequis;
  languePrincipale?: string;
  traductionDisponible?: boolean;
  enregistrementAutorise?: boolean;
  diffusionLive?: boolean;
  supportNumerique?: boolean;
  intervenants?: Array<{
    idIntervenant: number;
    roleIntervenant?: string;
    sujetIntervention?: string;
  }>;
}

export interface UpdateProgrammeData extends Partial<CreateProgrammeData> {
  statut?: ProgrammeStatut;
  notesOrganisateur?: string;
}

export interface ReorderData {
  order: Array<{
    idProgramme: number;
    ordre: number;
  }>;
}

export interface ProgrammeExportFormat {
  format: 'pdf' | 'excel' | 'ical';
  includeIntervenants?: boolean;
  includeParticipants?: boolean;
  includeLogistique?: boolean;
}

export class ProgrammeService {
  /**
   * RÉCUPÉRATION DES PROGRAMMES
   */

  /**
   * Récupérer les programmes d'un événement
   */
  static async getByEvent(
    evenementId: number,
    filters?: ProgrammeFilters
  ): Promise<ApiResponse<Programme[]>> {
    return apiService.get<Programme[]>(
      API_ENDPOINTS.programmes.byEvent(evenementId),
      filters
    );
  }

  /**
   * Récupérer le détail d'un programme
   */
  static async getDetail(id: number): Promise<ApiResponse<Programme>> {
    return apiService.get<Programme>(
      API_ENDPOINTS.programmes.detail(id)
    );
  }

  /**
   * GESTION DES PROGRAMMES
   */

  /**
   * Créer un nouveau programme
   */
  static async create(
    evenementId: number,
    data: CreateProgrammeData
  ): Promise<ApiResponse<Programme>> {
    return apiService.post<Programme>(
      API_ENDPOINTS.programmes.create(evenementId),
      data
    );
  }

  /**
   * Mettre à jour un programme
   */
  static async update(
    id: number,
    data: UpdateProgrammeData
  ): Promise<ApiResponse<Programme>> {
    return apiService.put<Programme>(
      API_ENDPOINTS.programmes.update(id),
      data
    );
  }

  /**
   * Supprimer un programme
   */
  static async delete(id: number): Promise<ApiResponse<void>> {
    return apiService.delete<void>(
      API_ENDPOINTS.programmes.delete(id)
    );
  }

  /**
   * Réordonner les programmes
   */
  static async reorder(
    evenementId: number,
    order: number[]
  ): Promise<ApiResponse<any>> {
    return apiService.put<any>(
      API_ENDPOINTS.programmes.reorder(evenementId),
      { order }
    );
  }

  /**
   * Dupliquer un programme
   */
  static async duplicate(id: number): Promise<ApiResponse<Programme>> {
    return apiService.post<Programme>(
      API_ENDPOINTS.programmes.duplicate(id)
    );
  }

  /**
   * Mettre à jour le statut
   */
  static async updateStatus(
    id: number,
    status: ProgrammeStatut
  ): Promise<ApiResponse<Programme>> {
    return apiService.patch<Programme>(
      API_ENDPOINTS.programmes.updateStatus(id),
      { status }
    );
  }

  /**
   * EXPORT
   */

  /**
   * Exporter le programme d'un événement
   */
  static async export(
    evenementId: number,
    options?: ProgrammeExportFormat
  ): Promise<void> {
    const params = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        params.append(key, String(value));
      });
    }

    const url = `${API_ENDPOINTS.programmes.export(evenementId)}?${params.toString()}`;
    const filename = `programme-evenement-${evenementId}.${options?.format || 'pdf'}`;
    
    // Télécharger le fichier directement
    window.open(apiService.getBaseURL() + url, '_blank');
  }

  /**
   * HELPERS ET UTILITAIRES
   */

  /**
   * Grouper les programmes par jour
   */
  static groupByDay(programmes: Programme[]): Record<string, Programme[]> {
    const groups: Record<string, Programme[]> = {};
    
    programmes.forEach(programme => {
      if (!programme.heureDebut) return;
      
      // Extraire la date (supposant format "YYYY-MM-DD HH:mm:ss")
      const date = programme.heureDebut.split(' ')[0];
      
      if (!groups[date]) {
        groups[date] = [];
      }
      
      groups[date].push(programme);
    });
    
    // Trier les programmes dans chaque jour
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => {
        const timeA = a.heureDebut || '';
        const timeB = b.heureDebut || '';
        return timeA.localeCompare(timeB);
      });
    });
    
    return groups;
  }

  /**
   * Calculer la durée totale
   */
  static calculateTotalDuration(programmes: Programme[]): number {
    return programmes.reduce((total, prog) => {
      return total + (prog.dureeEstimee || 0);
    }, 0);
  }

  /**
   * Formater l'heure
   */
  static formatTime(time?: string): string {
    if (!time) return '';
    
    // Supposant format "YYYY-MM-DD HH:mm:ss" ou "HH:mm"
    const parts = time.split(' ');
    const timePart = parts.length > 1 ? parts[1] : parts[0];
    
    return timePart.substring(0, 5); // HH:mm
  }

  /**
   * Formater la plage horaire
   */
  static formatTimeRange(programme: Programme): string {
    const start = this.formatTime(programme.heureDebut);
    const end = this.formatTime(programme.heureFin);
    
    if (!start) return '';
    if (!end) return start;
    
    return `${start} - ${end}`;
  }

  /**
   * Obtenir l'icône selon le type d'activité
   */
  static getActivityIcon(type?: TypeActivite): string {
    const icons: Record<TypeActivite, string> = {
      'conference': '🎤',
      'atelier': '🔨',
      'performance': '🎭',
      'projection': '🎬',
      'exposition': '🖼️',
      'concert': '🎵',
      'autre': '📌'
    };
    return icons[type as TypeActivite] || '📌';
  }

  /**
   * Obtenir la couleur selon le type d'activité
   */
  static getActivityColor(type?: TypeActivite): string {
    const colors: Record<TypeActivite, string> = {
      'conference': '#2196f3',
      'atelier': '#4caf50',
      'performance': '#ff9800',
      'projection': '#9c27b0',
      'exposition': '#00bcd4',
      'concert': '#f44336',
      'autre': '#607d8b'
    };
    return colors[type as TypeActivite] || '#607d8b';
  }

  /**
   * Obtenir le label du niveau
   */
  static getNiveauLabel(niveau?: NiveauRequis): string {
    const labels: Record<NiveauRequis, string> = {
      'debutant': 'Débutant',
      'intermediaire': 'Intermédiaire',
      'avance': 'Avancé',
      'expert': 'Expert',
      'tous_niveaux': 'Tous niveaux'
    };
    return labels[niveau as NiveauRequis] || 'Tous niveaux';
  }

  /**
   * Obtenir le label du statut
   */
  static getStatutLabel(statut?: ProgrammeStatut): string {
    const labels: Record<ProgrammeStatut, string> = {
      'planifie': 'Planifié',
      'en_cours': 'En cours',
      'termine': 'Terminé',
      'annule': 'Annulé'
    };
    return labels[statut as ProgrammeStatut] || 'Planifié';
  }

  /**
   * Obtenir la couleur du statut
   */
  static getStatutColor(statut?: ProgrammeStatut): string {
    const colors: Record<ProgrammeStatut, string> = {
      'planifie': '#2196f3',
      'en_cours': '#4caf50',
      'termine': '#9e9e9e',
      'annule': '#f44336'
    };
    return colors[statut as ProgrammeStatut] || '#2196f3';
  }

  /**
   * Vérifier si un programme est en cours
   */
  static isEnCours(programme: Programme): boolean {
    if (programme.statut === 'en_cours') return true;
    
    if (!programme.heureDebut || !programme.heureFin) return false;
    
    const now = new Date();
    const debut = new Date(programme.heureDebut);
    const fin = new Date(programme.heureFin);
    
    return now >= debut && now <= fin;
  }

  /**
   * Vérifier si un programme est à venir
   */
  static isAVenir(programme: Programme): boolean {
    if (programme.statut === 'termine' || programme.statut === 'annule') return false;
    
    if (!programme.heureDebut) return false;
    
    const now = new Date();
    const debut = new Date(programme.heureDebut);
    
    return debut > now;
  }

  /**
   * Vérifier si un programme est complet
   */
  static isComplet(programme: Programme): boolean {
    if (!programme.nbParticipantsMax) return false;
    
    // TODO: Vérifier le nombre actuel de participants
    // Cette info devrait venir du backend
    return false;
  }

  /**
   * Générer un résumé du programme
   */
  static getSummary(programme: Programme): string {
    const parts = [];
    
    if (programme.typeActivite) {
      parts.push(this.getActivityIcon(programme.typeActivite));
    }
    
    if (programme.dureeEstimee) {
      parts.push(`${programme.dureeEstimee} min`);
    }
    
    if (programme.niveauRequis && programme.niveauRequis !== 'tous_niveaux') {
      parts.push(this.getNiveauLabel(programme.niveauRequis));
    }
    
    if (programme.intervenants && programme.intervenants.length > 0) {
      parts.push(`${programme.intervenants.length} intervenant(s)`);
    }
    
    if (programme.diffusionLive) {
      parts.push('🔴 Live');
    }
    
    return parts.join(' • ');
  }

  /**
   * Obtenir les besoins logistiques
   */
  static getLogistique(programme: Programme): string[] {
    const besoins: string[] = [];
    
    if (programme.materielRequis) {
      besoins.push(...programme.materielRequis);
    }
    
    if (programme.traductionDisponible) {
      besoins.push('Service de traduction');
    }
    
    if (programme.enregistrementAutorise) {
      besoins.push('Équipement d\'enregistrement');
    }
    
    if (programme.diffusionLive) {
      besoins.push('Streaming en direct');
    }
    
    if (programme.supportNumerique) {
      besoins.push('Support numérique');
    }
    
    return besoins;
  }

  /**
   * Créer un planning visuel
   */
  static createVisualPlanning(programmes: Programme[]): {
    startTime: string;
    endTime: string;
    slots: Array<{
      programme: Programme;
      startPercent: number;
      heightPercent: number;
    }>;
  } {
    // Trouver les heures min et max
    let minTime = '23:59';
    let maxTime = '00:00';
    
    programmes.forEach(prog => {
      if (prog.heureDebut) {
        const time = this.formatTime(prog.heureDebut);
        if (time < minTime) minTime = time;
      }
      if (prog.heureFin) {
        const time = this.formatTime(prog.heureFin);
        if (time > maxTime) maxTime = time;
      }
    });
    
    // Convertir en minutes depuis minuit
    const minMinutes = this.timeToMinutes(minTime);
    const maxMinutes = this.timeToMinutes(maxTime);
    const totalMinutes = maxMinutes - minMinutes;
    
    // Créer les slots
    const slots = programmes.map(prog => {
      const startTime = this.formatTime(prog.heureDebut);
      const endTime = this.formatTime(prog.heureFin);
      
      const startMinutes = this.timeToMinutes(startTime) - minMinutes;
      const endMinutes = this.timeToMinutes(endTime) - minMinutes;
      
      return {
        programme: prog,
        startPercent: (startMinutes / totalMinutes) * 100,
        heightPercent: ((endMinutes - startMinutes) / totalMinutes) * 100
      };
    });
    
    return {
      startTime: minTime,
      endTime: maxTime,
      slots
    };
  }

  private static timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Exporter en format iCal
   */
  static exportToICal(programmes: Programme[], eventName: string): string {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Action Culture Algérie//Programme//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];
    
    programmes.forEach(prog => {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${prog.idProgramme}@actionculture.dz`);
      lines.push(`SUMMARY:${this.escapeICal(prog.titre)}`);
      
      if (prog.description) {
        lines.push(`DESCRIPTION:${this.escapeICal(prog.description)}`);
      }
      
      if (prog.heureDebut) {
        const dt = new Date(prog.heureDebut);
        lines.push(`DTSTART:${this.formatICalDate(dt)}`);
      }
      
      if (prog.heureFin) {
        const dt = new Date(prog.heureFin);
        lines.push(`DTEND:${this.formatICalDate(dt)}`);
      }
      
      if (prog.lieuSpecifique || prog.lieu) {
        const location = prog.lieuSpecifique || prog.lieu?.nom || '';
        lines.push(`LOCATION:${this.escapeICal(location)}`);
      }
      
      lines.push(`CATEGORIES:${eventName}`);
      lines.push('END:VEVENT');
    });
    
    lines.push('END:VCALENDAR');
    
    return lines.join('\r\n');
  }

  private static escapeICal(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  private static formatICalDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }
}

export default ProgrammeService;