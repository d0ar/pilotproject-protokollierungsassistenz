import { useState, useRef, useEffect, type MouseEvent } from 'react';
import type { AssignmentStepProps, TopColor } from '../types';
import AudioPlayer from './AudioPlayer';
import { useAudioSync } from '../hooks/useAudioSync';
import SpeakerNameEditor from './SpeakerNameEditor';

interface SelectionPopup {
  lineIndex: number;
  startChar: number;
  endChar: number;
  x: number;
  y: number;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Color palette for TOPs
const topColors: TopColor[] = [
  { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700', dot: 'bg-blue-500' },
  { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700', dot: 'bg-green-500' },
  { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-700', dot: 'bg-purple-500' },
  { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-700', dot: 'bg-pink-500' },
  { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700', dot: 'bg-red-500' },
  { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-700', dot: 'bg-orange-500' },
];

export default function AssignmentStep({
  onNext,
  onBack,
  tops,
  transcript,
  assignments,
  setAssignments,
  audioUrl,
  speakerNames,
  setSpeakerNames,
  onSplitAndAssign,
  onUndo,
  canUndo,
}: AssignmentStepProps) {
  const [selectedTop, setSelectedTop] = useState(0);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionPopup, setSelectionPopup] = useState<SelectionPopup | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  // Audio sync hook
  const {
    seekTime,
    currentLineIndex,
    handleTimeUpdate,
    seekToLine,
    isAutoScroll,
  } = useAudioSync(transcript);

  // Auto-scroll to current line during playback
  useEffect(() => {
    if (isAutoScroll && currentLineIndex >= 0 && transcriptContainerRef.current) {
      const lineElement = transcriptContainerRef.current.querySelector(
        `[data-line-index="${currentLineIndex}"]`
      ) as HTMLElement | null;
      lineElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentLineIndex, isAutoScroll]);

  const getDisplayName = (speakerId: string) => speakerNames[speakerId] || speakerId;
  const getColor = (topIndex: number): TopColor => topColors[topIndex % topColors.length]!;

  const getAssignmentCounts = (): Record<number, number> => {
    const counts: Record<number, number> = {};
    tops.forEach((_, index) => {
      counts[index] = assignments.filter((a) => a === index).length;
    });
    return counts;
  };

  const counts = getAssignmentCounts();

  // Dismiss popup when clicking outside it
  useEffect(() => {
    if (!selectionPopup) return;
    const dismiss = () => setSelectionPopup(null);
    document.addEventListener('mousedown', dismiss);
    return () => document.removeEventListener('mousedown', dismiss);
  }, [selectionPopup]);

  // Walk up the DOM from a node to find the nearest data-line-index attribute value
  const findLineIndex = (node: Node, container: Element): number | null => {
    let el: Element | null =
      node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
    while (el && el !== container) {
      const idx = el.getAttribute('data-line-index');
      if (idx !== null) return parseInt(idx, 10);
      el = el.parentElement;
    }
    return null;
  };

  // Get char offset of a Range boundary within a text span element.
  // Returns null if the boundary node is not inside the span.
  const getCharOffset = (textSpan: Element, node: Node, offset: number): number | null => {
    if (!textSpan.contains(node)) return null;
    // Walk all text nodes within the span to find the cumulative offset
    let total = 0;
    const walker = document.createTreeWalker(textSpan, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    while (current) {
      if (current === node) return total + offset;
      total += current.textContent?.length ?? 0;
      current = walker.nextNode();
    }
    return null;
  };

  // Single mouseup handler on the transcript container — more robust than per-span handlers
  const handleTranscriptMouseUp = (event: MouseEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;
    if (!selection.toString().trim()) return;

    const range = selection.getRangeAt(0);
    const container = event.currentTarget;

    // Both ends of the selection must be within the same transcript line
    const startLineIdx = findLineIndex(range.startContainer, container);
    const endLineIdx = findLineIndex(range.endContainer, container);
    if (startLineIdx === null || startLineIdx !== endLineIdx) return;

    const lineIndex = startLineIdx;
    const line = transcript[lineIndex];
    if (!line) return;

    // Resolve the character-level span for this line
    const textSpan = container.querySelector(
      `[data-line-index="${lineIndex}"] [data-text-span]`
    );
    if (!textSpan) return;

    const textLength = line.text.length;
    const rawStart = getCharOffset(textSpan, range.startContainer, range.startOffset);
    const rawEnd = getCharOffset(textSpan, range.endContainer, range.endOffset);

    // At least one boundary must be within the text span
    if (rawStart === null && rawEnd === null) return;

    // Clamp boundaries to [0, textLength]
    const startChar = Math.max(0, Math.min(rawStart ?? 0, textLength));
    const endChar = Math.max(0, Math.min(rawEnd ?? textLength, textLength));
    if (startChar >= endChar) return;

    setSelectionPopup({ lineIndex, startChar, endChar, x: event.clientX, y: event.clientY });
  };

  const handleLineClick = (lineIndex: number, event: MouseEvent<HTMLDivElement>) => {
    // If the user dragged to select text, don't treat it as a click
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim()) return;

    // Double-click: seek audio
    const line = transcript[lineIndex];
    if (event.detail === 2 && audioUrl && line) {
      seekToLine(lineIndex, line);
      return;
    }

    if (event.shiftKey && selectionStart !== null) {
      // Range selection
      const start = Math.min(selectionStart, lineIndex);
      const end = Math.max(selectionStart, lineIndex);
      const newAssignments = [...assignments];
      for (let i = start; i <= end; i++) {
        newAssignments[i] = selectedTop;
      }
      setAssignments(newAssignments);
      setSelectionStart(null);
    } else {
      // Single click: toggle
      const newAssignments = [...assignments];
      newAssignments[lineIndex] =
        newAssignments[lineIndex] === selectedTop ? null : selectedTop;
      setAssignments(newAssignments);
      setSelectionStart(lineIndex);
    }
  };

  const confirmSplit = () => {
    if (!selectionPopup) return;
    onSplitAndAssign(selectionPopup.lineIndex, selectionPopup.startChar, selectionPopup.endChar, selectedTop);
    setSelectionPopup(null);
    window.getSelection()?.removeAllRanges();
  };

  const dismissPopup = () => {
    setSelectionPopup(null);
    window.getSelection()?.removeAllRanges();
  };

  const assignedCount = assignments.filter((a) => a !== null).length;
  const totalCount = transcript.length;
  const canProceed = assignedCount > 0;

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 text-sm">
          <strong>Anleitung:</strong> 1) TOP links auswählen → 2) Zeilen anklicken (Shift+Klick für Bereich) → 3) Für teilweise Zuordnung: Text innerhalb einer Zeile markieren{audioUrl && ' → Doppelklick zum Abspielen'}
        </p>
      </div>

      {/* Speaker Name Editor */}
      <SpeakerNameEditor
        transcript={transcript}
        speakerNames={speakerNames}
        setSpeakerNames={setSpeakerNames}
      />

      {/* Progress + Undo */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-3">
          <span>
            {assignedCount} von {totalCount} Zeilen zugeordnet
          </span>
          {canUndo && (
            <button
              onClick={onUndo}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
              title="Letzten Schritt rückgängig machen"
            >
              ↩ Rückgängig
            </button>
          )}
        </div>
        <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${(assignedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex gap-6 h-[calc(100vh-320px)] min-h-[500px]">
        {/* TOPs Sidebar */}
        <div className="w-72 bg-white rounded-lg border border-gray-200 p-4 overflow-y-auto">
          <h3 className="font-medium text-gray-900 mb-4">Tagesordnung</h3>
          <div className="space-y-2">
            {tops.map((top, index) => {
              const color = getColor(index);
              const isSelected = selectedTop === index;
              return (
                <button
                  key={index}
                  onClick={() => setSelectedTop(index)}
                  className={`w-full text-left px-3 py-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? `${color.bg} ${color.border} ${color.text}`
                      : 'border-transparent hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-3 h-3 rounded-full mt-1 ${color.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate" title={top || `TOP ${index + 1}`}>
                        {index + 1}. {top || `TOP ${index + 1}`}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{counts[index]} Zeilen</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Transcript */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
          {audioUrl && (
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <AudioPlayer audioUrl={audioUrl} currentTime={seekTime} onTimeUpdate={handleTimeUpdate} />
            </div>
          )}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="font-medium text-gray-900">Transkript</h3>
          </div>
          <div
            ref={transcriptContainerRef}
            className="flex-1 overflow-y-auto p-2"
            onMouseUp={handleTranscriptMouseUp}
          >
            {transcript.map((line, index) => {
              const assignedTo = assignments[index] ?? null;
              const color = assignedTo !== null ? getColor(assignedTo) : null;
              const isCurrentLine = index === currentLineIndex;
              return (
                <div
                  key={index}
                  data-line-index={String(index)}
                  onClick={(e) => handleLineClick(index, e)}
                  className={`px-3 py-2 rounded cursor-pointer transition-colors text-sm border-l-4 mb-1 ${
                    color
                      ? `${color.bg} ${color.border} hover:opacity-80`
                      : 'border-transparent hover:bg-gray-100'
                  } ${isCurrentLine ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                >
                  <span className="font-medium text-gray-600">{getDisplayName(line.speaker)}:</span>{' '}
                  <span data-text-span="true" className="text-gray-800">{line.text}</span>
                  <span className="ml-2 text-xs text-gray-400">[{formatTime(line.start)}]</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Text-selection popup */}
      {selectionPopup && (() => {
        const color = getColor(selectedTop);
        const line = transcript[selectionPopup.lineIndex];
        const selectedText = line?.text.slice(selectionPopup.startChar, selectionPopup.endChar) ?? '';
        const preview = selectedText.length > 50 ? selectedText.slice(0, 50) + '…' : selectedText;
        const popupY = selectionPopup.y - 64;
        return (
          <div
            className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-2 flex items-center gap-2 text-sm"
            style={{
              left: Math.min(selectionPopup.x - 60, window.innerWidth - 300),
              top: popupY < 8 ? selectionPopup.y + 12 : popupY,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color.dot}`} />
            <span className="text-gray-500 italic truncate max-w-[160px]">„{preview}"</span>
            <button
              className={`px-2 py-1 rounded text-xs font-medium border flex-shrink-0 ${color.bg} ${color.border} ${color.text} hover:opacity-80`}
              onClick={confirmSplit}
            >
              TOP {selectedTop + 1} zuordnen
            </button>
            <button
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 text-base leading-none"
              onClick={dismissPopup}
            >
              ✕
            </button>
          </div>
        );
      })()}

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-2"
        >
          <span>←</span>
          Zurück
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            canProceed
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Zusammenfassungen erstellen
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
