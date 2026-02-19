-- =====================================================
-- GRADIFY STUDIENGANG-SERVICE - SEED DATA
-- =====================================================
-- Module 100% nach PO Bioverfahrenstechnik BA (Allgemeine Studienvariante)
-- § 11 Bildung der Gesamtnote: SUM(note * gewichtung) / SUM(gewichtung)
-- Module mit "bestanden" gehen NICHT in Gesamtnote ein.
-- =====================================================

-- =====================================================
-- MANDANTEN (nur THM - GU kommt per TenantDataLoader)
-- =====================================================
INSERT INTO mandanten (id, name, kuerzel, aktiv) VALUES
    (1, 'Technische Hochschule Mittelhessen', 'THM', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STUDIENGÄNGE
-- BVT: 210 ECTS, 7 Semester Regelstudienzeit (§4)
-- FSA: 120 ECTS, 4 Semester
-- =====================================================
INSERT INTO studiengaenge (id, mandant_id, name, kuerzel, abschlussart, regelstudienzeit, gesamt_ects, studienvariante, aktiv) VALUES
    (1, 1, 'Bioverfahrenstechnik', 'BVT', 'BACHELOR', 7, 210, 'ALLGEMEIN', true),
    (2, 1, 'Forschung in der Sozialen Arbeit', 'FSA', 'MASTER', 4, 120, 'ALLGEMEIN', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PRÜFUNGSORDNUNGEN
-- =====================================================
INSERT INTO pruefungsordnungen (id, studiengang_id, version, gueltig_ab, gueltig_bis, berechnungsart) VALUES
    (1, 1, 'PO 2023', '2023-10-01', NULL, 'GEWICHTET'),
    (2, 2, 'PO 2022', '2022-10-01', NULL, 'ARITHMETISCH_GEMISCHT')
ON CONFLICT (id) DO NOTHING;

-- Studiengänge mit aktueller PO verknüpfen
UPDATE studiengaenge SET aktuelle_po_id = 1 WHERE id = 1 AND aktuelle_po_id IS NULL;
UPDATE studiengaenge SET aktuelle_po_id = 2 WHERE id = 2 AND aktuelle_po_id IS NULL;

-- =====================================================
-- MODULE - BIOVERFAHRENSTECHNIK (BVT) - 33 Module, 210 ECTS
-- 100% nach PO Anlage 2 (Allgemeine Studienvariante)
-- Gewichtung § 11: Modul 1 bestanden (Gew 0), Mathe1 Gew 2,
--   Teamprojekt Gew 2, Praxisphase Gew 5, BA Gew 9, Rest Gew 1
-- =====================================================
INSERT INTO module (id, po_id, modul_nr, name, ects, semester, dauer_semester, pruefungsform, sprache, modultyp, bewertungsart, gewichtung, in_gesamtnote) VALUES
    -- ===== SEMESTER 1 =====
    (1,  1, '1',  'Einfuehrung in die Bioverfahrenstechnik', 5,  '1',   1, 'PROJEKT',   'DEUTSCH',  'PFLICHT', 'BESTANDEN_NICHT_BESTANDEN', 0.0, false),
    (2,  1, '2',  'Technische Mechanik',                     5,  '1',   1, 'KLAUSUR',   'DEUTSCH',  'PFLICHT', 'NOTE', 1.0, true),
    (3,  1, '3',  'Konstruktion',                             5,  '1',   1, 'KLAUSUR',   'DEUTSCH',  'PFLICHT', 'NOTE', 1.0, true),
    (4,  1, '4',  'Mathematik 1',                             10, '1',   1, 'KLAUSUR',   'DEUTSCH',  'PFLICHT', 'NOTE', 2.0, true),
    (5,  1, '5',  'Physik',                                   5,  '1',   1, 'KLAUSUR',   'DEUTSCH',  'PFLICHT', 'NOTE', 1.0, true),
    -- ===== SEMESTER 1-2 =====
    (11, 1, '11', 'English for Life Sciences and Engineering', 5, '1-2', 2, 'KLAUSUR',   'ENGLISCH', 'PFLICHT', 'NOTE', 1.0, true),
    -- ===== SEMESTER 2 =====
    (6,  1, '6',  'Elektrotechnik',                           5,  '2',   1, 'KLAUSUR',   'DEUTSCH',  'PFLICHT', 'NOTE', 1.0, true),
    (7,  1, '7',  'Informatik',                               5,  '2',   1, 'KLAUSUR',   'DEUTSCH',  'PFLICHT', 'NOTE', 1.0, true),
    (8,  1, '8',  'Mathematik 2',                             5,  '2',   1, 'KLAUSUR',   'DEUTSCH',  'PFLICHT', 'NOTE', 1.0, true),
    (9,  1, '9',  'Allgemeine und Anorganische Chemie',       5,  '2',   1, 'KLAUSUR',   'DEUTSCH',  'PFLICHT', 'NOTE', 1.0, true),
    (10, 1, '10', 'Mikrobiologie',                            5,  '2',   1, 'KLAUSUR',   'DEUTSCH',  'PFLICHT', 'NOTE', 1.0, true),
    -- ===== SEMESTER 3 =====
    (12, 1, '12', 'Technische Thermodynamik',                 5,  '3',   1, 'KLAUSUR',   'DEUTSCH',  'PFLICHT', 'NOTE', 1.0, true),
    (13, 1, '13', 'Anlagenplanung',                           5,  '3',   1, 'KLAUSUR',   'DEUTSCH',  'PFLICHT', 'NOTE', 1.0, true),
    (14, 1, '14', 'Werkstofftechnik',                         5,  '3',   1, 'MUENDLICH', 'DEUTSCH',  'PFLICHT', 'NOTE', 1.0, true),
    (15, 1, '15', 'Fluid Dynamics',                           5,  '3',   1, 'KLAUSUR',   'ENGLISCH', 'PFLICHT', 'NOTE', 1.0, true),
    (16, 1, '16', 'Organische Chemie',                        5,  '3',   1, 'KLAUSUR',   'DEUTSCH',  'PFLICHT', 'NOTE', 1.0, true),
    (17, 1, '17', 'Molekularbiologie und Gentechnik',         5,  '3',   1, 'KLAUSUR',   'DEUTSCH',  'PFLICHT', 'NOTE', 1.0, true),
    -- ===== SEMESTER 4 =====
    (18, 1, '18', 'Heat and Mass Transfer',                   5,  '4',   1, 'KLAUSUR',   'ENGLISCH', 'PFLICHT', 'NOTE', 1.0, true),
    (19, 1, '19', 'Mechanical Process Engineering',           5,  '4',   1, 'KLAUSUR',   'ENGLISCH', 'PFLICHT', 'NOTE', 1.0, true),
    (20, 1, '20', 'Process Automation',                       5,  '4',   1, 'KLAUSUR',   'ENGLISCH', 'PFLICHT', 'NOTE', 1.0, true),
    (21, 1, '21', 'Wahlpflichtmodul 1',                      5,  '4',   1, 'KLAUSUR',   'DEUTSCH',  'WAHLPFLICHT', 'NOTE', 1.0, true),
    (22, 1, '22', 'Physical Chemistry and Chemical Reaction Engineering', 5, '4', 1, 'KLAUSUR', 'ENGLISCH', 'PFLICHT', 'NOTE', 1.0, true),
    (23, 1, '23', 'Biochemistry',                             5,  '4',   1, 'KLAUSUR',   'ENGLISCH', 'PFLICHT', 'NOTE', 1.0, true),
    -- ===== SEMESTER 5 =====
    (24, 1, '24', 'Thermische Verfahrenstechnik',             5,  '5',   1, 'KLAUSUR',   'DEUTSCH',  'PFLICHT', 'NOTE', 1.0, true),
    (25, 1, '25', 'Ethik und Recht',                          5,  '5',   1, 'HAUSARBEIT', 'DEUTSCH', 'PFLICHT', 'NOTE', 1.0, true),
    (26, 1, '26', 'Interdisziplinaeres Studium Generale',     5,  '5',   1, 'PROJEKT',   'DEUTSCH',  'PFLICHT', 'NOTE', 1.0, true),
    (27, 1, '27', 'Wahlpflichtmodul 2',                      5,  '5',   1, 'KLAUSUR',   'DEUTSCH',  'WAHLPFLICHT', 'NOTE', 1.0, true),
    (28, 1, '28', 'Bioprozesstechnik',                        5,  '5',   1, 'KLAUSUR',   'DEUTSCH',  'PFLICHT', 'NOTE', 1.0, true),
    (29, 1, '29', 'Zellkulturtechnik',                        5,  '5',   1, 'KLAUSUR',   'DEUTSCH',  'PFLICHT', 'NOTE', 1.0, true),
    -- ===== SEMESTER 6 =====
    (30, 1, '30', 'Prozesssimulation',                        5,  '6',   1, 'PORTFOLIO', 'DEUTSCH',  'PFLICHT', 'NOTE', 1.0, true),
    (31, 1, '31', 'Teamprojekt',                              10, '6',   1, 'PROJEKT',   'DEUTSCH',  'PFLICHT', 'NOTE', 2.0, true),
    -- ===== SEMESTER 6-7 =====
    (32, 1, '32', 'Praxisphase',                              30, '6-7', 2, 'PRAXISBERICHT', 'DEUTSCH', 'PFLICHT', 'NOTE', 5.0, true),
    (33, 1, '33', 'Bachelor-Arbeit mit Kolloquium',           15, '6-7', 2, 'HAUSARBEIT', 'DEUTSCH',  'PFLICHT', 'NOTE', 9.0, true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- MODULE - FORSCHUNG IN DER SOZIALEN ARBEIT (FSA) MA
-- 100% nach PO (§9 Gesamtnote, §6 Abs. 4 bestanden-Module)
-- Gesamtnote §9: (2 × Thesis + 1 × Modulmittel) / 3
--   Modulmittel = arithm. Mittel der Module 1,2,3,4,5,7,8
--   Gewichtung: Modulmittel-Module je 1, Thesis 2
--   Berechnung: (2 × Thesis + Modulmittel) / 3 (PO §9)
-- Module 6,9,10,11: bestanden/nicht bestanden, nicht in Gesamtnote (§6 Abs. 4)
-- Thesis-Gewichtung = 2.0 (PO §9: Gesamtnote = (2×Thesis + Modulmittel) / 3)
-- =====================================================
INSERT INTO module (id, po_id, modul_nr, name, ects, semester, dauer_semester, pruefungsform, sprache, modultyp, bewertungsart, gewichtung, in_gesamtnote) VALUES
    -- ===== SEMESTER 1 =====
    (101, 2, '1',   'Paradigmatische, theoretische und methodologische Grundlegung', 10, '1',   1, 'HAUSARBEIT',    'DEUTSCH', 'PFLICHT',     'NOTE', 1.0, true),
    (102, 2, '2',   'Quantitative Forschungsmethoden',                               10, '1',   1, 'KLAUSUR',       'DEUTSCH', 'PFLICHT',     'NOTE', 1.0, true),
    (103, 2, '3',   'Statistik I',                                                    5, '1',   1, 'KLAUSUR',       'DEUTSCH', 'PFLICHT',     'NOTE', 1.0, true),
    (104, 2, '4',   'Qualitativ-rekonstruktive Forschungsmethoden',                   10, '1-2', 2, 'HAUSARBEIT',    'DEUTSCH', 'PFLICHT',     'NOTE', 1.0, true),
    -- ===== SEMESTER 2-3 (Forschungsprojekt Wahlpflicht) =====
    (105, 2, '5.1', 'Forschungsprojekt qualitativ-rekonstruktiv',                     30, '2-3', 2, 'HAUSARBEIT',    'DEUTSCH', 'WAHLPFLICHT', 'NOTE', 1.0, true),
    (106, 2, '5.2', 'Forschungsprojekt quantitativ',                                  30, '2-3', 2, 'HAUSARBEIT',    'DEUTSCH', 'WAHLPFLICHT', 'NOTE', 1.0, true),
    -- ===== SEMESTER 2 =====
    (107, 2, '6',   'Aktuelle Forschungen in der Sozialen Arbeit',                     5, '2',   1, 'HAUSARBEIT',    'DEUTSCH', 'PFLICHT',     'BESTANDEN_NICHT_BESTANDEN', 0.0, false),
    (108, 2, '7',   'Statistik II',                                                    5, '2',   1, 'KLAUSUR',       'DEUTSCH', 'PFLICHT',     'NOTE', 1.0, true),
    -- ===== SEMESTER 3 (Forschungsfelder Wahlpflicht) =====
    (109, 2, '8.1', 'Forschungsfelder: Jugendhilfe',                                   5, '3',   1, 'HAUSARBEIT',    'DEUTSCH', 'WAHLPFLICHT', 'NOTE', 1.0, true),
    (110, 2, '8.2', 'Forschungsfelder: Sozialplanung',                                 5, '3',   1, 'HAUSARBEIT',    'DEUTSCH', 'WAHLPFLICHT', 'NOTE', 1.0, true),
    (111, 2, '8.3', 'Forschungsfelder: Evaluation',                                    5, '3',   1, 'HAUSARBEIT',    'DEUTSCH', 'WAHLPFLICHT', 'NOTE', 1.0, true),
    (112, 2, '9',   'Empirische Vertiefung',                                           5, '3',   1, 'PRAESENTATION', 'DEUTSCH', 'PFLICHT',     'BESTANDEN_NICHT_BESTANDEN', 0.0, false),
    (113, 2, '10',  'Projektorientiertes wissenschaftliches Arbeiten',                  5, '3',   1, 'PRAESENTATION', 'DEUTSCH', 'PFLICHT',     'BESTANDEN_NICHT_BESTANDEN', 0.0, false),
    -- ===== SEMESTER 4 =====
    (114, 2, '11',  'Forschung beantragen, planen und verwalten',                       5, '4',   1, 'PROJEKT',       'DEUTSCH', 'PFLICHT',     'BESTANDEN_NICHT_BESTANDEN', 0.0, false),
    (115, 2, '12',  'Master-Thesis mit Kolloquium',                                    25, '4',   1, 'HAUSARBEIT',    'DEUTSCH', 'PFLICHT',     'NOTE', 2.0, true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- EINSCHREIBUNGEN - nur THM (35 Studenten)
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
-- =====================================================
INSERT INTO po_regelwerke (id, po_id, regel_name, beschreibung, formel, parameter_json) VALUES
    (1, 1, 'GEWICHTET', 'Gesamtnote §11: SUM(note*gewichtung)/SUM(gewichtung). Modul 1 bestanden, geht nicht ein.', 'ECTS_GEWICHTET', '{"minEcts": 210, "maxVersuche": 3}'),
    (2, 2, 'ARITHMETISCH_GEMISCHT', 'Gesamtnote §9: (2 × Thesis + Modulmittel) / 3. Modulmittel = Mittel der Module 1,2,3,4,5,7,8.', 'MASTER_MIXED', '{"minEcts": 120, "maxVersuche": 3}')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- MODUL-ZUWEISUNGEN (Dozenten -> Module)
-- dozent_id referenziert benutzer IDs 10-14
-- =====================================================
INSERT INTO modul_zuweisungen (id, dozent_id, modul_id) VALUES
    -- THM BVT: Prof. Mueller (Mathe, Physik, Chemie)
    (1, 10, 4),   -- Mathematik 1
    (2, 10, 8),   -- Mathematik 2
    (3, 10, 5),   -- Physik
    -- THM BVT: Prof. Schmidt (Mechanik, Konstruktion, Informatik)
    (4, 11, 2),   -- Technische Mechanik
    (5, 11, 3),   -- Konstruktion
    (6, 11, 7),   -- Informatik
    -- THM BVT: Prof. Weber (Verfahrenstechnik, Chemie)
    (7, 12, 9),   -- Allg. u. Anorg. Chemie
    (8, 12, 16),  -- Organische Chemie
    -- THM FSA: Prof. Klein, Richter
    (9, 13, 101),
    (10, 13, 106),
    (11, 14, 104),
    (12, 14, 109)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Sequence-Anpassung
-- =====================================================
SELECT setval('mandanten_id_seq', COALESCE((SELECT MAX(id) FROM mandanten), 0) + 1, false);
SELECT setval('studiengaenge_id_seq', COALESCE((SELECT MAX(id) FROM studiengaenge), 0) + 1, false);
SELECT setval('pruefungsordnungen_id_seq', COALESCE((SELECT MAX(id) FROM pruefungsordnungen), 0) + 1, false);
SELECT setval('module_id_seq', COALESCE((SELECT MAX(id) FROM module), 0) + 1, false);
SELECT setval('einschreibungen_id_seq', COALESCE((SELECT MAX(id) FROM einschreibungen), 0) + 1, false);
SELECT setval('po_regelwerke_id_seq', COALESCE((SELECT MAX(id) FROM po_regelwerke), 0) + 1, false);
SELECT setval('modul_zuweisungen_id_seq', COALESCE((SELECT MAX(id) FROM modul_zuweisungen), 0) + 1, false);
