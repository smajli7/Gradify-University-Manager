# Berechnungslogik Gesamtnoten nach Prüfungsordnung

Dieses Dokument beschreibt die detaillierte Berechnungslogik für die Gesamtnoten der beiden Studiengänge gemäß ihrer jeweiligen Prüfungsordnung (PO).

---

## Allgemeine Notenregeln

### Notenskala (Deutsche Hochschulnoten)

| Note | Prädikat         | Beschreibung                              |
|------|------------------|-------------------------------------------|
| 1.0  | sehr gut         | hervorragende Leistung                    |
| 1.3  | sehr gut         | hervorragende Leistung                    |
| 1.7  | gut              | über dem Durchschnitt                     |
| 2.0  | gut              | über dem Durchschnitt                     |
| 2.3  | gut              | über dem Durchschnitt                     |
| 2.7  | befriedigend     | durchschnittliche Leistung                |
| 3.0  | befriedigend     | durchschnittliche Leistung                |
| 3.3  | befriedigend     | durchschnittliche Leistung                |
| 3.7  | ausreichend      | trotz Mängeln noch den Anforderungen entsprechend |
| 4.0  | ausreichend      | trotz Mängeln noch den Anforderungen entsprechend |
| 5.0  | nicht ausreichend| nicht bestanden                           |

### Bestehensgrenze

Eine Modulprüfung gilt als **bestanden**, wenn:
- Note ≤ 4.0 (mindestens "ausreichend")
- Bei "bestanden/nicht bestanden" Modulen: `bestanden = true`

### Rundungsregeln

Die Gesamtnote wird auf **eine Dezimalstelle** gerundet:
- Kaufmännische Rundung (0-4 abrunden, 5-9 aufrunden)
- Beispiel: 2.45 → 2.5, 2.44 → 2.4

---

## Studiengang 1: Bioverfahrenstechnik (Bachelor)

**Rechtsgrundlage:** § 11 Bildung der Gesamtnote (PO 2023)

### Berechnungsformel

```
                    Σ (Modul_Note_i × Gewichtung_i)
Gesamtnote = ─────────────────────────────────────────
                       Σ (Gewichtung_i)
```

Wobei nur Module mit `in_gesamtnote = true` und `bewertungsart = NOTE` berücksichtigt werden.

### Vollständige Modulliste mit Gewichtungen (Allgemeine Studienvariante)

| Nr. | Modulname                                    | ECTS | Gew. | In Berechnung |
|-----|----------------------------------------------|------|------|---------------|
| 1   | Einführung in die Bioverfahrenstechnik       | 5    | 0    | ❌ Nein        |
| 2   | Technische Mechanik                          | 5    | 1    | ✅ Ja          |
| 3   | Konstruktion                                 | 5    | 1    | ✅ Ja          |
| 4   | Mathematik 1                                 | 10   | 2    | ✅ Ja          |
| 5   | Physik                                       | 5    | 1    | ✅ Ja          |
| 6   | Elektrotechnik                               | 5    | 1    | ✅ Ja          |
| 7   | Informatik                                   | 5    | 1    | ✅ Ja          |
| 8   | Mathematik 2                                 | 5    | 1    | ✅ Ja          |
| 9   | Allgemeine und Anorganische Chemie           | 5    | 1    | ✅ Ja          |
| 10  | Mikrobiologie                                | 5    | 1    | ✅ Ja          |
| 11  | English for Life Sciences and Engineering   | 5    | 1    | ✅ Ja          |
| 12  | Technische Thermodynamik                     | 5    | 1    | ✅ Ja          |
| 13  | Anlagenplanung                               | 5    | 1    | ✅ Ja          |
| 14  | Werkstofftechnik                             | 5    | 1    | ✅ Ja          |
| 15  | Fluid Dynamics                               | 5    | 1    | ✅ Ja          |
| 16  | Organische Chemie                            | 5    | 1    | ✅ Ja          |
| 17  | Molekularbiologie und Gentechnik             | 5    | 1    | ✅ Ja          |
| 18  | Heat and Mass Transfer                       | 5    | 1    | ✅ Ja          |
| 19  | Mechanical Process Engineering               | 5    | 1    | ✅ Ja          |
| 20  | Process Automation                           | 5    | 1    | ✅ Ja          |
| 21  | Wahlpflichtmodul 1                           | 5    | 1    | ✅ Ja          |
| 22  | Physical Chemistry and Chemical Reaction Eng.| 5    | 1    | ✅ Ja          |
| 23  | Biochemistry                                 | 5    | 1    | ✅ Ja          |
| 24  | Thermische Verfahrenstechnik                 | 5    | 1    | ✅ Ja          |
| 25  | Ethik und Recht                              | 5    | 1    | ✅ Ja          |
| 26  | Interdisziplinäres Studium Generale          | 5    | 1    | ✅ Ja          |
| 27  | Wahlpflichtmodul 2                           | 5    | 1    | ✅ Ja          |
| 28  | Bioprozesstechnik                            | 5    | 1    | ✅ Ja          |
| 29  | Zellkulturtechnik                            | 5    | 1    | ✅ Ja          |
| 30  | Prozesssimulation                            | 5    | 1    | ✅ Ja          |
| 31  | Teamprojekt                                  | 10   | 2    | ✅ Ja          |
| 32  | Praxisphase                                  | 30   | 5    | ✅ Ja          |
| 33  | Bachelor-Arbeit mit Kolloquium               | 15   | 9    | ✅ Ja          |

**Summe Gewichtungen:** 37 (ohne Modul 1)

### Beispielberechnung BVT

Angenommen, ein Student hat folgende Noten:

| Modul | Note | Gewichtung | Note × Gew. |
|-------|------|------------|-------------|
| 2     | 2.3  | 1          | 2.3         |
| 3     | 1.7  | 1          | 1.7         |
| 4     | 2.0  | 2          | 4.0         |
| ...   | ...  | ...        | ...         |
| 33    | 1.3  | 9          | 11.7        |

```
Gesamtnote = Σ(Note × Gew.) / Σ(Gew.) = 67.5 / 37 = 1.82 → 1.8
```

## Studiengang 2: Forschung in der Sozialen Arbeit (Master)

**Rechtsgrundlage:** § 9 Bildung der Gesamtnote (PO 2022)

### Berechnungsformel

```
                2 × Note_Thesis + 1 × Modulmittel
Gesamtnote = ─────────────────────────────────────
                              3
```

**Wobei Modulmittel:**
```
                  Note_1 + Note_2 + Note_3 + Note_4 + Note_5 + Note_7 + Note_8
Modulmittel = ─────────────────────────────────────────────────────────────────
                                           7
```

### Vollständige Modulliste mit Berechnungsrelevanz

| Nr.  | Modulname                                                | ECTS | Berechnung           |
|------|----------------------------------------------------------|------|----------------------|
| 1    | Paradigmatische, theoretische und methodologische Grundlegung | 10   | → Modulmittel        |
| 2    | Quantitative Forschungsmethoden                          | 10   | → Modulmittel        |
| 3    | Statistik I                                              | 5    | → Modulmittel        |
| 4    | Qualitativ-rekonstruktive Forschungsmethoden             | 10   | → Modulmittel        |
| 5.1  | Forschungsprojekt qualitativ-rekonstruktiv (ODER)        | 30   | → Modulmittel        |
| 5.2  | Forschungsprojekt quantitativ (ODER)                     | 30   | → Modulmittel        |
| 6    | Aktuelle Forschungen in der Sozialen Arbeit              | 5    | ❌ bestanden/n.b.    |
| 7    | Statistik II                                             | 5    | → Modulmittel        |
| 8.1  | Forschungsfelder: Jugendhilfe (ODER)                     | 5    | → Modulmittel        |
| 8.2  | Forschungsfelder: Sozialplanung (ODER)                   | 5    | → Modulmittel        |
| 8.3  | Forschungsfelder: Evaluation (ODER)                      | 5    | → Modulmittel        |
| 9    | Empirische Vertiefung                                    | 5    | ❌ bestanden/n.b.    |
| 10   | Projektorientiertes wiss. Arbeiten / Forschungswerkstatt | 5    | ❌ bestanden/n.b.    |
| 11   | Forschung beantragen, planen und verwalten               | 5    | ❌ bestanden/n.b.    |
| 12   | Master-Thesis mit Kolloquium                             | 25   | → ×2 Gewichtung      |

**Hinweis zu Wahlpflichtmodulen:**
- Modul 5: Wahl zwischen 5.1 (qualitativ) ODER 5.2 (quantitativ)
- Modul 8: Wahl zwischen 8.1, 8.2 ODER 8.3

### Beispielberechnung FSA

Angenommen, ein Student hat folgende Noten:

| Modul | Note  |
|-------|-------|
| 1     | 1.7   |
| 2     | 2.0   |
| 3     | 2.3   |
| 4     | 1.3   |
| 5.2   | 1.7   |
| 7     | 2.0   |
| 8.1   | 1.7   |
| 12    | 1.3   |

**Schritt 1: Modulmittel berechnen**
```
Modulmittel = (1.7 + 2.0 + 2.3 + 1.3 + 1.7 + 2.0 + 1.7) / 7
            = 12.7 / 7
            = 1.814...
```

**Schritt 2: Gesamtnote berechnen**
```
Gesamtnote = (2 × 1.3 + 1 × 1.814) / 3
           = (2.6 + 1.814) / 3
           = 4.414 / 3
           = 1.471... → 1.5
```


## Vergleich der Berechnungslogiken

| Aspekt                    | Bioverfahrenstechnik (BA)          | Forschung Soziale Arbeit (MA)      |
|---------------------------|------------------------------------|------------------------------------|
| **Berechnungsart**        | Gewichtete Summe                   | Arithmetisch gemischt              |
| **Formel**                | Σ(Note×Gew)/Σ(Gew)                 | (2×Thesis + 1×Mittel)/3            |
| **Anzahl Module**         | 33 (Allgemein)                     | 12                                 |
| **Module ohne Note**      | 1 (Einführung)                     | 4 (Module 6, 9, 10, 11)            |
| **Max. Gewichtung**       | 9 (Bachelor-Arbeit)                | 2 (Master-Thesis)                  |
| **Gesamtgewicht**         | 37                                 | 3                                  |
| **Wahlpflicht**           | 2 Module frei wählbar              | 2 Gruppen mit je 2-3 Optionen      |

---


## Validierungsregeln

### Bei Notenerfassung

1. **Notenbereich:** 1.0 ≤ Note ≤ 5.0
2. **Gültige Notenwerte:** 1.0, 1.3, 1.7, 2.0, 2.3, 2.7, 3.0, 3.3, 3.7, 4.0, 5.0
3. **Bestanden/Nicht bestanden:** Nur für Module mit `bewertungsart = BESTANDEN_NICHT_BESTANDEN`
4. **Wiederholungsversuch:** Max. 3 (bzw. 4 bei Antrag), außer Abschlussarbeit (max. 2)

### Bei Gesamtnotenberechnung

1. Nur bestandene Module (Note ≤ 4.0) werden berücksichtigt
2. Module mit Gewichtung 0 werden ausgeschlossen
3. "Bestanden/nicht bestanden" Module werden ausgeschlossen
4. Rundung erfolgt kaufmännisch auf 1 Dezimalstelle

---

*Zuletzt aktualisiert: 08.01.2026*




