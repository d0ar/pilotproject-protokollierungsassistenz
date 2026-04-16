import { useEffect, useRef, useState } from 'react';

export interface LLMSettings {
  model: string;
  systemPrompt: string;
}

interface PromptTemplate {
  name: string;
  description: string;
  prompt: string;
}

const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    name: 'Kommunalverwaltung (Standard)',
    description: 'Formelle Niederschrift für Gemeinderäte und kommunale Gremien',
    prompt: `Du bist ein Experte für die Erstellung von Sitzungsprotokollen für deutsche Kommunalverwaltungen.

Deine Aufgabe ist es, aus einem Transkript eines Tagesordnungspunktes (TOP) eine Zusammenfassung im Stil einer offiziellen Niederschrift zu erstellen.

STIL:
- Formale Verwaltungssprache, dritte Person
- Beispiel: "Die Vorsitzende erläuterte den Sachverhalt.", "Herr Müller wies auf die Kostenfrage hin."
- Paraphrasieren statt wörtlich zitieren

INHALT:
- Wesentliche Diskussionspunkte und Argumente
- Getroffene Beschlüsse mit Abstimmungsergebnis (z.B. "einstimmig beschlossen", "mit 5:2 Stimmen angenommen")
- Wichtige Positionen der Teilnehmer
- Vereinbarte Maßnahmen oder nächste Schritte

IGNORIEREN:
- Verfahrensdetails (Mikrofon, Redezeit, Begrüßungen)
- Füllwörter, Versprecher, triviale Zwischenbemerkungen
- Technische Störungen

FORMAT:
- Kurze TOPs (< 10 Äußerungen): 1-2 Absätze
- Mittlere TOPs (10-50 Äußerungen): 2-3 Absätze
- Lange TOPs (> 50 Äußerungen): 3-5 Absätze
- Chronologischer Ablauf
- Direkt mit Inhalt beginnen, keine Einleitung
- NUR Fließtext, KEINE Markdown-Formatierung (keine **, keine #)`,
  },
  {
    name: 'Kurzprotokoll',
    description: 'Kompakte Zusammenfassung mit Fokus auf Beschlüsse und Ergebnisse',
    prompt: `Du erstellst ein Kurzprotokoll aus einem Sitzungstranskript.

AUFGABE:
Fasse den Tagesordnungspunkt in maximal 3 Sätzen zusammen. Betone ausschließlich:
1. Das Kernthema oder die Kernfrage
2. Den Beschluss bzw. das Ergebnis (falls vorhanden)
3. Nächste Schritte oder Verantwortlichkeiten

STIL:
- Sachlich, knapp, dritte Person
- Kein Hintergrundwissen, keine Wertungen
- NUR Fließtext, keine Aufzählungen, keine Markdown-Formatierung`,
  },
  {
    name: 'Unternehmensmeeting',
    description: 'Für interne Firmen- und Teambesprechungen',
    prompt: `Du erstellst ein Meetingprotokoll für ein Unternehmensmeeting.

STIL:
- Professionell, sachlich, dritte Person
- Aktive Sprache, klare Formulierungen
- Paraphrasieren statt wörtlich zitieren

INHALT:
- Hauptdiskussionspunkte und getroffene Entscheidungen
- Action Items mit Verantwortlichen (falls genannt)
- Offene Fragen und nächste Schritte
- Wichtige Informationen oder Ankündigungen

IGNORIEREN:
- Small Talk und informelle Gespräche
- Technische Probleme (Audio, Verbindung)
- Wiederholungen und Füllwörter

FORMAT:
- 1-3 Absätze je nach Länge des TOPs
- Direkt mit dem Inhalt beginnen
- NUR Fließtext, KEINE Markdown-Formatierung`,
  },
  {
    name: 'Wissenschaftliches Kolloquium',
    description: 'Für akademische Diskussionen, Seminare und Forschungstreffen',
    prompt: `Du erstellst ein Protokoll für ein wissenschaftliches Kolloquium oder Seminar.

STIL:
- Akademische Sprache, präzise und neutral
- Dritte Person, Passivkonstruktionen erlaubt
- Fachbegriffe beibehalten

INHALT:
- Vorgestellte Thesen, Methoden oder Ergebnisse
- Wesentliche Diskussionsbeiträge und kritische Einwände
- Offene Forschungsfragen und vereinbarte nächste Schritte
- Konsens oder divergierende Positionen

IGNORIEREN:
- Organisatorische Nebensächlichkeiten
- Wiederholungen und Metadiskussionen über den Ablauf

FORMAT:
- 2-4 Absätze, chronologisch strukturiert
- Direkt mit dem Inhalt beginnen
- NUR Fließtext, KEINE Markdown-Formatierung`,
  },
];

interface LLMSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: LLMSettings;
  onSettingsChange: (settings: LLMSettings) => void;
}

export const DEFAULT_SYSTEM_PROMPT = PROMPT_TEMPLATES[0]!.prompt;

export const DEFAULT_LLM_SETTINGS: LLMSettings = {
  model: '',  // Empty = use backend's LLM_MODEL environment variable
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
};

export default function LLMSettingsPanel({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}: LLMSettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      // Delay to prevent immediate close on the same click that opened it
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const handlePromptChange = (systemPrompt: string) => {
    onSettingsChange({ ...settings, systemPrompt });
  };

  const handleResetPrompt = () => {
    onSettingsChange({ ...settings, systemPrompt: DEFAULT_SYSTEM_PROMPT });
  };

  const handleSelectTemplate = (template: PromptTemplate) => {
    onSettingsChange({ ...settings, systemPrompt: template.prompt });
    setShowTemplates(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40 transition-opacity" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 flex flex-col transform transition-transform duration-200 ease-out"
        style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">KI-Einstellungen</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Prompt Templates */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Vorlagen
              </label>
              <button
                onClick={() => setShowTemplates((v) => !v)}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h8" />
                </svg>
                {showTemplates ? 'Ausblenden' : 'Vorlage wählen'}
              </button>
            </div>
            {showTemplates && (
              <div className="space-y-2 mb-4">
                {PROMPT_TEMPLATES.map((template) => (
                  <button
                    key={template.name}
                    onClick={() => handleSelectTemplate(template)}
                    className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    <div className="text-sm font-medium text-gray-800">{template.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{template.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* System Prompt */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                System-Prompt
              </label>
              <button
                onClick={handleResetPrompt}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Standard
              </button>
            </div>
            <textarea
              value={settings.systemPrompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              rows={16}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              placeholder="System-Prompt eingeben..."
            />
            <p className="mt-2 text-xs text-gray-500">
              Der System-Prompt definiert, wie die KI die Zusammenfassungen erstellt.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Einstellungen werden automatisch gespeichert
          </p>
        </div>
      </div>
    </>
  );
}
