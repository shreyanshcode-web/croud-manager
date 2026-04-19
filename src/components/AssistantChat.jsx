import React, { useState, useRef, useEffect, useCallback } from 'react';

const QUICK_PROMPTS = [
  'Where\'s the shortest food queue?',
  'Best time to leave to beat traffic?',
  'Which gate is least crowded?',
  'Nearest restroom?',
  'Is parking full?',
];

function buildContext(data, intelligence) {
  if (!data) return '';
  const { stats, gates, concessions, transport } = data;
  const sortedGates = [...gates].sort((a, b) => a.waitMinutes - b.waitMinutes);
  const sortedFood = [...concessions].sort((a, b) => a.avgWaitMinutes - b.avgWaitMinutes);
  const nextTransport = [...transport].sort((a, b) => a.eta - b.eta).slice(0, 3);

  return `
LIVE VENUE DATA (${new Date().toLocaleTimeString()}):
- Venue: ${data.venue.name}, Event: ${data.venue.event}
- Capacity: ${stats.attendancePercent}% full (${stats.totalAttendance.toLocaleString()} fans)
- Avg gate wait: ${stats.avgGateWait} min | Avg food queue: ${stats.avgConcessionWait} min
- Parking: ${stats.parkingUtilization}% full

GATES (sorted by wait, shortest first):
${sortedGates.slice(0, 4).map(g => `  - ${g.name}: ${g.waitMinutes.toFixed(1)}min wait, ${g.status}`).join('\n')}

FOOD STANDS (sorted by wait, shortest first):
${sortedFood.slice(0, 4).map(c => `  - ${c.name}: ${c.avgWaitMinutes.toFixed(1)}min wait, ${c.status}`).join('\n')}

NEXT TRANSPORT ARRIVALS:
${nextTransport.map(t => `  - ${t.line}: arriving in ${t.eta} min (${t.status})`).join('\n')}

${intelligence ? `AI RISK NOTE: ${intelligence.venueScore?.summary || ''}` : ''}
  `.trim();
}

function buildSystemPrompt(venueContext) {
  return `You are SV-Companion, a friendly and helpful AI assistant for event attendees at Apex Arena. You have access to live venue data and your job is to give short, practical, specific advice to help fans have the best experience.

IMPORTANT RULES:
- Give short, direct answers (2-4 sentences max)
- Always mention specific names (gates, stands) from the live data
- Be friendly and conversational, not robotic
- Use relevant emojis sparingly
- Focus 100% on helping the fan, not on technical details

${venueContext}`;
}

export default function AssistantChat({ data, intelligence }) {
  const [messages, setMessages] = useState([
    {
      id: 'intro',
      role: 'ai',
      text: `Hey! 👋 I'm your venue AI companion for today's event. Ask me anything — shortest queues, best time to leave, where to find food, or anything else. What can I help with?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;

    const userMsg = { id: Date.now(), role: 'user', text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const venueContext = buildContext(data, intelligence);
      const systemPrompt = buildSystemPrompt(venueContext);

      const res = await fetch('/api/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trafficLevel: data?.stats?.attendancePercent > 90 ? 'High' : data?.stats?.attendancePercent > 70 ? 'Medium' : 'Low',
          userLocation: trimmed,
          userQuery: trimmed,
          systemContext: systemPrompt,
        }),
      });

      let aiText = 'I couldn\'t get a response right now. Try asking again!';
      if (res.ok) {
        const json = await res.json();
        aiText = json.advice || aiText;
      }

      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: aiText }]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'ai',
        text: 'I\'m having trouble connecting. Check your network and try again! 📶',
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, data, intelligence]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid var(--border)' }}>
        <div className="flex-between">
          <div>
            <h2 className="fw-800 fs-18">AI Companion</h2>
            <p className="fs-12 text-muted">Powered by Gemini — live venue data</p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, var(--accent), #8B5CF6)',
            borderRadius: 12,
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
          }}>
            ✨
          </div>
        </div>

        {/* Quick Prompts */}
        <div className="quick-prompts" role="list" aria-label="Quick question suggestions">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              className="quick-prompt-chip"
              onClick={() => sendMessage(p)}
              role="listitem"
              aria-label={p}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div
        className="chat-messages"
        role="log"
        aria-live="polite"
        aria-label="Conversation"
      >
        {messages.map(msg => (
          <div key={msg.id} className={`chat-msg ${msg.role}`}>
            <div className={`chat-avatar${msg.role === 'user' ? ' user-av' : ''}`} aria-hidden="true">
              {msg.role === 'ai' ? '✨' : '👤'}
            </div>
            <div className={`chat-bubble ${msg.role}`} role="article">
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-msg ai" aria-live="polite" aria-label="AI is typing">
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

      {/* Input */}
      <div className="chat-input-bar">
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder="Ask about queues, exits, food…"
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
