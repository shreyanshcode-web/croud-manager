/**
 * Cloud Translation API Service (Backend)
 * Translates text to any supported language.
 *
 * Google Service: Google Cloud Translation API v2
 * Docs: https://cloud.google.com/translate/docs/reference/rest
 */
import { getSecret } from '../gcp-secrets.js';

const SUPPORTED_LANGUAGES = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  mr: 'Marathi',
  bn: 'Bengali',
  fr: 'French',
  es: 'Spanish',
  de: 'German',
  ar: 'Arabic',
  zh: 'Chinese (Simplified)',
  ja: 'Japanese',
};

/**
 * Translate a text string to the target language.
 * @param {string} text      - source text
 * @param {string} targetLang - BCP-47 language code (e.g. 'hi', 'ta', 'fr')
 * @returns {Promise<{ translatedText: string, detectedSourceLanguage: string }>}
 */
export async function translateText(text, targetLang = 'en') {
  if (!text || targetLang === 'en') {
    return { translatedText: text, detectedSourceLanguage: 'en' };
  }

  const apiKey = await getSecret('GOOGLE_TRANSLATE_API_KEY');

  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q:      text,
      target: targetLang,
      format: 'text',
    }),
  });

  if (!res.ok) throw new Error(`Translation API error: ${res.status}`);

  const data = await res.json();
  const translation = data.data?.translations?.[0];

  if (!translation) throw new Error('Empty translation response');

  return {
    translatedText:          translation.translatedText,
    detectedSourceLanguage:  translation.detectedSourceLanguage || 'en',
  };
}

export { SUPPORTED_LANGUAGES };
