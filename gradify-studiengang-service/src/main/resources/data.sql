-- =====================================================
-- GRADIFY STUDIENGANG-SERVICE - SEED DATA
-- =====================================================
-- Spaltennamen müssen mit den Entity-Feldnamen übereinstimmen
-- (Hibernate: camelCase → snake_case)
-- PostgreSQL mit BIGINT/SERIAL IDs
-- =====================================================

-- =====================================================
-- MANDANTEN (Hochschulen)
-- ID: 1 = THM
-- =====================================================
INSERT INTO mandanten (id, name, kuerzel, aktiv) VALUES
    (1, 'Technische Hochschule Mittelhessen', 'THM', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STUDIENGÄNGE
-- ID: 1 = BVT Bachelor, 2 = FSA Master
-- Spalten: id, mandant_id, name, kuerzel, abschlussart, regelstudienzeit, gesamt_ects, studienvariante, aktiv
-- =====================================================
INSERT INTO studiengaenge (id, mandant_id, name, kuerzel, abschlussart, regelstudienzeit, gesamt_ects, studienvariante, aktiv) VALUES
    (1, 1, 'Bioverfahrenstechnik', 'BVT', 'BACHELOR', 6, 180, 'ALLGEMEIN', true),
    (2, 1, 'Forschung in der Sozialen Arbeit', 'FSA', 'MASTER', 4, 120, 'ALLGEMEIN', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PRÜFUNGSORDNUNGEN
-- ID: 1 = BVT PO 2023, 2 = FSA PO 2023
-- Spalten: id, studiengang_id, version, gueltig_ab, gueltig_bis, berechnungsart
-- =====================================================
INSERT INTO pruefungsordnungen (id, studiengang_id, version, gueltig_ab, gueltig_bis, berechnungsart) VALUES
    (1, 1, 'PO 2023', '2023-10-01', NULL, 'GEWICHTET'),
    (2, 2, 'PO 2023', '2023-10-01', NULL, 'GEWICHTET')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- MODULE - BIOVERFAHRENSTECHNIK (BVT)
-- IDs: 1-25
-- Spalten: id, po_id, modul_nr, name, ects, semester, dauer_semester, pruefungsform, sprache, modultyp, bewertungsart, gewichtung, in_gesamtnote
-- =====================================================
INSERT INTO module (id, po_id, modul_nr, name, ects, semester, dauer_semester, pruefungsform, sprache, modultyp, bewertungsart, gewichtung, in_gesamtnote) VALUES
    -- Semester 1
    (1, 1, 'BVT-01', 'Mathematik I', 6, '1', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    (2, 1, 'BVT-02', 'Physik', 6, '1', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    (3, 1, 'BVT-03', 'Allgemeine Chemie', 6, '1', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    (4, 1, 'BVT-04', 'Biologie I', 6, '1', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    (5, 1, 'BVT-05', 'Technisches Englisch', 6, '1', 1, 'KLAUSUR', 'ENGLISCH', 'PFLICHT', 'NOTE', 6.0, true),
    -- Semester 2
    (6, 1, 'BVT-06', 'Mathematik II', 6, '2', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    (7, 1, 'BVT-07', 'Organische Chemie', 6, '2', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    (8, 1, 'BVT-08', 'Biologie II', 6, '2', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    (9, 1, 'BVT-09', 'Thermodynamik', 6, '2', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    (10, 1, 'BVT-10', 'Stroemungsmechanik', 6, '2', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    -- Semester 3
    (11, 1, 'BVT-11', 'Biochemie', 6, '3', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    (12, 1, 'BVT-12', 'Mikrobiologie', 6, '3', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    (13, 1, 'BVT-13', 'Verfahrenstechnik I', 6, '3', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    (14, 1, 'BVT-14', 'Mess- und Regelungstechnik', 6, '3', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    (15, 1, 'BVT-15', 'Laborpraktikum I', 6, '3', 1, 'PRAXISBERICHT', 'DEUTSCH', 'PFLICHT', 'BESTANDEN_NICHT_BESTANDEN', 0.0, false),
    -- Semester 4
    (16, 1, 'BVT-16', 'Bioverfahrenstechnik I', 6, '4', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    (17, 1, 'BVT-17', 'Verfahrenstechnik II', 6, '4', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    (18, 1, 'BVT-18', 'Anlagentechnik', 6, '4', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    (19, 1, 'BVT-19', 'Laborpraktikum II', 6, '4', 1, 'PRAXISBERICHT', 'DEUTSCH', 'PFLICHT', 'BESTANDEN_NICHT_BESTANDEN', 0.0, false),
    (20, 1, 'BVT-20', 'Wahlpflicht I', 6, '4', 1, 'KLAUSUR', 'DEUTSCH', 'WAHLPFLICHT', 'NOTE', 6.0, true),
    -- Semester 5
    (21, 1, 'BVT-21', 'Praxissemester', 30, '5', 1, 'PRAXISBERICHT', 'DEUTSCH', 'PFLICHT', 'BESTANDEN_NICHT_BESTANDEN', 0.0, false),
    -- Semester 6
    (22, 1, 'BVT-22', 'Bioverfahrenstechnik II', 6, '6', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    (23, 1, 'BVT-23', 'Qualitaetsmanagement', 6, '6', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    (24, 1, 'BVT-24', 'Wahlpflicht II', 6, '6', 1, 'KLAUSUR', 'DEUTSCH', 'WAHLPFLICHT', 'NOTE', 6.0, true),
    (25, 1, 'BVT-25', 'Bachelorarbeit', 12, '6', 1, 'HAUSARBEIT', 'DEUTSCH', 'PFLICHT', 'NOTE', 12.0, true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- MODULE - FORSCHUNG SOZIALE ARBEIT (FSA)
-- IDs: 101-115
-- =====================================================
INSERT INTO module (id, po_id, modul_nr, name, ects, semester, dauer_semester, pruefungsform, sprache, modultyp, bewertungsart, gewichtung, in_gesamtnote) VALUES
    -- Semester 1
    (101, 2, 'FSA-01', 'Forschungsmethoden I', 6, '1', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    (102, 2, 'FSA-02', 'Wissenschaftstheorie', 6, '1', 1, 'HAUSARBEIT', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    (103, 2, 'FSA-03', 'Sozialarbeitsforschung', 6, '1', 1, 'HAUSARBEIT', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    (104, 2, 'FSA-04', 'Statistik', 6, '1', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    (105, 2, 'FSA-05', 'Forschungsethik', 6, '1', 1, 'HAUSARBEIT', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    -- Semester 2
    (106, 2, 'FSA-06', 'Forschungsmethoden II', 6, '2', 1, 'KLAUSUR', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    (107, 2, 'FSA-07', 'Qualitative Forschung', 6, '2', 1, 'PROJEKT', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    (108, 2, 'FSA-08', 'Quantitative Forschung', 6, '2', 1, 'PROJEKT', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    (109, 2, 'FSA-09', 'Forschungsprojekt I', 6, '2', 1, 'PROJEKT', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    (110, 2, 'FSA-10', 'Wahlmodul I', 6, '2', 1, 'PRAESENTATION', 'DEUTSCH', 'WAHLPFLICHT', 'NOTE', 6.0, true),
    -- Semester 3
    (111, 2, 'FSA-11', 'Forschungsprojekt II', 12, '3', 1, 'PROJEKT', 'DEUTSCH', 'PFLICHT', 'NOTE', 12.0, true),
    (112, 2, 'FSA-12', 'Praxisforschung', 6, '3', 1, 'PRAXISBERICHT', 'DEUTSCH', 'PFLICHT', 'NOTE', 6.0, true),
    (113, 2, 'FSA-13', 'Wahlmodul II', 6, '3', 1, 'PRAESENTATION', 'DEUTSCH', 'WAHLPFLICHT', 'NOTE', 6.0, true),
    (114, 2, 'FSA-14', 'Wahlmodul III', 6, '3', 1, 'PRAESENTATION', 'DEUTSCH', 'WAHLPFLICHT', 'NOTE', 6.0, true),
    -- Semester 4
    (115, 2, 'FSA-15', 'Masterarbeit', 30, '4', 1, 'HAUSARBEIT', 'DEUTSCH', 'PFLICHT', 'NOTE', 30.0, true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- EINSCHREIBUNGEN - 35 Studenten
-- IDs: 1-35 (matching student_id 1-35)
-- Spalten: id, student_id, studiengang_id, po_id, studienvariante, immatrikuliert_am, aktuelles_semester, status
-- =====================================================
INSERT INTO einschreibungen (id, student_id, studiengang_id, po_id, studienvariante, immatrikuliert_am, aktuelles_semester, status) VALUES
    -- ===== BVT STUDENTEN (20) =====
    -- Semester 6
    (1, 1, 1, 1, 'ALLGEMEIN', '2022-10-01', 6, 'AKTIV'),
    (2, 2, 1, 1, 'ALLGEMEIN', '2022-10-01', 6, 'AKTIV'),
    (3, 3, 1, 1, 'ALLGEMEIN', '2022-10-01', 6, 'AKTIV'),
    -- Semester 4
    (4, 4, 1, 1, 'ALLGEMEIN', '2023-10-01', 4, 'AKTIV'),
    (5, 5, 1, 1, 'ALLGEMEIN', '2023-10-01', 4, 'AKTIV'),
    (6, 6, 1, 1, 'ALLGEMEIN', '2023-10-01', 4, 'AKTIV'),
    (7, 7, 1, 1, 'ALLGEMEIN', '2023-10-01', 4, 'AKTIV'),
    -- Semester 3
    (8, 8, 1, 1, 'ALLGEMEIN', '2024-04-01', 3, 'AKTIV'),
    (9, 9, 1, 1, 'ALLGEMEIN', '2024-04-01', 3, 'AKTIV'),
    (10, 10, 1, 1, 'ALLGEMEIN', '2024-04-01', 3, 'AKTIV'),
    (11, 11, 1, 1, 'ALLGEMEIN', '2024-04-01', 3, 'AKTIV'),
    (12, 12, 1, 1, 'ALLGEMEIN', '2024-04-01', 3, 'AKTIV'),
    -- Semester 2
    (13, 13, 1, 1, 'ALLGEMEIN', '2024-10-01', 2, 'AKTIV'),
    (14, 14, 1, 1, 'ALLGEMEIN', '2024-10-01', 2, 'AKTIV'),
    (15, 15, 1, 1, 'ALLGEMEIN', '2024-10-01', 2, 'AKTIV'),
    (16, 16, 1, 1, 'ALLGEMEIN', '2024-10-01', 2, 'AKTIV'),
    -- Semester 1
    (17, 17, 1, 1, 'ALLGEMEIN', '2025-10-01', 1, 'AKTIV'),
    (18, 18, 1, 1, 'ALLGEMEIN', '2025-10-01', 1, 'AKTIV'),
    (19, 19, 1, 1, 'ALLGEMEIN', '2025-10-01', 1, 'AKTIV'),
    (20, 20, 1, 1, 'ALLGEMEIN', '2025-10-01', 1, 'AKTIV'),
    
    -- ===== FSA MASTER STUDENTEN (15) =====
    -- Semester 4
    (21, 21, 2, 2, 'ALLGEMEIN', '2023-10-01', 4, 'AKTIV'),
    (22, 22, 2, 2, 'ALLGEMEIN', '2023-10-01', 4, 'AKTIV'),
    -- Semester 3
    (23, 23, 2, 2, 'ALLGEMEIN', '2024-04-01', 3, 'AKTIV'),
    (24, 24, 2, 2, 'ALLGEMEIN', '2024-04-01', 3, 'AKTIV'),
    (25, 25, 2, 2, 'ALLGEMEIN', '2024-04-01', 3, 'AKTIV'),
    (26, 26, 2, 2, 'ALLGEMEIN', '2024-04-01', 3, 'AKTIV'),
    -- Semester 2
    (27, 27, 2, 2, 'ALLGEMEIN', '2024-10-01', 2, 'AKTIV'),
    (28, 28, 2, 2, 'ALLGEMEIN', '2024-10-01', 2, 'AKTIV'),
    (29, 29, 2, 2, 'ALLGEMEIN', '2024-10-01', 2, 'AKTIV'),
    (30, 30, 2, 2, 'ALLGEMEIN', '2024-10-01', 2, 'AKTIV'),
    -- Semester 1
    (31, 31, 2, 2, 'ALLGEMEIN', '2025-10-01', 1, 'AKTIV'),
    (32, 32, 2, 2, 'ALLGEMEIN', '2025-10-01', 1, 'AKTIV'),
    (33, 33, 2, 2, 'ALLGEMEIN', '2025-10-01', 1, 'AKTIV'),
    (34, 34, 2, 2, 'ALLGEMEIN', '2025-10-01', 1, 'AKTIV'),
    (35, 35, 2, 2, 'ALLGEMEIN', '2025-10-01', 1, 'AKTIV')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PO-REGELWERKE
-- IDs: 1-2
-- Spalten: id, po_id, regel_name, beschreibung, formel, parameter_json
-- =====================================================
INSERT INTO po_regelwerke (id, po_id, regel_name, beschreibung, formel, parameter_json) VALUES
    (1, 1, 'GEWICHTET', 'Standard-Regelwerk BVT Bachelor mit ECTS-Gewichtung', 'ECTS_GEWICHTET', '{"minEcts": 180, "maxVersuche": 3}'),
    (2, 2, 'GEWICHTET', 'Standard-Regelwerk FSA Master mit ECTS-Gewichtung', 'ECTS_GEWICHTET', '{"minEcts": 120, "maxVersuche": 3}')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- MODUL-ZUWEISUNGEN (Dozenten → Module)
-- IDs: 1-12
-- dozent_id referenziert benutzer IDs 10-14
-- Spalten: id, dozent_id, modul_id
-- =====================================================
INSERT INTO modul_zuweisungen (id, dozent_id, modul_id) VALUES
    -- Prof. Mueller (dozent_id=10): Mathematik, Physik, Thermodynamik
    (1, 10, 1),   -- Mathematik I
    (2, 10, 2),   -- Physik
    (3, 10, 9),   -- Thermodynamik
    -- Prof. Schmidt (dozent_id=11): Chemie, Biologie
    (4, 11, 3),   -- Allgemeine Chemie
    (5, 11, 4),   -- Biologie I
    (6, 11, 7),   -- Organische Chemie
    -- Prof. Weber (dozent_id=12): Verfahrenstechnik
    (7, 12, 13),  -- Verfahrenstechnik I
    (8, 12, 16),  -- Bioverfahrenstechnik I
    -- Prof. Klein (dozent_id=13): FSA Forschungsmethoden
    (9, 13, 101),  -- Forschungsmethoden I
    (10, 13, 106), -- Forschungsmethoden II
    -- Prof. Richter (dozent_id=14): FSA Statistik, Forschungsprojekte
    (11, 14, 104), -- Statistik
    (12, 14, 109)  -- Forschungsprojekt I
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Sequence-Anpassung für SERIAL-Spalten
-- Setzt die Sequences auf den nächsten freien Wert
-- =====================================================
SELECT setval('mandanten_id_seq', COALESCE((SELECT MAX(id) FROM mandanten), 0) + 1, false);
SELECT setval('studiengaenge_id_seq', COALESCE((SELECT MAX(id) FROM studiengaenge), 0) + 1, false);
SELECT setval('pruefungsordnungen_id_seq', COALESCE((SELECT MAX(id) FROM pruefungsordnungen), 0) + 1, false);
SELECT setval('module_id_seq', COALESCE((SELECT MAX(id) FROM module), 0) + 1, false);
SELECT setval('einschreibungen_id_seq', COALESCE((SELECT MAX(id) FROM einschreibungen), 0) + 1, false);
SELECT setval('po_regelwerke_id_seq', COALESCE((SELECT MAX(id) FROM po_regelwerke), 0) + 1, false);
SELECT setval('modul_zuweisungen_id_seq', COALESCE((SELECT MAX(id) FROM modul_zuweisungen), 0) + 1, false);
