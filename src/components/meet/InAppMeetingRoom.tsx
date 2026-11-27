'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Meeting } from '@/types/database';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Sparkles,
  MessageSquare,
  Users,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Radio,
  AlertCircle,
} from 'lucide-react';

// Dynamic import with SSR disabled for Jitsi React SDK
const JitsiMeeting = dynamic(
  () => import('@jitsi/react-sdk').then((mod) => mod.JitsiMeeting),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-300 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Initializing Secure In-App Video Room...</p>
      </div>
    ),
  }
);

interface TranscriptLine {
  id: string;
  speaker: string;
  text: string;
  timestamp: string;
  isSelf?: boolean;
}

interface InAppMeetingRoomProps {
  meeting: Meeting;
  currentUser?: {
    name?: string | null;
    email?: string | null;
  };
}

export default function InAppMeetingRoom({ meeting, currentUser }: InAppMeetingRoomProps) {
  const router = useRouter();
  const userName = currentUser?.name || 'You';
  const userEmail = currentUser?.email || 'user@company.internal';

  // Room State
  const [jitsiApi, setJitsiApi] = useState<any>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);

  const recognitionRef = useRef<any>(null);
  const transcriptsRef = useRef<TranscriptLine[]>([]);
  transcriptsRef.current = transcripts;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sanitized room name for Jitsi public cloud
  const cleanRoomName = `autosync-${meeting.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32)}`;

  // 1. Elapsed meeting timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  // 2. Broadcast local speech to room via Jitsi DataChannel
  const broadcastTranscript = useCallback(
    (line: TranscriptLine) => {
      if (jitsiApi && typeof jitsiApi.executeCommand === 'function') {
        try {
          jitsiApi.executeCommand(
            'sendEndpointTextMessage',
            '', // empty target = broadcast to everyone in the room
            JSON.stringify({
              type: 'autosync_transcript',
              line,
            })
          );
        } catch (e) {
          console.warn('[JITSI_DATA_CHANNEL] Could not broadcast transcript:', e);
        }
      }
    },
    [jitsiApi]
  );

  // 3. Built-in Browser Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[SPEECH_REC] Web Speech API not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript.trim();
          if (text.length > 0) {
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const newLine: TranscriptLine = {
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              speaker: userName,
              text,
              timestamp: timeStr,
              isSelf: true,
            };

            setTranscripts((prev) => [...prev, newLine]);
            broadcastTranscript(newLine);
          }
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('[SPEECH_REC_ERROR]', event.error);
      if (event.error === 'not-allowed') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart continuous recognition while call is active
      try {
        recognition.start();
      } catch {
        setIsListening(false);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('[SPEECH_REC] Failed to start:', e);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [userName, broadcastTranscript]);

  // 4. Jitsi API Event Listeners (Receive remote attendee speech & room status)
  const handleJitsiIFrameRef = (api: any) => {
    setJitsiApi(api);

    // Track participant joins
    api.addEventListener('participantJoined', () => {
      if (typeof api.getNumberOfParticipants === 'function') {
        setParticipantCount(api.getNumberOfParticipants());
      }
    });

    api.addEventListener('participantLeft', () => {
      if (typeof api.getNumberOfParticipants === 'function') {
        setParticipantCount(api.getNumberOfParticipants());
      }
    });

    // Receive transcripts from remote participants
    api.addEventListener('endpointTextMessageReceived', (event: any) => {
      try {
        const data = JSON.parse(event.data?.eventData?.text || '{}');
        if (data.type === 'autosync_transcript' && data.line) {
          setTranscripts((prev) => {
            // Avoid duplicates
            if (prev.some((p) => p.id === data.line.id)) return prev;
            return [...prev, { ...data.line, isSelf: false }];
          });
        }
      } catch (err) {
        // Not JSON or non-transcript message
      }
    });

    // Auto-complete if user clicks the red Hang Up button inside Jitsi
    api.addEventListener('videoConferenceLeft', () => {
      handleCompleteAndSummarize();
    });
  };

  // 5. Complete Meeting & Trigger Gemini + Slack + Jira Pipeline
  const handleCompleteAndSummarize = async () => {
    if (isSummarizing) return;
    setIsSummarizing(true);
    setSummaryError(null);

    // Build person-wise raw transcript text
    const currentList = transcriptsRef.current;
    let rawText = '';
    const speakersSet = new Set<string>();

    if (currentList.length > 0) {
      currentList.forEach((line) => {
        speakersSet.add(line.speaker);
        rawText += `${line.speaker}: ${line.text}\n`;
      });
    } else {
      // Fallback if mic was muted during call
      rawText = `${userName}: In-app meeting held via AutoSync Meet. Call duration ${formatElapsed(elapsedSeconds)}.`;
      speakersSet.add(userName);
    }

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_id: meeting.id,
          raw_text: rawText,
          speakers: Array.from(speakersSet),
          duration_seconds: elapsedSeconds || 60,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to process AI summary.');
      }

      // Redirect directly to the summarized meeting detail page
      router.push(`/meetings/${meeting.id}`);
    } catch (err: any) {
      console.error('[COMPLETE_MEETING_ERROR]', err);
      setSummaryError(err.message || 'Error generating summary. Please try again.');
      setIsSummarizing(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Bar: Room Title, Status Indicators, End & Summarize Button */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <h1 className="font-semibold text-sm text-slate-100 truncate max-w-[200px] sm:max-w-xs">
              {meeting.title}
            </h1>
          </div>

          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            <Clock className="w-3 h-3 mr-1 text-slate-400" />
            {formatElapsed(elapsedSeconds)}
          </span>

          <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
            <ShieldCheck className="w-3 h-3 mr-1 text-emerald-400" />
            Zero-Bot WebRTC
          </span>

          <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-950/60 text-indigo-300 border border-indigo-800/60">
            <Radio className="w-3 h-3 mr-1 text-indigo-400 animate-pulse" />
            {isListening ? 'Captions Active' : 'Mic Inactive'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {summaryError && (
            <span className="text-xs text-rose-400 flex items-center mr-2">
              <AlertCircle className="w-3.5 h-3.5 mr-1" />
              {summaryError}
            </span>
          )}

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center space-x-1.5 ${
              isSidebarOpen
                ? 'bg-slate-800 border-slate-700 text-indigo-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Live Transcripts Sidebar"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Transcripts ({transcripts.length})</span>
          </button>

          <button
            onClick={handleCompleteAndSummarize}
            disabled={isSummarizing}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition-all flex items-center space-x-1.5 disabled:opacity-50"
          >
            {isSummarizing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Summarizing AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                <span>End & Summarize</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Room Content: Jitsi Video on Left, Live Transcripts Drawer on Right */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Jitsi Video Container */}
        <div className="flex-1 h-full bg-slate-950 relative">
          <JitsiMeeting
            domain="meet.jit.si"
            roomName={cleanRoomName}
            configOverwrite={{
              startWithAudioMuted: false,
              startWithVideoMuted: false,
              disableModeratorIndicator: true,
              enableEmailInStats: false,
              enableClosePage: false,
              prejoinPageEnabled: false,
            }}
            interfaceConfigOverwrite={{
              TOOLBAR_BUTTONS: [
                'microphone',
                'camera',
                'desktop',
                'chat',
                'raisehand',
                'tileview',
                'hangup',
              ],
              SHOW_JITSI_WATERMARK: false,
              SHOW_WATERMARK_FOR_GUESTS: false,
              DEFAULT_REMOTE_DISPLAY_NAME: 'Teammate',
            }}
            userInfo={{
              displayName: userName,
              email: userEmail,
            }}
            onApiReady={handleJitsiIFrameRef}
            getIFrameRef={(iframeRef) => {
              iframeRef.style.height = '100%';
              iframeRef.style.width = '100%';
              iframeRef.style.border = 'none';
            }}
          />
        </div>

        {/* Live AI Transcript Sidebar */}
        {isSidebarOpen && (
          <aside className="w-80 md:w-96 border-l border-slate-800 bg-slate-900/95 flex flex-col h-full shadow-2xl z-10 transition-all">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Live Person-wise Captions
                </h2>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                {transcripts.length} lines
              </span>
            </div>

            {/* Transcript Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-700">
              {transcripts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400">
                    <Radio className="w-5 h-5 animate-pulse text-indigo-400" />
                  </div>
                  <p className="text-xs font-medium text-slate-400">Listening to conversation...</p>
                  <p className="text-[11px] text-slate-500">
                    Speak into your microphone. Words are transcribed in real-time tagged with your name.
                  </p>
                </div>
              ) : (
                transcripts.map((t) => (
                  <div
                    key={t.id}
                    className={`p-2.5 rounded-lg text-xs border ${
                      t.isSelf
                        ? 'bg-indigo-950/40 border-indigo-800/50 text-slate-200'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`font-semibold ${
                          t.isSelf ? 'text-indigo-300' : 'text-emerald-400'
                        }`}
                      >
                        {t.speaker}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{t.timestamp}</span>
                    </div>
                    <p className="leading-relaxed">{t.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Info Card */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 flex items-center justify-between">
              <span className="flex items-center text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                Auto-syncs to Jira & Slack
              </span>
              <button
                onClick={handleCompleteAndSummarize}
                disabled={isSummarizing}
                className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                End Call &rarr;
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
