import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';

const QUICK_PROMPTS = [
  "Which gate is shortest?",
  "Best time to leave?",
  "Nearest food stand?",
  "Where's a restroom?",
  "Is parking full?",
];

const SUPPORTED_LANGUAGES = {
  en: '🇬🇧 English',
  hi: '🇮🇳 Hindi',
  ta: '🇮🇳 Tamil',
  te: '🇮🇳 Telugu',
  kn: '🇮🇳 Kannada',
  fr: '🇫🇷 French',
  es: '🇪🇸 Spanish',
  de: '🇩🇪 German',
  ar: '🇸🇦 Arabic',
  zh: '🇨🇳 Chinese',
  ja: '🇯🇵 Japanese',
};

// Web Speech API voice code map
const SPEECH_LANG_MAP = {
  en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN',
  kn: 'kn-IN', fr: 'fr-FR', es: 'es-ES', de: 'de-DE',
  ar: 'ar-SA', zh: 'zh-CN', ja: 'ja-JP',
};

function buildContext(data, intelligence) {
  if (!data) return '';
  const { stats, gates, concessions, transport } = data;
  const sortedGates = [...gates].sort((a, b) => a.waitMinutes - b.waitMinutes);
  const sortedFood  = [...concessions].sort((a, b) => a.avgWaitMinutes - b.avgWaitMinutes);
  const nextTransit = [...transport].sort((a, b) => a.eta - b.eta).slice(0, 3);
  return `
LIVE VENUE DATA (${new Date().toLocaleTimeString()}):
- Venue: ${data.venue.name}, Event: ${data.venue.event}
- Capacity: ${stats.attendancePercent}% full (${stats.totalAttendance.toLocaleString()} fans)
- Avg gate wait: ${stats.avgGateWait}min | Avg food queue: ${stats.avgConcessionWait}min
- Parking: ${stats.parkingUtilization}% full

GATES (shortest first): ${sortedGates.slice(0, 4).map(g => `${g.name}: ${g.waitMinutes.toFixed(1)}min`).join(', ')}
FOOD (shortest first):  ${sortedFood.slice(0, 4).map(c => `${c.name}: ${c.avgWaitMinutes.toFixed(1)}min`).join(', ')}
TRANSPORT: ${nextTransit.map(t => `${t.line}: ${t.eta}min`).join(', ')}
${intelligence?.venueScore?.summary ? `AI NOTE: ${intelligence.venueScore.summary}` : ''}
  `.trim();
}

function buildSystemPrompt(ctx) {
  return `You are SV-Companion, a friendly AI assistant for live event fans. Give short (2-4 sentences), practical, specific answers using the live data below. Be friendly, use 1-2 emojis, and ALWAYS name specific gates or stands.\n\n${ctx}`;
}

export default function AssistantChat({ data, intelligence }) {
  const { trackEvent, trackSearch, trackScreen } = useAnalytics();

  const [messages, setMessages]     = useState([{
    id: 'intro', role: 'ai',
    text: "Hey! 👋 I'm your AI companion. Ask me about queues, exits, food, or anything else. Tap 🎤 to speak!",
    original: null,
  }]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [lang, setLang]             = useState('en');
  const [showLang, setShowLang]     = useState(false);
  const [listening, setListening]   = useState(false);  // Voice input state
  const [playingId, setPlayingId]   = useState(null);   // TTS playback state
  const [translating, setTranslating] = useState(null);
  const bottomRef  = useRef(null);
  const recognizer = useRef(null);
  const audioRef   = useRef(null);

  useEffect(() => { trackScreen('AI Chat'); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  // ── Voice Input (Web Speech API) ──────────────────────────────────────────
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return alert('Voice input not supported in this browser.');

    const rec = new SR();
    rec.lang = SPEECH_LANG_MAP[lang] || 'en-IN';
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
      trackEvent('voice_input_used', { lang });
    };
    rec.onerror = () => setListening(false);
    rec.onend   = () => setListening(false);

    recognizer.current = rec;
    rec.start();
    setListening(true);
    trackEvent('voice_input_started', { lang });
  }, [lang]);

  const stopListening = () => {
    recognizer.current?.stop();
    setListening(false);
  };

  // ── Read Aloud (Google Cloud TTS) ─────────────────────────────────────────
  const readAloud = useCallback(async (msgId, text) => {
    if (playingId === msgId) {
      // Stop if already playing
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    setPlayingId(msgId);
    trackEvent('tts_read_aloud', { lang });
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang }),
      });
      if (!res.ok) throw new Error('TTS error');
      const { audioContent } = await res.json();

      // Decode base64 MP3 and play
      const binary    = atob(audioContent);
      const bytes     = new Uint8Array(binary.length);
      binary.split('').forEach((c, i) => { bytes[i] = c.charCodeAt(0); });
      const blob      = new Blob([bytes], { type: 'audio/mpeg' });
      const url       = URL.createObjectURL(blob);
      const audio     = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setPlayingId(null); URL.revokeObjectURL(url); };
      audio.onerror = () => setPlayingId(null);
      audio.play();
    } catch {
      setPlayingId(null);
    }
  }, [playingId, lang]);

  // ── Send Message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;

    trackSearch(trimmed);
    trackEvent('ai_query_sent', { query_length: trimmed.length, language: lang });

    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: trimmed, original: null }]);
    setInput('');
    setLoading(true);

    try {
      const systemContext = buildSystemPrompt(buildContext(data, intelligence));
      const res = await fetch('/api/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trafficLevel:  data?.stats?.attendancePercent > 90 ? 'High' : 'Medium',
          userLocation:  trimmed,
          userQuery:     trimmed,
          systemContext,
        }),
      });

      let aiText = "I couldn't get a response right now. Try again!";
      if (res.ok) {
        const json = await res.json();
        aiText = json.advice || aiText;
      }

      // Auto-translate if non-English selected (Cloud Translation API)
      let displayText = aiText;
      if (lang !== 'en') {
        try {
          const tr = await fetch('/api/translate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: aiText, targetLang: lang }),
          });
          if (tr.ok) {
            const trData = await tr.json();
            displayText = trData.translatedText || aiText;
          }
        } catch {}
      }

      const newId = Date.now() + 1;
      setMessages(prev => [...prev, {
        id: newId, role: 'ai',
        text: displayText,
        original: lang !== 'en' ? aiText : null,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'ai',
        text: "I'm having trouble connecting. Check your network 📶", original: null,
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, data, intelligence, lang]);

  // Translate single message on demand
  const translateMessage = async (msgId, text) => {
    if (lang === 'en') return;
    setTranslating(msgId);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang: lang }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, text: data.translatedText, original: text } : m
        ));
        trackEvent('message_translated', { target_lang: lang });
      }
    } finally { setTranslating(null); }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Share an AI message via Web Share API
  const shareMessage = async (text) => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: 'SV-Companion Tip',
        text: `📍 Venue tip from AI: ${text}`,
        url: window.location.href,
      });
      trackEvent('message_shared');
    } catch {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 8px', borderBottom: '1px solid var(--border)' }}>
        <div className="flex-between">
          <div>
            <h2 className="fw-800 fs-18">AI Companion</h2>
            <p className="fs-12 text-muted">
              <span style={{ color: '#4285F4', fontWeight: 700 }}>Gemini</span>
              {' · '}
              <span style={{ color: '#0F9D58', fontWeight: 700 }}>TTS</span>
              {' · '}
              <span style={{ color: '#DB4437', fontWeight: 700 }}>Translate</span>
              {lang !== 'en' && <span style={{ color: 'var(--accent-light)' }}> · {SUPPORTED_LANGUAGES[lang]}</span>}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Language Selector */}
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setShowLang(v => !v)}
                aria-label="Change language"
              >
                🌐 {lang.toUpperCase()}
              </button>
              {showLang && (
                <div style={{
                  position: 'absolute', right: 0, top: '110%',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
                  borderRadius: 12, zIndex: 50, minWidth: 180, overflow: 'hidden',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}>
                  {Object.entries(SUPPORTED_LANGUAGES).map(([code, label]) => (
                    <button
                      key={code}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '10px 16px',
                        background: lang === code ? 'var(--accent-glow)' : 'transparent',
                        color: lang === code ? 'var(--accent-light)' : 'var(--text-primary)',
                        border: 'none', fontSize: 13, fontWeight: lang === code ? 700 : 400,
                        cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      }}
                      onClick={() => {
                        setLang(code); setShowLang(false);
                        trackEvent('language_changed', { language: code });
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{
              background: 'linear-gradient(135deg, var(--accent), #8B5CF6)',
              borderRadius: 10, width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>✨</div>
          </div>
        </div>

        {/* Quick Prompts */}
        <div className="quick-prompts" style={{ marginTop: 8 }}>
          {QUICK_PROMPTS.map(p => (
            <button key={p} className="quick-prompt-chip" onClick={() => sendMessage(p)}>{p}</button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages" role="log" aria-live="polite">
        {messages.map(msg => (
          <div key={msg.id} className={`chat-msg ${msg.role}`}>
            <div className={`chat-avatar${msg.role === 'user' ? ' user-av' : ''}`} aria-hidden="true">
              {msg.role === 'ai' ? '✨' : '👤'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: '80%' }}>
              <div className={`chat-bubble ${msg.role}`}>{msg.text}</div>

              {msg.original && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 4 }}>
                  <em>EN: {msg.original.slice(0, 70)}{msg.original.length > 70 ? '…' : ''}</em>
                </div>
              )}

              {/* AI message action buttons */}
              {msg.role === 'ai' && msg.id !== 'intro' && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingLeft: 2 }}>
                  {/* Read Aloud — Google Cloud TTS */}
                  <button
                    style={{
                      fontSize: 11, color: playingId === msg.id ? 'var(--green)' : 'var(--text-muted)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '2px 4px', fontFamily: 'Inter, sans-serif',
                    }}
                    onClick={() => readAloud(msg.id, msg.text)}
                    aria-label={playingId === msg.id ? 'Stop reading' : 'Read aloud (Google TTS)'}
                  >
                    {playingId === msg.id ? '⏹ Stop' : '🔊 Read aloud'}
                  </button>

                  {/* Share via Web Share API */}
                  {navigator.share && (
                    <button
                      style={{
                        fontSize: 11, color: 'var(--text-muted)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '2px 4px', fontFamily: 'Inter, sans-serif',
                      }}
                      onClick={() => shareMessage(msg.text)}
                      aria-label="Share this tip"
                    >
                      📤 Share
                    </button>
                  )}

                  {/* Translate on demand */}
                  {lang !== 'en' && !msg.original && (
                    <button
                      style={{
                        fontSize: 11, color: 'var(--accent-light)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '2px 4px', fontFamily: 'Inter, sans-serif',
                      }}
                      onClick={() => translateMessage(msg.id, msg.text)}
                      disabled={translating === msg.id}
                    >
                      {translating === msg.id ? '⏳' : `🌐 Translate`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-msg ai" aria-live="polite">
            <div className="chat-avatar" aria-hidden="true">✨</div>
            <div className="chat-bubble ai">
              <div className="chat-typing" aria-hidden="true"><span /><span /><span /></div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div className="chat-input-bar">
        {/* 🎤 Voice Input — Web Speech API */}
        <button
          className="chat-send"
          style={{
            background: listening ? 'var(--red)' : 'var(--bg-elevated)',
            border: '1px solid var(--border-strong)',
            width: 44, height: 44, flexShrink: 0,
            animation: listening ? 'pulse 1s ease-in-out infinite' : 'none',
          }}
          onClick={listening ? stopListening : startListening}
          aria-label={listening ? 'Stop listening' : 'Start voice input'}
          title="Voice input (Web Speech API)"
        >
          {listening ? '⏹' : '🎤'}
        </button>

        <textarea
          className="chat-input"
          placeholder={listening ? '🎤 Listening…' : lang === 'en' ? 'Ask about queues, exits, food…' : 'Ask anything — auto-translated'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          aria-label="Type or speak your message"
          disabled={loading || listening}
        />

        <button
          className="chat-send"
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          aria-label="Send message"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
