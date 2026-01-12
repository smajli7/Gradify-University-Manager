import { gql } from 'apollo-angular';

/**
 * GraphQL Queries für Noten
 */

// Noten eines Studenten (via Einschreibung)
export const GET_NOTEN_BY_STUDENT = gql`
  query GetNotenByStudent($einschreibungId: ID!) {
    notenByStudent(einschreibungId: $einschreibungId) {
      id
      einschreibungId
      modulId
      noteWert
      bestanden
      versuch
      pruefungsdatum
      status
      kommentar
      erfasstAm
      validiertAm
    }
    durchschnittsnote(einschreibungId: $einschreibungId)
  }
`;

// Noten eines Moduls (für Dozenten/Admin)
export const GET_NOTEN_BY_MODUL = gql`
  query GetNotenByModul($modulId: ID!) {
    notenByModul(modulId: $modulId) {
      id
      einschreibungId
      modulId
      noteWert
      bestanden
      versuch
      pruefungsdatum
      status
      erfasstAm
    }
  }
`;

// Einzelne Note
export const GET_NOTE = gql`
  query GetNote($id: ID!) {
    note(id: $id) {
      id
      einschreibungId
      modulId
      erfasstVon
      noteWert
      bestanden
      versuch
      pruefungsdatum
      status
      kommentar
      erfasstAm
      validiertAm
      validiertVon
    }
  }
`;

// Statistiken
export const GET_STUDENT_STATS = gql`
  query GetStudentStats($einschreibungId: ID!) {
    durchschnittsnote(einschreibungId: $einschreibungId)
    bestandeneModule(einschreibungId: $einschreibungId)
  }
`;
