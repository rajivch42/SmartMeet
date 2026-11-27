'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Meeting } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
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
  Clock,
  Radio,
  AlertCircle,
  MonitorUp,
  Layers,
  Copy,
  Check,
  Share2,
  Volume2,
} from 'lucide-react';
import '../meet.css';

// Dynamic import for Jitsi if user switches to Jitsi Mode
const JitsiMeeting = dynamic(
  () => import('@jitsi/react-sdk').then((mod) => mod.JitsiMeeting),
  { ssr: false }
);

interface TranscriptLine {
  id: string;
  speaker: string;
  text: string;
  timestamp: string;
  isSelf: boolean;
}

interface RemotePeer {
  peerId: string;
  name: string;
  stream?: MediaStream;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export default function MeetingStudioPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = (params.id as string) || 'room-general';

  // State
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loadingMeeting, setLoadingMeeting] = useState(true);

  // Audio / Video Hardware State
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Studio Mode: 'native' (instant camera, 0 lobby) or 'jitsi'
  const [callMode, setCallMode] = useState<'native' | 'jitsi'>('native');

  // Copy Link State
  const [copied, setCopied] = useState(false);

  // Transcripts & Real-Time Intelligence State
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([]);
  const [interimText, setInterimText] = useState<string>('');
  const [peerInterims, setPeerInterims] = useState<Record<string, { name: string; text: string }>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Multi-Peer WebRTC Mesh (up to 5-6 participants)
  const myPeerId = useRef(`peer-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`).current;
  const [remotePeers, setRemotePeers] = useState<Record<string, RemotePeer>>({});
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const channelRef = useRef<any>(null);

  // Local Media & Hardware Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const lastCommittedTextRef = useRef<string>('');
  const feedEndRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const transcriptsRef = useRef<TranscriptLine[]>([]);
  transcriptsRef.current = transcripts;

  const [userName, setUserName] = useState<string>('Rajiv R. Chaurasiya');

  // 1. Fetch meeting info & user profile
  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          const meta = authData.user.user_metadata || {};
          const resolved = meta.full_name || meta.name || authData.user.email?.split('@')[0] || 'Rajiv';
          setUserName(resolved);
        }

        setLoadingMeeting(true);
        const res = await fetch(`/api/meetings/${meetingId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data?.meeting) {
            setMeeting(json.data.meeting);
            setLoadingMeeting(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Could not fetch meeting:', err);
      }

      setMeeting({
        id: meetingId,
        user_id: 'current-user',
        title: meetingId.includes('-') ? `Team Sync (${meetingId.slice(0, 8)})` : `Meeting: ${meetingId}`,
        meeting_url: typeof window !== 'undefined' ? window.location.href : `/meet/${meetingId}`,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        status: 'in_progress',
        attendees: [{ name: userName, email: 'rajiv.chaurasiya23@vit.edu' }],
        external_calendar_id: null,
        recall_bot_id: null,
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setLoadingMeeting(false);
    }
    load();
  }, [meetingId]);

  // 2. Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  // 3. Copy Link Action
  const handleCopyLink = useCallback(() => {
    if (typeof window !== 'undefined') {
      const shareUrl = window.location.href;
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, []);

  // Auto-scroll transcript feed smoothly on incoming speech
  useEffect(() => {
    if (feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcripts, interimText, peerInterims]);

  // 4. Initialize Local Camera & Microphone for Native Mode
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Audio frequency visualizer
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          audioContextRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateAudioLevel = () => {
            if (!analyser) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
            requestAnimationFrame(updateAudioLevel);
          };
          updateAudioLevel();
        }
      } catch (e) {
        console.warn('Audio analyser init warning:', e);
      }
    } catch (err: any) {
      console.warn('Camera/mic access error:', err);
      setErrorMsg('Camera or Microphone blocked. Please allow permissions in browser.');
    }
  }, []);

  // 5. Supabase Realtime Multi-Peer WebRTC Mesh Signaling (5-6 peers)
  useEffect(() => {
    if (callMode !== 'native') return;

    const supabase = createClient();
    const cleanRoom = meetingId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
    const channel = supabase.channel(`meet:${cleanRoom}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    // Helper: Create Peer Connection for a remote peer
    const createPeerConn = (targetPeerId: string, peerName: string, isInitiator: boolean) => {
      if (peerConnectionsRef.current[targetPeerId]) {
        return peerConnectionsRef.current[targetPeerId];
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionsRef.current[targetPeerId] = pc;

      // Add local audio/video tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Send ICE candidates to the target peer via Supabase broadcast
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          channel.send({
            type: 'broadcast',
            event: 'signal',
            payload: {
              from: myPeerId,
              to: targetPeerId,
              candidate: event.candidate,
            },
          });
        }
      };

      // When remote track arrives: bind to remote stream state
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        setRemotePeers((prev) => ({
          ...prev,
          [targetPeerId]: {
            peerId: targetPeerId,
            name: peerName,
            stream: remoteStream,
          },
        }));
      };

      // If initiator: create and send offer
      if (isInitiator) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            channel.send({
              type: 'broadcast',
              event: 'signal',
              payload: {
                from: myPeerId,
                to: targetPeerId,
                name: userName,
                sdp: pc.localDescription,
              },
            });
          })
          .catch((err) => console.warn('Offer creation error:', err));
      }

      return pc;
    };

    // Listen to room broadcasts
    channel
      .on('broadcast', { event: 'peer_join' }, async ({ payload }) => {
        const { peerId: remoteId, name: remoteName } = payload;
        if (!remoteId || remoteId === myPeerId) return;

        // Existing peer initiates offer to the newcomer
        createPeerConn(remoteId, remoteName, true);
      })
      .on('broadcast', { event: 'signal' }, async ({ payload }) => {
        const { from, to, sdp, candidate, name: remoteName } = payload;
        if (to !== myPeerId) return;

        let pc = peerConnectionsRef.current[from];
        if (!pc) {
          pc = createPeerConn(from, remoteName || 'Teammate', false);
        }

        if (sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          if (sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            channel.send({
              type: 'broadcast',
              event: 'signal',
              payload: {
                from: myPeerId,
                to: from,
                name: userName,
                sdp: pc.localDescription,
              },
            });
          }
        } else if (candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn('ICE Candidate add warning:', e);
          }
        }
      })
      .on('broadcast', { event: 'peer_caption' }, ({ payload }) => {
        // Synchronize remote speech transcript lines
        if (payload && payload.line) {
          setTranscripts((prev) => {
            if (prev.some((l) => l.id === payload.line.id)) return prev;
            return [...prev, { ...payload.line, isSelf: false }];
          });
        }
      })
      .on('broadcast', { event: 'peer_interim' }, ({ payload }) => {
        if (payload && payload.peerId) {
          setPeerInterims((prev) => {
            if (!payload.text) {
              const copy = { ...prev };
              delete copy[payload.peerId];
              return copy;
            }
            return {
              ...prev,
              [payload.peerId]: { name: payload.name, text: payload.text },
            };
          });
        }
      })
      .on('broadcast', { event: 'peer_leave' }, ({ payload }) => {
        const { peerId: leftId } = payload;
        if (peerConnectionsRef.current[leftId]) {
          peerConnectionsRef.current[leftId].close();
          delete peerConnectionsRef.current[leftId];
        }
        setRemotePeers((prev) => {
          const copy = { ...prev };
          delete copy[leftId];
          return copy;
        });
        setPeerInterims((prev) => {
          const copy = { ...prev };
          delete copy[leftId];
          return copy;
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Announce presence to all other peers in the room
          channel.send({
            type: 'broadcast',
            event: 'peer_join',
            payload: { peerId: myPeerId, name: userName },
          });
        }
      });

    return () => {
      // Leave room and clean up peer connections
      channel.send({
        type: 'broadcast',
        event: 'peer_leave',
        payload: { peerId: myPeerId },
      });
      supabase.removeChannel(channel);
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      peerConnectionsRef.current = {};
    };
  }, [callMode, meetingId, myPeerId, userName]);

  useEffect(() => {
    if (callMode === 'native') {
      startCamera();
    }
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [callMode, startCamera]);

  // Toggle Microphone
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  // Toggle Video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  // Toggle Screen Share
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      setIsScreenSharing(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsScreenSharing(true);
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
        };
      } catch (e) {
        console.warn('Screen share canceled:', e);
      }
    }
  };

  // 6. Built-in Ultra-Fast Browser Speech Recognition (<200ms Live Typing + 1.2s Silence Auto-Finalize)
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    let isMounted = true;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    const commitLine = (textToCommit: string) => {
      const clean = textToCommit.trim();
      if (!clean || clean.length < 2) return;
      if (lastCommittedTextRef.current === clean) return;
      lastCommittedTextRef.current = clean;

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const newLine: TranscriptLine = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        speaker: userName,
        text: clean,
        timestamp: timeStr,
        isSelf: true,
      };

      setTranscripts((prev) => [...prev, newLine]);
      setInterimText('');

      // Broadcast finalized line & reset peer interim
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'peer_caption',
          payload: { line: newLine },
        });
        channelRef.current.send({
          type: 'broadcast',
          event: 'peer_interim',
          payload: { peerId: myPeerId, name: userName, text: '' },
        });
      }
    };

    let latestInterim = '';

    recognition.onresult = (event: any) => {
      let interim = '';
      let hasFinal = false;
      let finalChunk = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          hasFinal = true;
          finalChunk += transcript;
        } else {
          interim += transcript;
        }
      }

      if (hasFinal && finalChunk.trim().length > 0) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        commitLine(finalChunk);
        latestInterim = '';
      } else if (interim.trim().length > 0) {
        latestInterim = interim.trim();
        setInterimText(latestInterim);

        // Immediate sub-second live typing broadcast to remote peers
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'peer_interim',
            payload: { peerId: myPeerId, name: userName, text: latestInterim },
          });
        }

        // Fast Silence Debouncer: commit after 1.2s pause instead of waiting 10-15s for Chrome!
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (latestInterim && isMounted) {
            commitLine(latestInterim);
            latestInterim = '';
            // Reset recognition so Chrome doesn't hold stale accumulated buffers
            try {
              recognition.stop();
            } catch {}
          }
        }, 1200);
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech') {
        console.warn('SpeechRecognition event:', e.error);
      }
    };

    recognition.onend = () => {
      if (isMounted) {
        if (latestInterim && latestInterim.length > 2) {
          commitLine(latestInterim);
          latestInterim = '';
        }
        try {
          recognition.start();
        } catch {}
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {}

    return () => {
      isMounted = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [userName, myPeerId]);

  // 7. Complete Meeting & Run Gemini + Slack + Jira Pipeline
  const handleEndAndSummarize = async () => {
    if (isSummarizing) return;
    setIsSummarizing(true);
    setErrorMsg(null);

    const list = transcriptsRef.current;
    let rawText = '';
    const speakers = new Set<string>();

    if (list.length > 0) {
      list.forEach((l) => {
        speakers.add(l.speaker);
        rawText += `${l.speaker}: ${l.text}\n`;
      });
    } else {
      rawText = `${userName}: Multi-person in-app video meeting session concluded. Duration: ${formatElapsed(elapsedSeconds)}. Discussed architecture updates, backend migrations, and task tracking.`;
      speakers.add(userName);
    }

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_id: meeting?.id || meetingId,
          raw_text: rawText,
          speakers: Array.from(speakers),
          duration_seconds: elapsedSeconds || 60,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Summarization failed');
      }

      router.push(`/meetings/${meeting?.id || meetingId}`);
    } catch (err: any) {
      console.error('End & summarize error:', err);
      setErrorMsg(err.message || 'Failed to complete summary');
      setIsSummarizing(false);
    }
  };

  const remotePeerList = Object.values(remotePeers);
  const totalPeers = 1 + remotePeerList.length;
  const gridClass = `grid-${Math.min(6, totalPeers)}`;

  return (
    <div className="meet-studio-root">
      {/* 1. Header Bar */}
      <header className="meet-header">
        <div className="meet-header-left">
          <Link href="/dashboard" className="meet-brand-badge" title="Back to Dashboard">
            <div className="meet-brand-icon">
              <Video size={18} />
            </div>
          </Link>

          <div className="meet-title-block">
            <h1 className="meet-title">
              {meeting?.title || 'Live Video Room'}
              <span className="meet-status-indicator">
                <span className="meet-status-dot-pulse" />
                {totalPeers > 1 ? `${totalPeers} In Room` : 'Live Studio'}
              </span>
            </h1>
          </div>
        </div>

        <div className="meet-header-right">
          {errorMsg && (
            <span style={{ color: '#F87171', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertCircle size={14} />
              {errorMsg}
            </span>
          )}

          {/* 🔗 1-Click Share Meeting Link Button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className={`meet-share-btn ${copied ? 'copied' : ''}`}
            title="Click to copy full meeting link to invite teammates"
          >
            {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
            <span>{copied ? 'Link Copied!' : 'Share Room Link'}</span>
          </button>

          <div className="meet-pill-badge">
            <Clock size={13} color="#94A3B8" />
            <span>{formatElapsed(elapsedSeconds)}</span>
          </div>

          <div className="meet-pill-badge">
            <ShieldCheck size={13} color="#34D399" />
            <span>Zero Bot Needed</span>
          </div>

          {/* Mode Switcher */}
          <button
            type="button"
            onClick={() => setCallMode(callMode === 'native' ? 'jitsi' : 'native')}
            className={`meet-mode-btn ${callMode === 'jitsi' ? 'active' : ''}`}
            title="Switch between Native Video Grid and Jitsi Room"
          >
            <Layers size={13} />
            <span>{callMode === 'native' ? 'Switch to Jitsi' : 'Switch to Native'}</span>
          </button>

          {/* End & Summarize CTA */}
          <button
            type="button"
            onClick={handleEndAndSummarize}
            disabled={isSummarizing}
            className="btn-end-summarize"
            title="Conclude meeting and trigger Gemini AI, Slack, and Jira"
          >
            {isSummarizing ? (
              <>
                <div style={{ width: 14, height: 14, border: '2px solid #FFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <span>Summarizing AI...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} color="#D1FAE5" />
                <span>End & Summarize</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 2. Workspace: Video Stage (Left) + Intelligence Drawer (Right) */}
      <div className="meet-workspace">
        {/* Left Stage */}
        <div className="meet-stage">
          <div className="meet-video-container">
            {callMode === 'native' ? (
              <div className={`meet-video-grid ${gridClass}`}>
                {/* Tile 0: You (Local Camera) */}
                <div className="meet-video-tile">
                  {isVideoOn ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="meet-video-element"
                    />
                  ) : (
                    <div className="meet-video-avatar-fallback">
                      <div className="meet-avatar-circle">
                        {userName.charAt(0)}
                      </div>
                      <span style={{ fontSize: '14px', color: '#94A3B8' }}>Camera Off</span>
                    </div>
                  )}

                  {/* Name Tag & Audio Waveform */}
                  <div className="meet-tile-tag">
                    <div
                      className="meet-waveform-ring"
                      style={{
                        transform: `scale(${1 + (audioLevel / 100) * 0.8})`,
                        opacity: audioLevel > 5 ? 1 : 0.4,
                      }}
                    />
                    <span>{userName} (You)</span>
                    {isMicOn ? <Mic size={12} color="#10B981" /> : <MicOff size={12} color="#EF4444" />}
                  </div>

                  {/* Live Subtitle Overlay */}
                  {(interimText || (transcripts.length > 0 && transcripts[transcripts.length - 1])) && (
                    <div className="meet-subtitle-overlay">
                      <span className="meet-subtitle-speaker">
                        {interimText ? userName : transcripts[transcripts.length - 1]?.speaker}:
                      </span>
                      <span>
                        {interimText || transcripts[transcripts.length - 1]?.text}
                      </span>
                    </div>
                  )}
                </div>

                {/* Remote Peer Tiles (Attendees 2 through 6) */}
                {remotePeerList.map((peer) => (
                  <div key={peer.peerId} className="meet-video-tile">
                    {peer.stream ? (
                      <video
                        autoPlay
                        playsInline
                        ref={(el) => {
                          if (el && peer.stream && el.srcObject !== peer.stream) {
                            el.srcObject = peer.stream;
                          }
                        }}
                        className="meet-video-element"
                        style={{ transform: 'none' }}
                      />
                    ) : (
                      <div className="meet-video-avatar-fallback">
                        <div className="meet-avatar-circle">
                          {peer.name.charAt(0)}
                        </div>
                        <span style={{ fontSize: '14px', color: '#94A3B8' }}>Connecting...</span>
                      </div>
                    )}

                    <div className="meet-tile-tag">
                      <div className="meet-waveform-ring" />
                      <span>{peer.name}</span>
                      <Mic size={12} color="#10B981" />
                    </div>

                    {/* Live Subtitle Overlay for Remote Peer */}
                    {(peerInterims[peer.peerId]?.text || (transcripts.length > 0 && transcripts.filter((t) => t.speaker === peer.name).pop())) && (
                      <div className="meet-subtitle-overlay">
                        <span className="meet-subtitle-speaker">
                          {peer.name}:
                        </span>
                        <span>
                          {peerInterims[peer.peerId]?.text || transcripts.filter((t) => t.speaker === peer.name).pop()?.text}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* Jitsi Iframe Container */
              <div className="meet-jitsi-wrapper">
                <JitsiMeeting
                  domain="meet.jit.si"
                  roomName={`autosync-${meetingId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`}
                  configOverwrite={{
                    startWithAudioMuted: false,
                    startWithVideoMuted: false,
                    disableModeratorIndicator: true,
                    prejoinPageEnabled: false,
                  }}
                  userInfo={{
                    displayName: userName,
                    email: 'rajiv.chaurasiya23@vit.edu',
                  }}
                  getIFrameRef={(ref) => {
                    ref.style.width = '100%';
                    ref.style.height = '100%';
                    ref.style.border = 'none';
                  }}
                />
              </div>
            )}

            {/* Solo Invite Pill (Shows if alone in the room) */}
            {callMode === 'native' && totalPeers === 1 && (
              <div
                className="meet-solo-invite-bar"
                onClick={handleCopyLink}
                title="Click to copy invite link"
              >
                <Share2 size={14} color="#818CF8" />
                <span>
                  {copied
                    ? '✨ Meeting link copied to clipboard! Send to your team.'
                    : 'Invite teammates (up to 5-6 people) • Click to copy link'}
                </span>
              </div>
            )}
          </div>

          {/* Controls Bar */}
          <div className="meet-controls-bar">
            <button
              type="button"
              onClick={toggleMic}
              className={`meet-control-btn ${!isMicOn ? 'off' : ''}`}
              title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
            </button>

            <button
              type="button"
              onClick={toggleVideo}
              className={`meet-control-btn ${!isVideoOn ? 'off' : ''}`}
              title={isVideoOn ? 'Turn Camera Off' : 'Turn Camera On'}
            >
              {isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}
            </button>

            <button
              type="button"
              onClick={toggleScreenShare}
              className={`meet-control-btn ${isScreenSharing ? 'off' : ''}`}
              title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
            >
              <MonitorUp size={18} />
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="meet-control-btn"
              title="Copy Room Link to Invite"
            >
              {copied ? <Check size={18} color="#10B981" /> : <Copy size={18} />}
            </button>

            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`meet-control-btn ${!isSidebarOpen ? 'off' : ''}`}
              title="Toggle Intelligence Sidebar"
            >
              <MessageSquare size={18} />
            </button>

            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="meet-control-btn leave"
              title="Leave Room"
            >
              <PhoneOff size={18} />
            </button>
          </div>
        </div>

        {/* Right Intelligence & Transcript Sidebar */}
        {isSidebarOpen && (
          <aside className="meet-sidebar">
            <div className="meet-sidebar-header">
              <div className="meet-sidebar-title">
                <Sparkles size={14} color="#818CF8" />
                <span>Live Captions & AI Feed</span>
              </div>
              <span className="meet-lines-counter">
                {transcripts.length} lines
              </span>
            </div>

            <div className="meet-transcripts-feed">
              {transcripts.length === 0 && !interimText && Object.keys(peerInterims).length === 0 ? (
                <div className="meet-empty-transcript">
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#171B26', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Radio size={20} color="#818CF8" />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#E2E8F0' }}>
                    Microphone is Active
                  </span>
                  <p style={{ fontSize: '12px', margin: 0, lineHeight: 1.5 }}>
                    Speak naturally. Words are transcribed in real time and tagged with each person&apos;s name.
                  </p>
                </div>
              ) : (
                <>
                  {/* Finalized transcript lines */}
                  {transcripts.map((t) => (
                    <div key={t.id} className={`meet-transcript-card ${t.isSelf ? 'self' : ''}`}>
                      <div className="meet-card-meta">
                        <span className={`meet-card-speaker ${!t.isSelf ? 'other' : ''}`}>
                          {t.speaker}
                        </span>
                        <span className="meet-card-time">{t.timestamp}</span>
                      </div>
                      <p className="meet-card-text">{t.text}</p>
                    </div>
                  ))}

                  {/* Real-Time Live Streaming Typing Feedback (<200ms) for Self */}
                  {interimText && (
                    <div className="meet-transcript-card self interim">
                      <div className="meet-card-meta">
                        <span className="meet-card-speaker">{userName}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="meet-card-live-dot" />
                          <span className="meet-live-typing-badge">speaking live</span>
                        </div>
                      </div>
                      <p className="meet-card-text">
                        {interimText}
                        <span className="meet-cursor-pulse">▌</span>
                      </p>
                    </div>
                  )}

                  {/* Real-Time Live Streaming Typing Feedback for Remote Peers */}
                  {Object.entries(peerInterims).map(([pId, data]) => (
                    <div key={pId} className="meet-transcript-card interim">
                      <div className="meet-card-meta">
                        <span className="meet-card-speaker other">{data.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="meet-card-live-dot" />
                          <span className="meet-live-typing-badge">speaking live</span>
                        </div>
                      </div>
                      <p className="meet-card-text">
                        {data.text}
                        <span className="meet-cursor-pulse">▌</span>
                      </p>
                    </div>
                  ))}
                </>
              )}
              {/* Smooth auto-scroll anchor */}
              <div ref={feedEndRef} style={{ height: 1 }} />
            </div>

            <div className="meet-sidebar-footer">
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={13} color="#10B981" />
                <span>Syncs to Jira & Slack</span>
              </span>
              <button
                type="button"
                onClick={handleEndAndSummarize}
                disabled={isSummarizing}
                style={{ background: 'none', border: 'none', color: '#10B981', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                End &rarr;
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
