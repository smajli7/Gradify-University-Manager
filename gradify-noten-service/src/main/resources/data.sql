-- =====================================================
-- GRADIFY NOTEN-SERVICE - SEED DATA
-- =====================================================
-- Spalten: id, einschreibung_id, modul_id, erfasst_von, note_wert, bestanden, versuch, pruefungsdatum, status, erfasst_am
-- Integer IDs (BIGINT/SERIAL)
-- ID Mapping:
--   Note IDs: 1, 2, 3, ... (auto-increment style)
--   einschreibung_id: 1-35 (matching Studiengang-Service)
--   modul_id: BVT 1-30, FSA 101-130
--   erfasst_von (Dozenten): 10-14
-- =====================================================

-- =====================================================
-- BVT SEMESTER 6 - Fast alle Module abgeschlossen
-- =====================================================

-- MAX MUSTERMANN (einschreibung_id=1) - Guter Durchschnitt ~2.0
INSERT INTO noten (id, einschreibung_id, modul_id, erfasst_von, note_wert, bestanden, versuch, pruefungsdatum, status, erfasst_am) VALUES
    -- Semester 1-2
    (1, 1, 1, 10, 2.3, true, 1, '2023-02-15', 'FREIGEGEBEN', '2023-02-15 10:00:00'),
    (2, 1, 2, 10, 1.7, true, 1, '2023-02-18', 'FREIGEGEBEN', '2023-02-18 10:00:00'),
    (3, 1, 3, 11, 2.0, true, 1, '2023-02-20', 'FREIGEGEBEN', '2023-02-20 10:00:00'),
    (4, 1, 4, 11, 1.3, true, 1, '2023-02-22', 'FREIGEGEBEN', '2023-02-22 10:00:00'),
    (5, 1, 5, 10, 2.7, true, 1, '2023-02-25', 'FREIGEGEBEN', '2023-02-25 10:00:00'),
    (6, 1, 6, 10, 2.0, true, 1, '2023-07-10', 'FREIGEGEBEN', '2023-07-10 10:00:00'),
    (7, 1, 7, 11, 2.3, true, 1, '2023-07-12', 'FREIGEGEBEN', '2023-07-12 10:00:00'),
    (8, 1, 8, 11, 1.7, true, 1, '2023-07-15', 'FREIGEGEBEN', '2023-07-15 10:00:00'),
    (9, 1, 9, 10, 3.0, true, 1, '2023-07-18', 'FREIGEGEBEN', '2023-07-18 10:00:00'),
    (10, 1, 10, 12, 2.0, true, 1, '2023-07-22', 'FREIGEGEBEN', '2023-07-22 10:00:00'),
    -- Semester 3-4
    (11, 1, 11, 11, 2.0, true, 1, '2024-02-10', 'FREIGEGEBEN', '2024-02-10 10:00:00'),
    (12, 1, 12, 11, 1.7, true, 1, '2024-02-12', 'FREIGEGEBEN', '2024-02-12 10:00:00'),
    (13, 1, 13, 12, 2.3, true, 1, '2024-02-15', 'FREIGEGEBEN', '2024-02-15 10:00:00'),
    (14, 1, 14, 10, 2.7, true, 1, '2024-02-18', 'FREIGEGEBEN', '2024-02-18 10:00:00'),
    (15, 1, 15, 11, NULL, true, 1, '2024-02-20', 'FREIGEGEBEN', '2024-02-20 10:00:00'),
    (16, 1, 16, 12, 2.0, true, 1, '2024-07-10', 'FREIGEGEBEN', '2024-07-10 10:00:00'),
    (17, 1, 17, 12, 2.3, true, 1, '2024-07-12', 'FREIGEGEBEN', '2024-07-12 10:00:00'),
    (18, 1, 18, 12, 1.7, true, 1, '2024-07-15', 'FREIGEGEBEN', '2024-07-15 10:00:00'),
    (19, 1, 19, 11, NULL, true, 1, '2024-07-18', 'FREIGEGEBEN', '2024-07-18 10:00:00'),
    -- Semester 5-6
    (20, 1, 21, 12, NULL, true, 1, '2025-02-28', 'FREIGEGEBEN', '2025-02-28 10:00:00'),
    (21, 1, 22, 12, 2.0, true, 1, '2026-01-15', 'VALIDIERT', '2026-01-15 10:00:00')
ON CONFLICT (id) DO NOTHING;

-- ANNA SCHMIDT (einschreibung_id=2) - Sehr guter Durchschnitt ~1.3
INSERT INTO noten (id, einschreibung_id, modul_id, erfasst_von, note_wert, bestanden, versuch, pruefungsdatum, status, erfasst_am) VALUES
    (22, 2, 1, 10, 1.0, true, 1, '2023-02-15', 'FREIGEGEBEN', '2023-02-15 10:00:00'),
    (23, 2, 2, 10, 1.3, true, 1, '2023-02-18', 'FREIGEGEBEN', '2023-02-18 10:00:00'),
    (24, 2, 3, 11, 1.0, true, 1, '2023-02-20', 'FREIGEGEBEN', '2023-02-20 10:00:00'),
    (25, 2, 4, 11, 1.3, true, 1, '2023-02-22', 'FREIGEGEBEN', '2023-02-22 10:00:00'),
    (26, 2, 5, 10, 1.7, true, 1, '2023-02-25', 'FREIGEGEBEN', '2023-02-25 10:00:00'),
    (27, 2, 6, 10, 1.3, true, 1, '2023-07-10', 'FREIGEGEBEN', '2023-07-10 10:00:00'),
    (28, 2, 7, 11, 1.0, true, 1, '2023-07-12', 'FREIGEGEBEN', '2023-07-12 10:00:00'),
    (29, 2, 8, 11, 1.3, true, 1, '2023-07-15', 'FREIGEGEBEN', '2023-07-15 10:00:00'),
    (30, 2, 9, 10, 1.7, true, 1, '2023-07-18', 'FREIGEGEBEN', '2023-07-18 10:00:00'),
    (31, 2, 10, 12, 1.3, true, 1, '2023-07-22', 'FREIGEGEBEN', '2023-07-22 10:00:00'),
    (32, 2, 11, 11, 1.0, true, 1, '2024-02-10', 'FREIGEGEBEN', '2024-02-10 10:00:00'),
    (33, 2, 12, 11, 1.3, true, 1, '2024-02-12', 'FREIGEGEBEN', '2024-02-12 10:00:00'),
    (34, 2, 13, 12, 1.0, true, 1, '2024-02-15', 'FREIGEGEBEN', '2024-02-15 10:00:00'),
    (35, 2, 14, 10, 1.7, true, 1, '2024-02-18', 'FREIGEGEBEN', '2024-02-18 10:00:00'),
    (36, 2, 15, 11, NULL, true, 1, '2024-02-20', 'FREIGEGEBEN', '2024-02-20 10:00:00'),
    (37, 2, 16, 12, 1.3, true, 1, '2024-07-10', 'FREIGEGEBEN', '2024-07-10 10:00:00'),
    (38, 2, 17, 12, 1.0, true, 1, '2024-07-12', 'FREIGEGEBEN', '2024-07-12 10:00:00'),
    (39, 2, 18, 12, 1.7, true, 1, '2024-07-15', 'FREIGEGEBEN', '2024-07-15 10:00:00'),
    (40, 2, 19, 11, NULL, true, 1, '2024-07-18', 'FREIGEGEBEN', '2024-07-18 10:00:00'),
    (41, 2, 21, 12, NULL, true, 1, '2025-02-28', 'FREIGEGEBEN', '2025-02-28 10:00:00'),
    (42, 2, 22, 12, 1.3, true, 1, '2026-01-15', 'FREIGEGEBEN', '2026-01-15 10:00:00'),
    (43, 2, 23, 12, 1.0, true, 1, '2026-01-18', 'VALIDIERT', '2026-01-18 10:00:00')
ON CONFLICT (id) DO NOTHING;

-- FELIX BAUER (einschreibung_id=3) - Durchschnitt ~2.5, eine Wiederholung
INSERT INTO noten (id, einschreibung_id, modul_id, erfasst_von, note_wert, bestanden, versuch, pruefungsdatum, status, erfasst_am) VALUES
    (44, 3, 1, 10, 2.7, true, 1, '2023-02-15', 'FREIGEGEBEN', '2023-02-15 10:00:00'),
    (45, 3, 2, 10, 2.3, true, 1, '2023-02-18', 'FREIGEGEBEN', '2023-02-18 10:00:00'),
    (46, 3, 3, 11, 3.0, true, 1, '2023-02-20', 'FREIGEGEBEN', '2023-02-20 10:00:00'),
    (47, 3, 4, 11, 2.0, true, 1, '2023-02-22', 'FREIGEGEBEN', '2023-02-22 10:00:00'),
    (48, 3, 5, 10, 2.7, true, 1, '2023-02-25', 'FREIGEGEBEN', '2023-02-25 10:00:00'),
    -- Mathe II: erst nicht bestanden, dann Wiederholung bestanden
    (49, 3, 6, 10, 5.0, false, 1, '2023-07-10', 'FREIGEGEBEN', '2023-07-10 10:00:00'),
    (50, 3, 6, 10, 3.7, true, 2, '2023-10-15', 'FREIGEGEBEN', '2023-10-15 10:00:00'),
    (51, 3, 7, 11, 2.7, true, 1, '2023-07-12', 'FREIGEGEBEN', '2023-07-12 10:00:00'),
    (52, 3, 8, 11, 2.3, true, 1, '2023-07-15', 'FREIGEGEBEN', '2023-07-15 10:00:00'),
    (53, 3, 9, 10, 3.3, true, 1, '2023-07-18', 'FREIGEGEBEN', '2023-07-18 10:00:00'),
    (54, 3, 10, 12, 2.7, true, 1, '2023-07-22', 'FREIGEGEBEN', '2023-07-22 10:00:00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- BVT SEMESTER 4 - Module bis Semester 3 abgeschlossen
-- =====================================================

-- LISA MEYER (einschreibung_id=4)
INSERT INTO noten (id, einschreibung_id, modul_id, erfasst_von, note_wert, bestanden, versuch, pruefungsdatum, status, erfasst_am) VALUES
    (55, 4, 1, 10, 1.7, true, 1, '2024-02-15', 'FREIGEGEBEN', '2024-02-15 10:00:00'),
    (56, 4, 2, 10, 2.0, true, 1, '2024-02-18', 'FREIGEGEBEN', '2024-02-18 10:00:00'),
    (57, 4, 3, 11, 1.3, true, 1, '2024-02-20', 'FREIGEGEBEN', '2024-02-20 10:00:00'),
    (58, 4, 4, 11, 2.0, true, 1, '2024-02-22', 'FREIGEGEBEN', '2024-02-22 10:00:00'),
    (59, 4, 5, 10, 1.7, true, 1, '2024-02-25', 'FREIGEGEBEN', '2024-02-25 10:00:00'),
    (60, 4, 6, 10, 2.3, true, 1, '2024-07-10', 'FREIGEGEBEN', '2024-07-10 10:00:00'),
    (61, 4, 7, 11, 1.7, true, 1, '2024-07-12', 'FREIGEGEBEN', '2024-07-12 10:00:00'),
    (62, 4, 8, 11, 1.3, true, 1, '2024-07-15', 'FREIGEGEBEN', '2024-07-15 10:00:00'),
    (63, 4, 9, 10, 2.0, true, 1, '2024-07-18', 'FREIGEGEBEN', '2024-07-18 10:00:00'),
    (64, 4, 10, 12, 1.7, true, 1, '2024-07-22', 'FREIGEGEBEN', '2024-07-22 10:00:00'),
    -- Semester 3 Module
    (65, 4, 11, 11, 2.0, true, 1, '2025-02-10', 'FREIGEGEBEN', '2025-02-10 10:00:00'),
    (66, 4, 12, 11, 1.7, true, 1, '2025-02-12', 'FREIGEGEBEN', '2025-02-12 10:00:00'),
    -- Semester 4 noch offen
    (67, 4, 16, 12, 1.7, true, 1, '2026-01-10', 'VALIDIERT', '2026-01-10 10:00:00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- BVT SEMESTER 3 - Semester 1+2 abgeschlossen
-- =====================================================

-- MIA SCHULZ (einschreibung_id=8)
INSERT INTO noten (id, einschreibung_id, modul_id, erfasst_von, note_wert, bestanden, versuch, pruefungsdatum, status, erfasst_am) VALUES
    (68, 8, 1, 10, 2.3, true, 1, '2024-09-15', 'FREIGEGEBEN', '2024-09-15 10:00:00'),
    (69, 8, 2, 10, 2.0, true, 1, '2024-09-18', 'FREIGEGEBEN', '2024-09-18 10:00:00'),
    (70, 8, 3, 11, 2.7, true, 1, '2024-09-20', 'FREIGEGEBEN', '2024-09-20 10:00:00'),
    (71, 8, 4, 11, 1.7, true, 1, '2024-09-22', 'FREIGEGEBEN', '2024-09-22 10:00:00'),
    (72, 8, 5, 10, 2.3, true, 1, '2024-09-25', 'FREIGEGEBEN', '2024-09-25 10:00:00'),
    (73, 8, 6, 10, 2.0, true, 1, '2025-02-10', 'FREIGEGEBEN', '2025-02-10 10:00:00'),
    (74, 8, 7, 11, 2.3, true, 1, '2025-02-12', 'FREIGEGEBEN', '2025-02-12 10:00:00'),
    (75, 8, 8, 11, 1.7, true, 1, '2025-02-15', 'FREIGEGEBEN', '2025-02-15 10:00:00'),
    (76, 8, 9, 10, 2.7, true, 1, '2025-02-18', 'FREIGEGEBEN', '2025-02-18 10:00:00'),
    (77, 8, 10, 12, 2.0, true, 1, '2025-02-22', 'FREIGEGEBEN', '2025-02-22 10:00:00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- BVT SEMESTER 2 - Nur Semester 1 abgeschlossen
-- =====================================================

-- TIM SCHROEDER (einschreibung_id=13)
INSERT INTO noten (id, einschreibung_id, modul_id, erfasst_von, note_wert, bestanden, versuch, pruefungsdatum, status, erfasst_am) VALUES
    (78, 13, 1, 10, 2.0, true, 1, '2025-02-15', 'FREIGEGEBEN', '2025-02-15 10:00:00'),
    (79, 13, 2, 10, 2.3, true, 1, '2025-02-18', 'FREIGEGEBEN', '2025-02-18 10:00:00'),
    (80, 13, 3, 11, 1.7, true, 1, '2025-02-20', 'FREIGEGEBEN', '2025-02-20 10:00:00'),
    (81, 13, 4, 11, 2.7, true, 1, '2025-02-22', 'FREIGEGEBEN', '2025-02-22 10:00:00'),
    (82, 13, 5, 10, 2.0, true, 1, '2025-02-25', 'FREIGEGEBEN', '2025-02-25 10:00:00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- FSA MASTER SEMESTER 4
-- =====================================================

-- SOPHIE BRAUN (einschreibung_id=21)
-- FSA Module: 101-130
INSERT INTO noten (id, einschreibung_id, modul_id, erfasst_von, note_wert, bestanden, versuch, pruefungsdatum, status, erfasst_am) VALUES
    (83, 21, 101, 13, 1.3, true, 1, '2024-02-15', 'FREIGEGEBEN', '2024-02-15 10:00:00'),
    (84, 21, 102, 13, 1.7, true, 1, '2024-02-18', 'FREIGEGEBEN', '2024-02-18 10:00:00'),
    (85, 21, 103, 13, 1.3, true, 1, '2024-02-20', 'FREIGEGEBEN', '2024-02-20 10:00:00'),
    (86, 21, 104, 14, 1.7, true, 1, '2024-02-22', 'FREIGEGEBEN', '2024-02-22 10:00:00'),
    (87, 21, 105, 13, 1.0, true, 1, '2024-02-25', 'FREIGEGEBEN', '2024-02-25 10:00:00'),
    (88, 21, 106, 13, 1.7, true, 1, '2024-07-10', 'FREIGEGEBEN', '2024-07-10 10:00:00'),
    (89, 21, 107, 13, 1.3, true, 1, '2024-07-12', 'FREIGEGEBEN', '2024-07-12 10:00:00'),
    (90, 21, 108, 14, 2.0, true, 1, '2024-07-15', 'FREIGEGEBEN', '2024-07-15 10:00:00'),
    (91, 21, 109, 14, 1.7, true, 1, '2024-07-18', 'FREIGEGEBEN', '2024-07-18 10:00:00'),
    (92, 21, 110, 13, 1.3, true, 1, '2024-07-22', 'FREIGEGEBEN', '2024-07-22 10:00:00'),
    (93, 21, 111, 14, 1.7, true, 1, '2025-02-10', 'FREIGEGEBEN', '2025-02-10 10:00:00'),
    (94, 21, 112, 13, 1.3, true, 1, '2025-02-15', 'FREIGEGEBEN', '2025-02-15 10:00:00'),
    (95, 21, 113, 13, 1.7, true, 1, '2025-02-18', 'FREIGEGEBEN', '2025-02-18 10:00:00'),
    (96, 21, 114, 14, 2.0, true, 1, '2025-02-22', 'FREIGEGEBEN', '2025-02-22 10:00:00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- FSA MASTER SEMESTER 2
-- =====================================================

-- ELENA VOGT (einschreibung_id=27)
INSERT INTO noten (id, einschreibung_id, modul_id, erfasst_von, note_wert, bestanden, versuch, pruefungsdatum, status, erfasst_am) VALUES
    (97, 27, 101, 13, 2.0, true, 1, '2025-02-15', 'FREIGEGEBEN', '2025-02-15 10:00:00'),
    (98, 27, 102, 13, 1.7, true, 1, '2025-02-18', 'FREIGEGEBEN', '2025-02-18 10:00:00'),
    (99, 27, 103, 13, 2.3, true, 1, '2025-02-20', 'FREIGEGEBEN', '2025-02-20 10:00:00'),
    (100, 27, 104, 14, 1.7, true, 1, '2025-02-22', 'FREIGEGEBEN', '2025-02-22 10:00:00'),
    (101, 27, 105, 13, 2.0, true, 1, '2025-02-25', 'FREIGEGEBEN', '2025-02-25 10:00:00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Update sequence to continue after seeded data
-- =====================================================
SELECT setval('noten_id_seq', (SELECT MAX(id) FROM noten), true);
