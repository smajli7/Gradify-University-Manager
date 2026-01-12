/**
 * User & Student Types - entspricht gradify-user-service GraphQL Schema
 */

export interface User {
  id: string;
  benutzername: string;
  email: string;
  vorname: string;
  nachname: string;
  mandantId: string;
  aktiv: boolean;
  rollen: Role[];
  student?: Student;
  letzterLogin?: string;
  erstelltAm: string;
}

export interface Student {
  id: string;
  benutzer?: User;
  matrikelnummer: string;
  vorname: string;
  nachname: string;
  email: string;
  geburtsdatum?: string;
  status: StudentStatus;
}

export interface Role {
  id: string;
  name: string;
  beschreibung?: string;
}

export enum StudentStatus {
  AKTIV = 'AKTIV',
  BEURLAUBT = 'BEURLAUBT',
  EXMATRIKULIERT = 'EXMATRIKULIERT'
}

// Input Types für Mutations
export interface CreateUserInput {
  benutzername: string;
  email: string;
  passwort: string;
  vorname: string;
  nachname: string;
  mandantId: string;
  rollenIds?: string[];
}

export interface UpdateUserInput {
  email?: string;
  vorname?: string;
  nachname?: string;
  aktiv?: boolean;
}

export interface CreateStudentInput {
  benutzerId: string;
  matrikelnummer: string;
  geburtsdatum?: string;
}

export interface UpdateStudentInput {
  geburtsdatum?: string;
  status?: StudentStatus;
}
