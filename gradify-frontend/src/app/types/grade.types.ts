/**
 * Grade (Note) Types - entspricht gradify-noten-service GraphQL Schema
 */

export interface Note {
  id: string;
  einschreibungId: string;
  modulId: string;
  erfasstVon: string;
  noteWert?: number;
  bestanden?: boolean;
  versuch: number;
  pruefungsdatum: string;
  status: NoteStatus;
  kommentar?: string;
  erfasstAm: string;
  validiertAm?: string;
  validiertVon?: string;
}

export enum NoteStatus {
  ERFASST = 'ERFASST',
  VALIDIERT = 'VALIDIERT',
  FREIGEGEBEN = 'FREIGEGEBEN'
}

// Input Types für Mutations
export interface CreateNoteInput {
  einschreibungId: string;
  modulId: string;
  erfasstVon: string;
  noteWert?: number;
  bestanden?: boolean;
  versuch: number;
  pruefungsdatum: string;
  kommentar?: string;
}

export interface UpdateNoteInput {
  noteWert?: number;
  bestanden?: boolean;
  versuch?: number;
  pruefungsdatum?: string;
  kommentar?: string;
}

// Erweiterte Note mit Modul-Informationen (für UI)
export interface NoteWithModul extends Note {
  modul?: {
    id: string;
    modulNr: string;
    name: string;
    ects: number;
  };
}
