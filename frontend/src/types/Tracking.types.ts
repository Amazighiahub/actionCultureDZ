// Tracking.types.ts

export interface QRCode {
  idQrCode: number;
  idLieu: number;
  codeUnique: string;
  urlDestination: string;
  qrImageUrl?: string;
  actif?: boolean;
  dateCreation?: Date;
  dateExpiration?: Date;
  // Relations
  lieu?: any; // From Geographie types
  scans?: QRScan[];
}

export interface QRScan {
  idScan: number;
  idQrCode: number;
  idUser?: number;
  ipAddress: string;
  userAgent?: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  pays?: string;
  ville?: string;
  latitude?: number;
  longitude?: number;
  isUnique?: boolean;
  dateScan?: Date;
  // Relations
  qrCode?: QRCode;
  user?: any; // From User types
}