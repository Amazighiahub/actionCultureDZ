// utils/evenement-mapper.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Evenement } from '@/types/models/evenement.types';

/**
 * Mapper pour convertir les données API en type Evenement complet
 */
export function mapApiToEvenement(data: any): Evenement {
  return {
    // Propriétés requises
    id_evenement: data.id_evenement || data.id,
    nom_evenement: data.nom_evenement || data.nom || 'Sans nom',
    id_lieu: data.id_lieu || data.lieu_id || 0,
    id_user: data.id_user || data.user_id || 0,
    id_type_evenement: data.id_type_evenement || data.type_id || 0,
    statut: data.statut || 'planifie',
    tarif: data.tarif ?? data.prix ?? 0,
    inscription_requise: data.inscription_requise ?? true,
    certificat_delivre: data.certificat_delivre ?? false,
    date_creation: data.date_creation || data.created_at || new Date().toISOString(),
    date_modification: data.date_modification || data.updated_at || new Date().toISOString(),
    
    // Propriétés optionnelles
    description: data.description,
    date_debut: data.date_debut,
    date_fin: data.date_fin,
    contact_email: data.contact_email,
    contact_telephone: data.contact_telephone,
    image_url: data.image_url || data.image,
    capacite_max: data.capacite_max,
    age_minimum: data.age_minimum,
    accessibilite: data.accessibilite,
    date_limite_inscription: data.date_limite_inscription,
    
    // Relations
    TypeEvenement: data.TypeEvenement || data.type_evenement,
    Lieu: data.Lieu || data.lieu,
    Organisateur: data.Organisateur || data.organisateur || data.user,
    
    // Vous pouvez ajouter d'autres mappings selon vos besoins
  };
}

/**
 * Mapper pour un tableau d'événements
 */
export function mapApiToEvenements(data: any[]): Evenement[] {
  return data.map(mapApiToEvenement);
}