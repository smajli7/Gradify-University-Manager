-- GU-Tenant-Daten (Goethe Uni Frankfurt)
INSERT INTO mandanten (id, name, kuerzel, aktiv) VALUES (2, 'Goethe Universitaet Frankfurt', 'GU', true) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, kuerzel = EXCLUDED.kuerzel, aktiv = EXCLUDED.aktiv;
INSERT INTO studiengaenge (id, mandant_id, name, kuerzel, abschlussart, regelstudienzeit, gesamt_ects, studienvariante, aktiv) VALUES (3, 2, 'Bioinformatik', 'BIO', 'BACHELOR', 6, 180, 'ALLGEMEIN', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO pruefungsordnungen (id, studiengang_id, version, gueltig_ab, gueltig_bis, berechnungsart) VALUES (3, 3, 'PO 2024', '2024-10-01', NULL, 'GEWICHTET') ON CONFLICT (id) DO NOTHING;
UPDATE studiengaenge SET aktuelle_po_id = 3 WHERE id = 3;
INSERT INTO module (id, po_id, modul_nr, name, ects, semester, dauer_semester, pruefungsform, sprache, modultyp, bewertungsart, gewichtung, in_gesamtnote) VALUES
(200, 3, 'BIO-01', 'Lineare Algebra und diskrete Mathematik', 9, '1', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 1.0, true),
(201, 3, 'BIO-02', 'Einführung in die praktische Informatik', 12, '1', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 1.0, true),
(202, 3, 'BIO-03', 'Struktur und Funktion der Organismen', 6, '1', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 1.0, true),
(203, 3, 'BIO-04a', 'Ring-Seminar / Einführung ins Studium', 3, '1', 1, 'PRAESENTATION', 'DEUTSCH', 'PFLICHT', 'NOTE', 1.0, true),
(204, 3, 'BIO-05', 'Analysis und numerische Mathematik', 9, '2', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 1.0, true),
(205, 3, 'BIO-06', 'Programmierung von Datenbanken', 6, '2', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 1.0, true),
(206, 3, 'BIO-07', 'Organische Chemie für Naturwissenschaftler', 8, '2', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 1.0, true),
(207, 3, 'BIO-08a', 'Grundlagen der Bioinformatik', 8, '2', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 1.0, true),
(208, 3, 'BIO-09', 'Modellierung', 8, '3', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 1.0, true),
(209, 3, 'BIO-10', 'Programmierpraktikum', 8, '3', 1, 'PROJEKT', 'DEUTSCH', 'PFLICHT', 'NOTE', 1.0, true),
(210, 3, 'BIO-11', 'Biochemie und Tierphysiologie', 6, '3', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 1.0, true),
(211, 3, 'BIO-12', 'Praktikum Organische Chemie', 9, '3', 1, 'PRAXISBERICHT', 'DEUTSCH', 'PFLICHT', 'NOTE', 1.0, true),
(212, 3, 'BIO-08b', 'Grundlagen der Bioinformatik (Praktikum)', 3, '3', 1, 'PRAXISBERICHT', 'DEUTSCH', 'PFLICHT', 'NOTE', 1.0, true),
(213, 3, 'BIO-13', 'Algorithmen und Datenstrukturen 1', 8, '4', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 1.0, true),
(214, 3, 'BIO-14', 'Molekularbiologie und Genetik', 6, '4', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 1.0, true),
(215, 3, 'BIO-16', 'Algorithmen und Modelle der Bioinformatik', 11, '4', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 1.0, true),
(216, 3, 'BIO-04b', 'Teammanagement, Softskills, Präsentationstechniken', 3, '4', 1, 'PRAESENTATION', 'DEUTSCH', 'PFLICHT', 'NOTE', 1.0, true),
(217, 3, 'BIO-17', 'Statistik für Bioinformatiker', 4, '5', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 1.0, true),
(218, 3, 'BIO-18', 'Algorithmen und Datenstrukturen 2', 8, '5', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 1.0, true),
(219, 3, 'BIO-19', 'Spezialisierung I', 6, '5', 1, 'PROJEKT', 'DEUTSCH', 'PFLICHT', 'NOTE', 1.0, true),
(220, 3, 'BIO-15', 'Neurobiologie, Zell- und Entwicklungsbiologie', 6, '5', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 1.0, true),
(221, 3, 'BIO-21', 'Strukturelle Bioinformatik', 6, '5', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 1.0, true),
(222, 3, 'BIO-20', 'Spezialisierung II', 6, '6', 1, 'PROJEKT', 'DEUTSCH', 'PFLICHT', 'NOTE', 1.0, true),
(223, 3, 'BIO-22', 'Freies Studium', 6, '6', 1, 'KLAUSUR', 'DEUTSCH', 'WAHLPFLICHT', 'NOTE', 1.0, true),
(224, 3, 'BIO-23', 'Abschlussmodul (Bachelor-Arbeit)', 15, '6', 1, 'HAUSARBEIT', 'DEUTSCH', 'PFLICHT', 'NOTE', 2.0, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO einschreibungen (id, student_id, studiengang_id, po_id, studienvariante, immatrikuliert_am, aktuelles_semester, status) VALUES
(36, 36, 3, 3, 'ALLGEMEIN', '2024-10-01', 3, 'AKTIV'),
(37, 37, 3, 3, 'ALLGEMEIN', '2024-10-01', 3, 'AKTIV'),
(38, 38, 3, 3, 'ALLGEMEIN', '2024-10-01', 2, 'AKTIV'),
(39, 39, 3, 3, 'ALLGEMEIN', '2024-10-01', 2, 'AKTIV'),
(40, 40, 3, 3, 'ALLGEMEIN', '2025-04-01', 1, 'AKTIV'),
(41, 41, 3, 3, 'ALLGEMEIN', '2025-04-01', 1, 'AKTIV'),
(42, 42, 3, 3, 'ALLGEMEIN', '2025-04-01', 1, 'AKTIV'),
(43, 43, 3, 3, 'ALLGEMEIN', '2024-10-01', 2, 'AKTIV'),
(44, 44, 3, 3, 'ALLGEMEIN', '2024-10-01', 3, 'AKTIV'),
(45, 45, 3, 3, 'ALLGEMEIN', '2025-04-01', 1, 'AKTIV')
ON CONFLICT (id) DO NOTHING;
INSERT INTO po_regelwerke (id, po_id, regel_name, beschreibung, formel, parameter_json) VALUES (3, 3, 'GEWICHTET', 'Bioinformatik Bachelor mit ECTS-Gewichtung', 'ECTS_GEWICHTET', '{"minEcts": 180, "maxVersuche": 3}') ON CONFLICT (po_id) DO NOTHING;
INSERT INTO modul_zuweisungen (id, dozent_id, modul_id) VALUES
(13, 20, 200), (14, 20, 201), (15, 20, 204), (16, 20, 208), (17, 20, 213), (18, 20, 218),
(19, 21, 202), (20, 21, 205), (21, 21, 206), (22, 21, 210), (23, 21, 214), (24, 21, 220),
(25, 22, 207), (26, 22, 212), (27, 22, 215), (28, 22, 217), (29, 22, 221), (30, 22, 224),
(31, 23, 203), (32, 23, 209), (33, 23, 216), (34, 23, 219), (35, 23, 222), (36, 23, 223)
ON CONFLICT (id) DO NOTHING;
