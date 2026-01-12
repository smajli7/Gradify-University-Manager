import { gql } from 'apollo-angular';

/**
 * GraphQL Queries für Studiengänge und Module
 */

// Alle Studiengänge (optional gefiltert nach Mandant)
export const GET_STUDIENGAENGE = gql`
  query GetStudiengaenge($mandantId: ID) {
    studiengaenge(mandantId: $mandantId) {
      id
      name
      kuerzel
      abschlussart
      regelstudienzeit
      gesamtEcts
      studienvariante
      aktiv
    }
  }
`;

// Einzelner Studiengang mit Modulen
export const GET_STUDIENGANG = gql`
  query GetStudiengang($id: ID!) {
    studiengang(id: $id) {
      id
      name
      kuerzel
      abschlussart
      regelstudienzeit
      gesamtEcts
      studienvariante
      aktiv
      module {
        id
        modulNr
        name
        ects
        semester
        pruefungsform
        modultyp
        bewertungsart
      }
    }
  }
`;

// Module eines Studiengangs
export const GET_MODULE = gql`
  query GetModule($studiengangId: ID, $poId: ID) {
    module(studiengangId: $studiengangId, poId: $poId) {
      id
      modulNr
      name
      nameEn
      ects
      semester
      dauerSemester
      pruefungsform
      pruefungsdauer
      sprache
      modultyp
      bewertungsart
      gewichtung
      inGesamtnote
      vorleistung
      wahlpflichtGruppe
    }
  }
`;

// Einzelnes Modul
export const GET_MODUL = gql`
  query GetModul($id: ID!) {
    modul(id: $id) {
      id
      modulNr
      name
      nameEn
      ects
      semester
      dauerSemester
      pruefungsform
      pruefungsdauer
      sprache
      modultyp
      bewertungsart
      gewichtung
      inGesamtnote
      vorleistung
      wahlpflichtGruppe
    }
  }
`;

// Mandanten
export const GET_MANDANTEN = gql`
  query GetMandanten {
    mandanten {
      id
      name
      kuerzel
      aktiv
    }
  }
`;
