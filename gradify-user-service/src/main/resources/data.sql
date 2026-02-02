-- =====================================================
-- GRADIFY USER-SERVICE - SEED DATA
-- =====================================================
-- Diese Datei wird beim Start automatisch geladen
-- Bearbeite sie, um die Testdaten anzupassen
-- =====================================================
-- ID-Schema:
--   Rollen: 1-5
--   Admin/Mitarbeiter: 1-2
--   Dozenten: 10-14
--   Studenten-Benutzer: 101-135
--   Studenten: 1-35
--   Mandant: 1
-- =====================================================

-- =====================================================
-- ROLLEN
-- =====================================================
INSERT INTO rollen (id, name, beschreibung) VALUES
    (1, 'ROLE_STUDENT', 'Studierende'),
    (2, 'ROLE_LEHRENDER', 'Lehrende/Dozenten'),
    (3, 'ROLE_PRUEFUNGSAMT', 'Prüfungsamt-Mitarbeiter'),
    (4, 'ROLE_STUDIENGANGLEITUNG', 'Studiengangsleitungen'),
    (5, 'ROLE_ADMIN', 'System-Administratoren')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- BENUTZER - ADMIN & MITARBEITER
-- Passwort für alle: web00100113!
-- BCrypt Hash mit Rounds=10
-- =====================================================
INSERT INTO benutzer (id, benutzername, email, passwort_hash, vorname, nachname, mandant_id, aktiv, erstellt_am) VALUES
    -- Admin
    (1, 'admin', 'admin@gradify.local', 
     '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 
     'System', 'Administrator', 1, true, NOW()),
    -- Prüfungsamt
    (2, 'pruefungsamt', 'pruefungsamt@thm.de', 
     '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 
     'Paula', 'Prüfung', 1, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- BENUTZER - DOZENTEN (10-14)
-- =====================================================
INSERT INTO benutzer (id, benutzername, email, passwort_hash, vorname, nachname, mandant_id, aktiv, erstellt_am) VALUES
    -- BVT Dozenten
    (10, 'prof.mueller', 'mueller@thm.de', 
     '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 
     'Prof. Dr. Max', 'Mueller', 1, true, NOW()),
    (11, 'prof.schmidt', 'schmidt@thm.de', 
     '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 
     'Prof. Dr. Anna', 'Schmidt', 1, true, NOW()),
    (12, 'prof.weber', 'weber@thm.de', 
     '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 
     'Prof. Dr. Thomas', 'Weber', 1, true, NOW()),
    -- FSA Dozenten
    (13, 'prof.klein', 'klein@thm.de', 
     '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 
     'Prof. Dr. Lisa', 'Klein', 1, true, NOW()),
    (14, 'prof.richter', 'richter@thm.de', 
     '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 
     'Prof. Dr. Michael', 'Richter', 1, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- BENUTZER - STUDENTEN (101-135)
-- BVT: 101-120, FSA: 121-135
-- =====================================================
INSERT INTO benutzer (id, benutzername, email, passwort_hash, vorname, nachname, mandant_id, aktiv, erstellt_am) VALUES
    -- ===== BVT STUDENTEN (101-120) =====
    -- Semester 6 (kurz vor Abschluss)
    (101, 'max.mustermann', 'max.mustermann@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Max', 'Mustermann', 1, true, NOW()),
    (102, 'anna.schmidt', 'anna.schmidt@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Anna', 'Schmidt', 1, true, NOW()),
    (103, 'felix.bauer', 'felix.bauer@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Felix', 'Bauer', 1, true, NOW()),
    
    -- Semester 4
    (104, 'lisa.meyer', 'lisa.meyer@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Lisa', 'Meyer', 1, true, NOW()),
    (105, 'jonas.wagner', 'jonas.wagner@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Jonas', 'Wagner', 1, true, NOW()),
    (106, 'emma.fischer', 'emma.fischer@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Emma', 'Fischer', 1, true, NOW()),
    (107, 'lukas.hoffmann', 'lukas.hoffmann@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Lukas', 'Hoffmann', 1, true, NOW()),
    
    -- Semester 3
    (108, 'mia.schulz', 'mia.schulz@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Mia', 'Schulz', 1, true, NOW()),
    (109, 'leon.koch', 'leon.koch@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Leon', 'Koch', 1, true, NOW()),
    (110, 'sophie.richter', 'sophie.richter@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Sophie', 'Richter', 1, true, NOW()),
    (111, 'paul.klein', 'paul.klein@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Paul', 'Klein', 1, true, NOW()),
    (112, 'lena.wolf', 'lena.wolf@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Lena', 'Wolf', 1, true, NOW()),
    
    -- Semester 2
    (113, 'tim.schroeder', 'tim.schroeder@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Tim', 'Schröder', 1, true, NOW()),
    (114, 'laura.neumann', 'laura.neumann@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Laura', 'Neumann', 1, true, NOW()),
    (115, 'niklas.schwarz', 'niklas.schwarz@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Niklas', 'Schwarz', 1, true, NOW()),
    (116, 'julia.zimmermann', 'julia.zimmermann@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Julia', 'Zimmermann', 1, true, NOW()),
    
    -- Semester 1 (Erstsemester)
    (117, 'leon.weber', 'leon.weber@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Leon', 'Weber', 1, true, NOW()),
    (118, 'marie.braun', 'marie.braun@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Marie', 'Braun', 1, true, NOW()),
    (119, 'david.hartmann', 'david.hartmann@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'David', 'Hartmann', 1, true, NOW()),
    (120, 'sarah.lange', 'sarah.lange@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Sarah', 'Lange', 1, true, NOW()),
    
    -- ===== FSA MASTER STUDENTEN (121-135) =====
    -- Semester 4 (Masterarbeit)
    (121, 'sophie.braun', 'sophie.braun@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Sophie', 'Braun', 1, true, NOW()),
    (122, 'markus.jung', 'markus.jung@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Markus', 'Jung', 1, true, NOW()),
    
    -- Semester 3
    (123, 'nina.krause', 'nina.krause@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Nina', 'Krause', 1, true, NOW()),
    (124, 'kevin.frank', 'kevin.frank@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Kevin', 'Frank', 1, true, NOW()),
    (125, 'lisa.sommer', 'lisa.sommer@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Lisa', 'Sommer', 1, true, NOW()),
    (126, 'jan.winter', 'jan.winter@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Jan', 'Winter', 1, true, NOW()),
    
    -- Semester 2
    (127, 'elena.vogt', 'elena.vogt@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Elena', 'Vogt', 1, true, NOW()),
    (128, 'tobias.stein', 'tobias.stein@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Tobias', 'Stein', 1, true, NOW()),
    (129, 'julia.berger', 'julia.berger@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Julia', 'Berger', 1, true, NOW()),
    (130, 'alexander.horn', 'alexander.horn@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Alexander', 'Horn', 1, true, NOW()),
    
    -- Semester 1 (Neue Master-Studenten)
    (131, 'tim.hoffmann', 'tim.hoffmann@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Tim', 'Hoffmann', 1, true, NOW()),
    (132, 'carla.huber', 'carla.huber@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Carla', 'Huber', 1, true, NOW()),
    (133, 'florian.keller', 'florian.keller@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Florian', 'Keller', 1, true, NOW()),
    (134, 'hannah.beck', 'hannah.beck@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Hannah', 'Beck', 1, true, NOW()),
    (135, 'simon.lorenz', 'simon.lorenz@student.thm.de', '$2a$10$3K8silUv89xnxcL0p.z2HOb2xmgAst8GZs0N.Ojf9bfj9vTSz05G2', 'Simon', 'Lorenz', 1, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- BENUTZER-ROLLEN ZUWEISUNGEN
-- =====================================================
INSERT INTO benutzer_rolle (benutzer_id, rolle_id) VALUES
    -- Admin & Mitarbeiter
    (1, 5), -- Admin -> ROLE_ADMIN
    (2, 3), -- Prüfungsamt -> ROLE_PRUEFUNGSAMT
    -- Dozenten -> ROLE_LEHRENDER
    (10, 2),
    (11, 2),
    (12, 2),
    (13, 2),
    (14, 2)
ON CONFLICT DO NOTHING;

-- Studenten-Rollen -> ROLE_STUDENT
INSERT INTO benutzer_rolle (benutzer_id, rolle_id) VALUES
    (101, 1),
    (102, 1),
    (103, 1),
    (104, 1),
    (105, 1),
    (106, 1),
    (107, 1),
    (108, 1),
    (109, 1),
    (110, 1),
    (111, 1),
    (112, 1),
    (113, 1),
    (114, 1),
    (115, 1),
    (116, 1),
    (117, 1),
    (118, 1),
    (119, 1),
    (120, 1),
    (121, 1),
    (122, 1),
    (123, 1),
    (124, 1),
    (125, 1),
    (126, 1),
    (127, 1),
    (128, 1),
    (129, 1),
    (130, 1),
    (131, 1),
    (132, 1),
    (133, 1),
    (134, 1),
    (135, 1)
ON CONFLICT DO NOTHING;

-- =====================================================
-- STUDENTEN (1-35, verknüpft mit Benutzer 101-135)
-- =====================================================
INSERT INTO studenten (id, benutzer_id, matrikelnummer, geburtsdatum, status) VALUES
    -- BVT Semester 6
    (1, 101, '1000001', '1998-05-15', 'AKTIV'),
    (2, 102, '1000002', '1998-08-22', 'AKTIV'),
    (3, 103, '1000003', '1999-01-10', 'AKTIV'),
    -- BVT Semester 4
    (4, 104, '1000004', '1999-11-28', 'AKTIV'),
    (5, 105, '1000005', '2000-03-15', 'AKTIV'),
    (6, 106, '1000006', '1999-07-20', 'AKTIV'),
    (7, 107, '1000007', '2000-02-14', 'AKTIV'),
    -- BVT Semester 3
    (8, 108, '1000008', '2000-09-05', 'AKTIV'),
    (9, 109, '1000009', '2000-12-01', 'AKTIV'),
    (10, 110, '1000010', '2001-04-18', 'AKTIV'),
    (11, 111, '1000011', '2000-06-30', 'AKTIV'),
    (12, 112, '1000012', '2001-01-25', 'AKTIV'),
    -- BVT Semester 2
    (13, 113, '1000013', '2001-08-12', 'AKTIV'),
    (14, 114, '1000014', '2001-11-03', 'AKTIV'),
    (15, 115, '1000015', '2002-02-28', 'AKTIV'),
    (16, 116, '1000016', '2001-05-17', 'AKTIV'),
    -- BVT Semester 1
    (17, 117, '1000017', '2002-10-08', 'AKTIV'),
    (18, 118, '1000018', '2003-01-22', 'AKTIV'),
    (19, 119, '1000019', '2002-07-14', 'AKTIV'),
    (20, 120, '1000020', '2002-12-05', 'AKTIV'),
    
    -- FSA Semester 4
    (21, 121, '2000001', '1996-03-20', 'AKTIV'),
    (22, 122, '2000002', '1995-09-15', 'AKTIV'),
    -- FSA Semester 3
    (23, 123, '2000003', '1997-06-28', 'AKTIV'),
    (24, 124, '2000004', '1996-11-10', 'AKTIV'),
    (25, 125, '2000005', '1997-02-14', 'AKTIV'),
    (26, 126, '2000006', '1996-08-03', 'AKTIV'),
    -- FSA Semester 2
    (27, 127, '2000007', '1998-01-19', 'AKTIV'),
    (28, 128, '2000008', '1997-10-25', 'AKTIV'),
    (29, 129, '2000009', '1998-04-08', 'AKTIV'),
    (30, 130, '2000010', '1997-07-30', 'AKTIV'),
    -- FSA Semester 1
    (31, 131, '2000011', '1998-12-12', 'AKTIV'),
    (32, 132, '2000012', '1999-03-05', 'AKTIV'),
    (33, 133, '2000013', '1998-09-18', 'AKTIV'),
    (34, 134, '2000014', '1999-06-22', 'AKTIV'),
    (35, 135, '2000015', '1998-11-01', 'AKTIV')
ON CONFLICT (id) DO NOTHING;
