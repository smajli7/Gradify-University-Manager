-- =====================================================
-- GRADIFY NOTEN-SERVICE - SEED DATA
-- =====================================================
-- Module IDs nach PO BVT (Allgemeine Studienvariante):
--   1  = Einfuehrung BVT (bestanden/nicht bestanden, keine Note)
--   2  = Technische Mechanik          3  = Konstruktion
--   4  = Mathematik 1 (Gew 2)         5  = Physik
--   6  = Elektrotechnik               7  = Informatik
--   8  = Mathematik 2                 9  = Allg. u. Anorg. Chemie
--   10 = Mikrobiologie                11 = English for Life Sciences
--   12 = Techn. Thermodynamik         13 = Anlagenplanung
--   14 = Werkstofftechnik             15 = Fluid Dynamics
--   16 = Organische Chemie            17 = Molekularbiologie u. Gentechnik
--   18 = Heat and Mass Transfer       19 = Mechanical Process Engineering
--   20 = Process Automation           21 = Wahlpflichtmodul 1
--   22 = Physical Chemistry & CRE     23 = Biochemistry
--   24 = Thermische VT                25 = Ethik und Recht
--   26 = Interdisz. Studium Generale  27 = Wahlpflichtmodul 2
--   28 = Bioprozesstechnik            29 = Zellkulturtechnik
--   30 = Prozesssimulation            31 = Teamprojekt (Gew 2)
--   32 = Praxisphase (Gew 5)          33 = BA-Arbeit (Gew 9)
-- FSA: 101-115
-- =====================================================

-- =====================================================
-- BVT SEMESTER 6 - Module Sem 1-5 abgeschlossen
-- =====================================================

-- MAX MUSTERMANN (einschreibung_id=1) - Guter Durchschnitt ~2.0
INSERT INTO noten (id, einschreibung_id, modul_id, erfasst_von, note_wert, bestanden, versuch, pruefungsdatum, status, erfasst_am) VALUES
    -- Modul 1: Einführung BVT (bestanden/nicht bestanden)
    (1,  1, 1,  10, NULL, true, 1, '2023-01-20', 'FREIGEGEBEN', '2023-01-20 10:00:00'),
    -- Semester 1
    (2,  1, 2,  11, 2.3, true, 1, '2023-02-15', 'FREIGEGEBEN', '2023-02-15 10:00:00'),
    (3,  1, 3,  11, 2.0, true, 1, '2023-02-18', 'FREIGEGEBEN', '2023-02-18 10:00:00'),
    (4,  1, 4,  10, 1.7, true, 1, '2023-02-20', 'FREIGEGEBEN', '2023-02-20 10:00:00'),
    (5,  1, 5,  10, 2.3, true, 1, '2023-02-22', 'FREIGEGEBEN', '2023-02-22 10:00:00'),
    (6,  1, 11, 11, 1.7, true, 1, '2023-02-25', 'FREIGEGEBEN', '2023-02-25 10:00:00'),
    -- Semester 2
    (7,  1, 6,  11, 2.0, true, 1, '2023-07-10', 'FREIGEGEBEN', '2023-07-10 10:00:00'),
    (8,  1, 7,  11, 2.3, true, 1, '2023-07-12', 'FREIGEGEBEN', '2023-07-12 10:00:00'),
    (9,  1, 8,  10, 1.7, true, 1, '2023-07-15', 'FREIGEGEBEN', '2023-07-15 10:00:00'),
    (10, 1, 9,  12, 2.7, true, 1, '2023-07-18', 'FREIGEGEBEN', '2023-07-18 10:00:00'),
    (11, 1, 10, 12, 2.0, true, 1, '2023-07-22', 'FREIGEGEBEN', '2023-07-22 10:00:00'),
    -- Semester 3
    (12, 1, 12, 10, 2.3, true, 1, '2024-02-10', 'FREIGEGEBEN', '2024-02-10 10:00:00'),
    (13, 1, 13, 12, 2.0, true, 1, '2024-02-12', 'FREIGEGEBEN', '2024-02-12 10:00:00'),
    (14, 1, 14, 11, 2.7, true, 1, '2024-02-15', 'FREIGEGEBEN', '2024-02-15 10:00:00'),
    (15, 1, 15, 11, 2.0, true, 1, '2024-02-18', 'FREIGEGEBEN', '2024-02-18 10:00:00'),
    (16, 1, 16, 12, 2.3, true, 1, '2024-02-20', 'FREIGEGEBEN', '2024-02-20 10:00:00'),
    (17, 1, 17, 12, 1.7, true, 1, '2024-02-22', 'FREIGEGEBEN', '2024-02-22 10:00:00'),
    -- Semester 4
    (18, 1, 18, 12, 2.0, true, 1, '2024-07-10', 'FREIGEGEBEN', '2024-07-10 10:00:00'),
    (19, 1, 19, 12, 2.3, true, 1, '2024-07-12', 'FREIGEGEBEN', '2024-07-12 10:00:00'),
    (20, 1, 20, 12, 1.7, true, 1, '2024-07-15', 'FREIGEGEBEN', '2024-07-15 10:00:00'),
    (21, 1, 21, 11, 2.0, true, 1, '2024-07-18', 'FREIGEGEBEN', '2024-07-18 10:00:00'),
    (22, 1, 22, 12, 2.3, true, 1, '2024-07-20', 'FREIGEGEBEN', '2024-07-20 10:00:00'),
    (23, 1, 23, 12, 2.0, true, 1, '2024-07-22', 'FREIGEGEBEN', '2024-07-22 10:00:00'),
    -- Semester 5
    (24, 1, 24, 12, 2.3, true, 1, '2025-02-10', 'FREIGEGEBEN', '2025-02-10 10:00:00'),
    (25, 1, 25, 11, 2.0, true, 1, '2025-02-12', 'FREIGEGEBEN', '2025-02-12 10:00:00'),
    (26, 1, 26, 11, 1.7, true, 1, '2025-02-15', 'FREIGEGEBEN', '2025-02-15 10:00:00'),
    (27, 1, 27, 11, 2.3, true, 1, '2025-02-18', 'FREIGEGEBEN', '2025-02-18 10:00:00'),
    (28, 1, 28, 12, 2.0, true, 1, '2025-02-20', 'FREIGEGEBEN', '2025-02-20 10:00:00'),
    (29, 1, 29, 12, 2.3, true, 1, '2025-02-22', 'FREIGEGEBEN', '2025-02-22 10:00:00'),
    -- Semester 6 (teilweise)
    (30, 1, 30, 12, 2.0, true, 1, '2026-01-15', 'VALIDIERT', '2026-01-15 10:00:00')
ON CONFLICT (id) DO NOTHING;

-- ANNA SCHMIDT (einschreibung_id=2) - Sehr guter Durchschnitt ~1.3
INSERT INTO noten (id, einschreibung_id, modul_id, erfasst_von, note_wert, bestanden, versuch, pruefungsdatum, status, erfasst_am) VALUES
    (31, 2, 1,  10, NULL, true, 1, '2023-01-20', 'FREIGEGEBEN', '2023-01-20 10:00:00'),
    (32, 2, 2,  11, 1.3, true, 1, '2023-02-15', 'FREIGEGEBEN', '2023-02-15 10:00:00'),
    (33, 2, 3,  11, 1.0, true, 1, '2023-02-18', 'FREIGEGEBEN', '2023-02-18 10:00:00'),
    (34, 2, 4,  10, 1.3, true, 1, '2023-02-20', 'FREIGEGEBEN', '2023-02-20 10:00:00'),
    (35, 2, 5,  10, 1.7, true, 1, '2023-02-22', 'FREIGEGEBEN', '2023-02-22 10:00:00'),
    (36, 2, 11, 11, 1.0, true, 1, '2023-02-25', 'FREIGEGEBEN', '2023-02-25 10:00:00'),
    (37, 2, 6,  11, 1.3, true, 1, '2023-07-10', 'FREIGEGEBEN', '2023-07-10 10:00:00'),
    (38, 2, 7,  11, 1.0, true, 1, '2023-07-12', 'FREIGEGEBEN', '2023-07-12 10:00:00'),
    (39, 2, 8,  10, 1.3, true, 1, '2023-07-15', 'FREIGEGEBEN', '2023-07-15 10:00:00'),
    (40, 2, 9,  12, 1.7, true, 1, '2023-07-18', 'FREIGEGEBEN', '2023-07-18 10:00:00'),
    (41, 2, 10, 12, 1.3, true, 1, '2023-07-22', 'FREIGEGEBEN', '2023-07-22 10:00:00'),
    (42, 2, 12, 10, 1.0, true, 1, '2024-02-10', 'FREIGEGEBEN', '2024-02-10 10:00:00'),
    (43, 2, 13, 12, 1.3, true, 1, '2024-02-12', 'FREIGEGEBEN', '2024-02-12 10:00:00'),
    (44, 2, 14, 11, 1.0, true, 1, '2024-02-15', 'FREIGEGEBEN', '2024-02-15 10:00:00'),
    (45, 2, 15, 11, 1.7, true, 1, '2024-02-18', 'FREIGEGEBEN', '2024-02-18 10:00:00'),
    (46, 2, 16, 12, 1.3, true, 1, '2024-02-20', 'FREIGEGEBEN', '2024-02-20 10:00:00'),
    (47, 2, 17, 12, 1.0, true, 1, '2024-02-22', 'FREIGEGEBEN', '2024-02-22 10:00:00'),
    (48, 2, 18, 12, 1.7, true, 1, '2024-07-10', 'FREIGEGEBEN', '2024-07-10 10:00:00'),
    (49, 2, 19, 12, 1.3, true, 1, '2024-07-12', 'FREIGEGEBEN', '2024-07-12 10:00:00'),
    (50, 2, 20, 12, 1.0, true, 1, '2024-07-15', 'FREIGEGEBEN', '2024-07-15 10:00:00'),
    (51, 2, 21, 11, 1.7, true, 1, '2024-07-18', 'FREIGEGEBEN', '2024-07-18 10:00:00'),
    (52, 2, 22, 12, 1.3, true, 1, '2024-07-20', 'FREIGEGEBEN', '2024-07-20 10:00:00'),
    (53, 2, 23, 12, 1.0, true, 1, '2024-07-22', 'FREIGEGEBEN', '2024-07-22 10:00:00'),
    (54, 2, 24, 12, 1.3, true, 1, '2025-02-10', 'FREIGEGEBEN', '2025-02-10 10:00:00'),
    (55, 2, 25, 11, 1.7, true, 1, '2025-02-12', 'FREIGEGEBEN', '2025-02-12 10:00:00'),
    (56, 2, 26, 11, 1.0, true, 1, '2025-02-15', 'FREIGEGEBEN', '2025-02-15 10:00:00'),
    (57, 2, 27, 11, 1.3, true, 1, '2025-02-18', 'FREIGEGEBEN', '2025-02-18 10:00:00'),
    (58, 2, 28, 12, 1.7, true, 1, '2025-02-20', 'FREIGEGEBEN', '2025-02-20 10:00:00'),
    (59, 2, 29, 12, 1.3, true, 1, '2025-02-22', 'FREIGEGEBEN', '2025-02-22 10:00:00'),
    (60, 2, 30, 12, 1.0, true, 1, '2026-01-15', 'FREIGEGEBEN', '2026-01-15 10:00:00'),
    (61, 2, 31, 12, 1.3, true, 1, '2026-01-18', 'VALIDIERT',   '2026-01-18 10:00:00')
ON CONFLICT (id) DO NOTHING;

-- FELIX BAUER (einschreibung_id=3) - Durchschnitt ~2.5, eine Wiederholung
INSERT INTO noten (id, einschreibung_id, modul_id, erfasst_von, note_wert, bestanden, versuch, pruefungsdatum, status, erfasst_am) VALUES
    (62, 3, 1,  10, NULL, true, 1, '2023-01-20', 'FREIGEGEBEN', '2023-01-20 10:00:00'),
    (63, 3, 2,  11, 2.7, true, 1, '2023-02-15', 'FREIGEGEBEN', '2023-02-15 10:00:00'),
    (64, 3, 3,  11, 3.0, true, 1, '2023-02-18', 'FREIGEGEBEN', '2023-02-18 10:00:00'),
    (65, 3, 4,  10, 2.0, true, 1, '2023-02-20', 'FREIGEGEBEN', '2023-02-20 10:00:00'),
    (66, 3, 5,  10, 2.7, true, 1, '2023-02-22', 'FREIGEGEBEN', '2023-02-22 10:00:00'),
    (67, 3, 11, 11, 2.3, true, 1, '2023-02-25', 'FREIGEGEBEN', '2023-02-25 10:00:00'),
    -- Elektrotechnik: erst nicht bestanden, dann Wiederholung bestanden
    (68, 3, 6,  11, 5.0, false, 1, '2023-07-10', 'FREIGEGEBEN', '2023-07-10 10:00:00'),
    (69, 3, 6,  11, 3.7, true,  2, '2023-10-15', 'FREIGEGEBEN', '2023-10-15 10:00:00'),
    (70, 3, 7,  11, 2.7, true, 1, '2023-07-12', 'FREIGEGEBEN', '2023-07-12 10:00:00'),
    (71, 3, 8,  10, 2.3, true, 1, '2023-07-15', 'FREIGEGEBEN', '2023-07-15 10:00:00'),
    (72, 3, 9,  12, 3.3, true, 1, '2023-07-18', 'FREIGEGEBEN', '2023-07-18 10:00:00'),
    (73, 3, 10, 12, 2.7, true, 1, '2023-07-22', 'FREIGEGEBEN', '2023-07-22 10:00:00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- BVT SEMESTER 4 - Module bis Semester 3 abgeschlossen
-- =====================================================

-- LISA MEYER (einschreibung_id=4)
INSERT INTO noten (id, einschreibung_id, modul_id, erfasst_von, note_wert, bestanden, versuch, pruefungsdatum, status, erfasst_am) VALUES
    (74, 4, 1,  10, NULL, true, 1, '2024-01-15', 'FREIGEGEBEN', '2024-01-15 10:00:00'),
    (75, 4, 2,  11, 2.0, true, 1, '2024-02-15', 'FREIGEGEBEN', '2024-02-15 10:00:00'),
    (76, 4, 3,  11, 1.3, true, 1, '2024-02-18', 'FREIGEGEBEN', '2024-02-18 10:00:00'),
    (77, 4, 4,  10, 2.0, true, 1, '2024-02-20', 'FREIGEGEBEN', '2024-02-20 10:00:00'),
    (78, 4, 5,  10, 1.7, true, 1, '2024-02-22', 'FREIGEGEBEN', '2024-02-22 10:00:00'),
    (79, 4, 11, 11, 1.3, true, 1, '2024-02-25', 'FREIGEGEBEN', '2024-02-25 10:00:00'),
    (80, 4, 6,  11, 2.3, true, 1, '2024-07-10', 'FREIGEGEBEN', '2024-07-10 10:00:00'),
    (81, 4, 7,  11, 1.7, true, 1, '2024-07-12', 'FREIGEGEBEN', '2024-07-12 10:00:00'),
    (82, 4, 8,  10, 1.3, true, 1, '2024-07-15', 'FREIGEGEBEN', '2024-07-15 10:00:00'),
    (83, 4, 9,  12, 2.0, true, 1, '2024-07-18', 'FREIGEGEBEN', '2024-07-18 10:00:00'),
    (84, 4, 10, 12, 1.7, true, 1, '2024-07-22', 'FREIGEGEBEN', '2024-07-22 10:00:00'),
    -- Semester 3
    (85, 4, 12, 10, 2.0, true, 1, '2025-02-10', 'FREIGEGEBEN', '2025-02-10 10:00:00'),
    (86, 4, 13, 12, 1.7, true, 1, '2025-02-12', 'FREIGEGEBEN', '2025-02-12 10:00:00'),
    (87, 4, 14, 11, 2.3, true, 1, '2025-02-15', 'FREIGEGEBEN', '2025-02-15 10:00:00'),
    (88, 4, 15, 11, 1.7, true, 1, '2025-02-18', 'FREIGEGEBEN', '2025-02-18 10:00:00'),
    (89, 4, 16, 12, 2.0, true, 1, '2025-02-20', 'FREIGEGEBEN', '2025-02-20 10:00:00'),
    (90, 4, 17, 12, 1.7, true, 1, '2025-02-22', 'FREIGEGEBEN', '2025-02-22 10:00:00'),
    -- Semester 4 (laufend)
    (91, 4, 18, 12, 1.7, true, 1, '2026-01-10', 'VALIDIERT', '2026-01-10 10:00:00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- BVT SEMESTER 3 - Semester 1+2 abgeschlossen
-- =====================================================

-- MIA SCHULZ (einschreibung_id=8)
INSERT INTO noten (id, einschreibung_id, modul_id, erfasst_von, note_wert, bestanden, versuch, pruefungsdatum, status, erfasst_am) VALUES
    (92, 8, 1,  10, NULL, true, 1, '2024-09-10', 'FREIGEGEBEN', '2024-09-10 10:00:00'),
    (93, 8, 2,  11, 2.3, true, 1, '2024-09-15', 'FREIGEGEBEN', '2024-09-15 10:00:00'),
    (94, 8, 3,  11, 2.0, true, 1, '2024-09-18', 'FREIGEGEBEN', '2024-09-18 10:00:00'),
    (95, 8, 4,  10, 1.7, true, 1, '2024-09-20', 'FREIGEGEBEN', '2024-09-20 10:00:00'),
    (96, 8, 5,  10, 2.7, true, 1, '2024-09-22', 'FREIGEGEBEN', '2024-09-22 10:00:00'),
    (97, 8, 11, 11, 2.0, true, 1, '2024-09-25', 'FREIGEGEBEN', '2024-09-25 10:00:00'),
    (98, 8, 6,  11, 2.3, true, 1, '2025-02-10', 'FREIGEGEBEN', '2025-02-10 10:00:00'),
    (99, 8, 7,  11, 2.0, true, 1, '2025-02-12', 'FREIGEGEBEN', '2025-02-12 10:00:00'),
    (100, 8, 8,  10, 1.7, true, 1, '2025-02-15', 'FREIGEGEBEN', '2025-02-15 10:00:00'),
    (101, 8, 9,  12, 2.7, true, 1, '2025-02-18', 'FREIGEGEBEN', '2025-02-18 10:00:00'),
    (102, 8, 10, 12, 2.3, true, 1, '2025-02-22', 'FREIGEGEBEN', '2025-02-22 10:00:00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- BVT SEMESTER 2 - Nur Semester 1 abgeschlossen
-- =====================================================

-- TIM SCHROEDER (einschreibung_id=13)
INSERT INTO noten (id, einschreibung_id, modul_id, erfasst_von, note_wert, bestanden, versuch, pruefungsdatum, status, erfasst_am) VALUES
    (103, 13, 1,  10, NULL, true, 1, '2025-01-10', 'FREIGEGEBEN', '2025-01-10 10:00:00'),
    (104, 13, 2,  11, 2.0, true, 1, '2025-02-15', 'FREIGEGEBEN', '2025-02-15 10:00:00'),
    (105, 13, 3,  11, 2.3, true, 1, '2025-02-18', 'FREIGEGEBEN', '2025-02-18 10:00:00'),
    (106, 13, 4,  10, 1.7, true, 1, '2025-02-20', 'FREIGEGEBEN', '2025-02-20 10:00:00'),
    (107, 13, 5,  10, 2.7, true, 1, '2025-02-22', 'FREIGEGEBEN', '2025-02-22 10:00:00'),
    (108, 13, 11, 11, 2.0, true, 1, '2025-02-25', 'FREIGEGEBEN', '2025-02-25 10:00:00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- FSA MASTER SEMESTER 4 - Fast alle Module abgeschlossen
-- Module: 1,2,3,4 (Sem 1), 5.1 (Wahlpflicht FP), 6 (bestanden), 7, 8.1 (Wahlpflicht FF), 9-11 (bestanden), 12 (Thesis)
-- =====================================================

-- SOPHIE BRAUN (einschreibung_id=21) - Sem 4, alle Module bis Thesis
INSERT INTO noten (id, einschreibung_id, modul_id, erfasst_von, note_wert, bestanden, versuch, pruefungsdatum, status, erfasst_am) VALUES
    -- Semester 1
    (109, 21, 101, 13, 1.3, true, 1, '2024-02-15', 'FREIGEGEBEN', '2024-02-15 10:00:00'),  -- Paradigmatische Grundlegung
    (110, 21, 102, 13, 1.7, true, 1, '2024-02-18', 'FREIGEGEBEN', '2024-02-18 10:00:00'),  -- Quant. Forschungsmethoden
    (111, 21, 103, 13, 1.3, true, 1, '2024-02-20', 'FREIGEGEBEN', '2024-02-20 10:00:00'),  -- Statistik I
    (112, 21, 104, 14, 1.7, true, 1, '2024-07-10', 'FREIGEGEBEN', '2024-07-10 10:00:00'),  -- Qual.-rekonstr. FM (2 Sem)
    -- Semester 2-3
    (113, 21, 105, 13, 1.0, true, 1, '2025-02-15', 'FREIGEGEBEN', '2025-02-15 10:00:00'),  -- FP qualitativ (Wahlpflicht 5)
    (114, 21, 107, 13, NULL, true, 1, '2024-07-12', 'FREIGEGEBEN', '2024-07-12 10:00:00'), -- Aktuelle Forschungen (bestanden)
    (115, 21, 108, 14, 1.7, true, 1, '2024-07-15', 'FREIGEGEBEN', '2024-07-15 10:00:00'),  -- Statistik II
    -- Semester 3
    (116, 21, 109, 13, 1.3, true, 1, '2025-02-18', 'FREIGEGEBEN', '2025-02-18 10:00:00'),  -- FF Jugendhilfe (Wahlpflicht 8)
    (117, 21, 112, 14, NULL, true, 1, '2025-02-20', 'FREIGEGEBEN', '2025-02-20 10:00:00'), -- Empirische Vertiefung (bestanden)
    (118, 21, 113, 14, NULL, true, 1, '2025-02-22', 'FREIGEGEBEN', '2025-02-22 10:00:00'), -- Projektorient. wiss. Arbeiten (bestanden)
    -- Semester 4
    (119, 21, 114, 13, NULL, true, 1, '2026-01-10', 'FREIGEGEBEN', '2026-01-10 10:00:00')  -- Forschung beantragen (bestanden)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- FSA MASTER SEMESTER 2
-- =====================================================

-- ELENA VOGT (einschreibung_id=27) - Sem 2, Semester 1 abgeschlossen
INSERT INTO noten (id, einschreibung_id, modul_id, erfasst_von, note_wert, bestanden, versuch, pruefungsdatum, status, erfasst_am) VALUES
    (120, 27, 101, 13, 2.0, true, 1, '2025-02-15', 'FREIGEGEBEN', '2025-02-15 10:00:00'),  -- Paradigmatische Grundlegung
    (121, 27, 102, 13, 1.7, true, 1, '2025-02-18', 'FREIGEGEBEN', '2025-02-18 10:00:00'),  -- Quant. Forschungsmethoden
    (122, 27, 103, 13, 2.3, true, 1, '2025-02-20', 'FREIGEGEBEN', '2025-02-20 10:00:00'),  -- Statistik I
    (123, 27, 104, 14, 1.7, true, 1, '2025-02-22', 'FREIGEGEBEN', '2025-02-22 10:00:00')   -- Qual.-rekonstr. FM (laufend)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Update sequence
-- =====================================================
SELECT setval('noten_id_seq', (SELECT MAX(id) FROM noten), true);
