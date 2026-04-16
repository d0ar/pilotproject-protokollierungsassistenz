# Feature-Ideen & Todo-Liste

Mögliche Features für die Protokollierungsassistenz, die noch implementiert werden könnten.

---

## Transkription & Audio

- [ ] **Manuelle Transkriptkorrektur** — Inline-Bearbeitung des transkribierten Texts im Browser, bevor die Zusammenfassung generiert wird
- [ ] **Audio-Player mit Transkript-Synchronisierung** — Beim Klick auf einen Transkript-Abschnitt springt der Audio-Player zur entsprechenden Stelle
- [ ] **Fortschrittsanzeige mit Zeitschätzung** — Während der Transkription eine realistische Restzeit-Schätzung basierend auf Audiodauer und Hardware anzeigen
- [ ] **Batch-Verarbeitung** — Mehrere Audiodateien gleichzeitig hochladen und als Warteschlange verarbeiten lassen
- [ ] **Mehrsprachige Unterstützung** — `WHISPER_LANGUAGE` in der UI konfigurierbar machen, damit auch nicht-deutsche Sitzungen transkribiert werden können

---

## Protokoll & Workflow

- [ ] **Sprecheridentifikation** — Sprecher-IDs manuell mit Namen verknüpfen (z.B. `SPEAKER_01` → `Bürgermeister Müller`), damit im Protokoll echte Namen stehen
- [ ] **Automatische TOP-Erkennung** — LLM oder Heuristiken nutzen, um Tagesordnungspunkte automatisch im Transkript zu erkennen, statt manueller Zuordnung
- [ ] **Prompt-Templates** — Verschiedene vordefinierte Zusammenfassungsstile auswählbar machen (z.B. formelles Protokoll, Kurzfassung, Beschlussprotokoll)

---

## Export & Archiv

- [ ] **Exportformate erweitern** — Zusätzlich zum aktuellen Export auch DOCX- und PDF-Export mit formatiertem Briefkopf für Kommunen anbieten
- [ ] **Sitzungsarchiv** — Vergangene Sitzungen speichern, durchsuchen und erneut aufrufen (persistente Datenhaltung statt ephemerer Jobs)

---

## Infrastruktur

- [ ] **Cloud-LLM-Option** — Neben lokalem Ollama auch OpenAI-kompatible APIs (z.B. OpenAI, Mistral) als Backend für die Zusammenfassung konfigurierbar machen
- [ ] **Benutzerauthentifizierung** — Einfaches Login-System, damit mehrere Nutzer die Instanz nutzen können ohne gegenseitigen Datenzugriff
