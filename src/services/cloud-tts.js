/**
 * Google Cloud Text-to-Speech Service (Backend)
 * Converts AI companion responses to audio for accessibility.
 *
 * Google Service: Google Cloud Text-to-Speech API
 * Docs: https://cloud.google.com/text-to-speech/docs/reference/rest
 */
import { getSecret } from '../gcp-secrets.js';

/**
 * Synthesize speech from text using Google Cloud TTS.
 * Returns a base64-encoded MP3 audio string.
 *
 * @param {string} text       - Text to synthesize
 * @param {string} languageCode - BCP-47 code, e.g. 'en-IN', 'hi-IN'
 * @param {string} gender     - 'NEUTRAL' | 'FEMALE' | 'MALE'
 * @returns {Promise<string>} base64-encoded MP3 audio content
 */
export async function synthesizeSpeech(text, languageCode = 'en-IN', gender = 'NEUTRAL') {
  const apiKey = await getSecret('GOOGLE_TTS_API_KEY');

  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text: text.slice(0, 800) }, // TTS limit — trim gracefully
      voice: {
        languageCode,
        ssmlGender: gender,
        // Prefer WaveNet for natural sound, fall back to Standard
        name: `${languageCode}-Wavenet-C`,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0,
        effectsProfileId: ['headphone-class-device'],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TTS API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  if (!data.audioContent) throw new Error('TTS returned no audio content');
  return data.audioContent; // base64 MP3
}

// Language code map for translation lang codes → TTS voice codes
export const TTS_LANG_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
  fr: 'fr-FR',
  es: 'es-ES',
  de: 'de-DE',
  ar: 'ar-XA',
  zh: 'cmn-CN',
  ja: 'ja-JP',
};
