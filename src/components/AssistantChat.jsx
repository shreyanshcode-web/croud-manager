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

GATES (shortest wait first):
${sortedGates.slice(0, 4).map(g => `  - ${g.name}: ${g.waitMinutes.toFixed(1)}min, ${g.status}`).join('\n')}

FOOD (shortest wait first):
${sortedFood.slice(0, 4).map(c => `  - ${c.name}: ${c.avgWaitMinutes.toFixed(1)}min`).join('\n')}

NEXT TRANSPORT:
${nextTransit.map(t => `  - ${t.line}: ${t.eta}min`).join('\n')}
${intelligence?.venueScore?.summary ? `\nVENUE AI NOTE: ${intelligence.venueScore.summary}` : ''}
  `.trim();
}

function buildSystemPrompt(ctx) {
  return `You are SV-Companion, a friendly AI assistant for live event fans at Apex Arena. Give short (2-4 sentences), practical, specific answers using the live data below. Be friendly, use 1-2 relevant emojis, and ALWAYS name specific gates or stands.\n\n${ctx}`;
}

export default function AssistantChat({ data, intelligence }) {
  const { trackEvent, trackSearch, trackScreen } = useAnalytics();

  const [messages, setMessages] = useState([
    {
      id: 'intro',
      role: 'ai',
      text: "Hey! 👋 I'm your AI companion for today's event. Ask me about queues, exits, food, or anything else. What can I help with?",
      original: null,
    },
  ]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [lang, setLang]           = useState('en');
  const [showLang, setShowLang]   = useState(false);
  const [translating, setTranslating] = useState(null); // message id being translated
  const bottomRef = useRef(null);

  useEffect(() => {
    trackScreen('AI Chat');
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;

    trackSearch(trimmed);
    trackEvent('ai_query_sent', { query_length: trimmed.length, language: lang });

    const userMsg = { id: Date.now(), role: 'user', text: trimmed, original: null };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const venueContext  = buildContext(data, intelligence);
      const systemContext = buildSystemPrompt(venueContext);

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

      // Auto-translate if non-English is selected
      let translatedText = aiText;
      if (lang !== 'en') {
        try {
          const tr = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: aiText, targetLang: lang }),
          });
          if (tr.ok) {
            const trData = await tr.json();
            translatedText = trData.translatedText || aiText;
          }
        } catch {}
      }

      setMessages(prev => [...prev, {
        id:       Date.now() + 1,
        role:     'ai',
        text:     translatedText,
        original: lang !== 'en' ? aiText : null,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id:       Date.now() + 1,
        role:     'ai',
        text:     "I'm having trouble connecting. Check your network 📶",
        original: null,
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, data, intelligence, lang]);

  // Translate a single past message on demand
  const translateMessage = async (msgId, text) => {
    if (lang === 'en') return;
    setTranslating(msgId);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang: lang }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, text: data.translatedText, original: text } : m
        ));
        trackEvent('message_translated', { target_lang: lang });
      }
    } finally {
      setTranslating(null);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 8px', borderBottom: '1px solid var(--border)' }}>
        <div className="flex-between">
          <div>
            <h2 className="fw-800 fs-18">AI Companion</h2>
            <p className="fs-12 text-muted">
              Powered by <span style={{ color: '#4285F4', fontWeight: 700 }}>Gemini</span>
              {lang !== 'en' && <span> · {SUPPORTED_LANGUAGES[lang]}</span>}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Language Selector — Cloud Translation API */}
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setShowLang(v => !v)}
                aria-label="Change response language"
                title="Change language (Cloud Translation API)"
              >
                🌐 {lang.toUpperCase()}
              </button>
              {showLang && (
                <div style={{
                  position: 'absolute', right: 0, top: '110%',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 12,
                  zIndex: 50,
                  minWidth: 180,
                  overflow: 'hidden',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}>
                  {Object.entries(SUPPORTED_LANGUAGES).map(([code, label]) => (
                    <button
                      key={code}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 16px',
                        background: lang === code ? 'var(--accent-glow)' : 'transparent',
                        color: lang === code ? 'var(--accent-light)' : 'var(--text-primary)',
                        border: 'none',
                        fontSize: 13,
                        fontWeight: lang === code ? 700 : 400,
                        cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif',
                      }}
                      onClick={() => { setLang(code); setShowLang(false); trackEvent('language_changed', { language: code }); }}
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
        <div className="quick-prompts" style={{ marginTop: 8 }} role="list">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              className="quick-prompt-chip"
              onClick={() => sendMessage(p)}
              role="listitem"
            >
              {p}
            </button>
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

              {/* Show original English if translated */}
              {msg.role === 'ai' && msg.original && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 4 }}>
                  <em>Original: {msg.original.slice(0, 80)}{msg.original.length > 80 ? '…' : ''}</em>
                </div>
              )}

              {/* Translate button for messages in English */}
              {msg.role === 'ai' && lang !== 'en' && !msg.original && (
                <button
                  style={{
                    alignSelf: 'flex-start',
                    fontSize: 11,
                    color: 'var(--accent-light)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    fontFamily: 'Inter, sans-serif',
                  }}
                  onClick={() => translateMessage(msg.id, msg.text)}
                  disabled={translating === msg.id}
                >
                  {translating === msg.id ? '⏳ Translating…' : `🌐 Translate to ${SUPPORTED_LANGUAGES[lang]}`}
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-msg ai" aria-live="polite">
            <div className="chat-avatar" aria-hidden="true">✨</div>
            <div className="chat-bubble ai">
              <div className="chat-typing" aria-hidden="true">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div className="chat-input-bar">
        <textarea
          className="chat-input"
          placeholder={lang === 'en' ? 'Ask about queues, exits, food…' : 'Ask anything — reply auto-translated'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          aria-label="Type your message"
          disabled={loading}
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
