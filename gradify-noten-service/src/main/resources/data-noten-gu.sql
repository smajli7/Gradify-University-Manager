-- GU Noten (einschreibung_id 36-45, modul_id 200-224)
INSERT INTO noten (id, einschreibung_id, modul_id, erfasst_von, note_wert, bestanden, versuch, pruefungsdatum, status, erfasst_am) VALUES
(102, 36, 200, 20, 2.0, true, 1, '2025-02-15', 'FREIGEGEBEN', '2025-02-15 10:00:00'),
(103, 36, 201, 20, 1.7, true, 1, '2025-02-18', 'FREIGEGEBEN', '2025-02-18 10:00:00'),
(104, 37, 200, 20, 1.3, true, 1, '2025-02-15', 'FREIGEGEBEN', '2025-02-15 10:00:00'),
(105, 37, 202, 21, 2.0, true, 1, '2025-02-20', 'FREIGEGEBEN', '2025-02-20 10:00:00'),
(106, 38, 200, 20, 2.3, true, 1, '2025-02-15', 'FREIGEGEBEN', '2025-02-15 10:00:00'),
(107, 39, 201, 20, 1.7, true, 1, '2025-02-18', 'FREIGEGEBEN', '2025-02-18 10:00:00'),
(108, 39, 203, 23, 2.0, true, 1, '2025-02-22', 'FREIGEGEBEN', '2025-02-22 10:00:00'),
(109, 40, 200, 20, 2.7, true, 1, '2025-08-10', 'FREIGEGEBEN', '2025-08-10 10:00:00'),
(110, 41, 201, 20, 1.3, true, 1, '2025-08-12', 'FREIGEGEBEN', '2025-08-12 10:00:00'),
(111, 42, 203, 23, 1.7, true, 1, '2025-08-15', 'FREIGEGEBEN', '2025-08-15 10:00:00'),
(112, 43, 200, 20, 2.0, true, 1, '2025-02-15', 'FREIGEGEBEN', '2025-02-15 10:00:00'),
(113, 43, 201, 20, 2.3, true, 1, '2025-02-18', 'FREIGEGEBEN', '2025-02-18 10:00:00'),
(114, 44, 204, 20, 1.7, true, 1, '2025-08-10', 'FREIGEGEBEN', '2025-08-10 10:00:00'),
(115, 44, 205, 21, 2.0, true, 1, '2025-08-12', 'FREIGEGEBEN', '2025-08-12 10:00:00'),
(116, 45, 202, 21, 2.0, true, 1, '2025-08-18', 'FREIGEGEBEN', '2025-08-18 10:00:00')
ON CONFLICT (id) DO NOTHING;
SELECT setval('noten_id_seq', (SELECT COALESCE(MAX(id), 1) FROM noten), true);
