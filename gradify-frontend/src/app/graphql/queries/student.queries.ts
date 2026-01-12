import { gql } from 'apollo-angular';

/**
 * GraphQL Queries für Studenten
 */

// Alle Studenten abrufen (Liste)
export const GET_STUDENTS = gql`
  query GetStudents {
    students {
      id
      matrikelnummer
      vorname
      nachname
      email
      status
    }
  }
`;

// Einzelnen Studenten mit Details abrufen
export const GET_STUDENT = gql`
  query GetStudent($id: ID!) {
    student(id: $id) {
      id
      matrikelnummer
      vorname
      nachname
      email
      geburtsdatum
      status
      benutzer {
        id
        benutzername
        email
        aktiv
        rollen {
          id
          name
        }
        letzterLogin
        erstelltAm
      }
    }
  }
`;

// Student nach Matrikelnummer suchen
export const GET_STUDENT_BY_MATRIKEL = gql`
  query GetStudentByMatrikel($matrikelnummer: String!) {
    studentByMatrikel(matrikelnummer: $matrikelnummer) {
      id
      matrikelnummer
      vorname
      nachname
      email
      status
    }
  }
`;

// Einschreibungen eines Studenten
export const GET_EINSCHREIBUNGEN = gql`
  query GetEinschreibungen($studentId: ID!) {
    einschreibungen(studentId: $studentId) {
      id
      studentId
      studiengangId
      poId
      semester
      immatrikuliertAm
      exmatrikuliertAm
      status
    }
  }
`;
