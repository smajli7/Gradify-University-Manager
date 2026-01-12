/**
 * Program (Studiengang) Types - entspricht gradify-studiengang-service GraphQL Schema
 */

export interface Mandant {
  id: string;
  name: string;
  kuerzel: string;
  aktiv: boolean;
  studiengaenge?: Studiengang[];
}

export interface Studiengang {
  id: string;
  name: string;
  kuerzel: string;
  abschlussart: Abschlussart;
  regelstudienzeit: number;
  gesamtEcts: number;
  studienvariante: Studienvariante;
  aktiv: boolean;
  mandant?: Mandant;
  module?: Modul[];
}

export interface Modul {
  id: string;
  modulNr: string;
  name: string;
  nameEn?: string;
  ects: number;
  semester: string;
  dauerSemester: number;
  pruefungsform: Pruefungsform;
  pruefungsdauer?: string;
  sprache: Sprache;
  modultyp: Modultyp;
  bewertungsart: Bewertungsart;
  gewichtung: number;
  inGesamtnote: boolean;
  vorleistung?: string;
  wahlpflichtGruppe?: string;
}

export interface Einschreibung {
  id: string;
  studentId: string;
  studiengangId: string;
  poId?: string;
  semester: number;
  immatrikuliertAm: string;
  exmatrikuliertAm?: string;
  status: EinschreibungStatus;
}

// Enums
export enum Abschlussart {
  BACHELOR = 'BACHELOR',
  MASTER = 'MASTER'
}

export enum Studienvariante {
  ALLGEMEIN = 'ALLGEMEIN',
  DUAL = 'DUAL'
}

export enum Pruefungsform {
  KLAUSUR = 'KLAUSUR',
  HAUSARBEIT = 'HAUSARBEIT',
  MUENDLICH = 'MUENDLICH',
  PROJEKT = 'PROJEKT',
  PORTFOLIO = 'PORTFOLIO',
  PRAESENTATION = 'PRAESENTATION',
  PRAXISBERICHT = 'PRAXISBERICHT'
}

export enum Sprache {
  DEUTSCH = 'DEUTSCH',
  ENGLISCH = 'ENGLISCH'
}

export enum Modultyp {
  PFLICHT = 'PFLICHT',
  WAHLPFLICHT = 'WAHLPFLICHT',
  ZUSATZ = 'ZUSATZ'
}

export enum Bewertungsart {
  NOTE = 'NOTE',
  BESTANDEN_NICHT_BESTANDEN = 'BESTANDEN_NICHT_BESTANDEN'
}

export enum EinschreibungStatus {
  AKTIV = 'AKTIV',
  ABGESCHLOSSEN = 'ABGESCHLOSSEN',
  ABGEBROCHEN = 'ABGEBROCHEN'
}
