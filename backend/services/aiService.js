const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
let model = null;

// Initialize Gemini if API key is available
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  console.log('✅ Gemini AI initialized');
} else {
  console.log('ℹ️  No GEMINI_API_KEY found – using enhanced local AI');
}

// ── Enhanced Local AI (fallback when no API key) ──

const TRIGGER_KEYWORDS = ['stress', 'diet', 'weather', 'cold', 'alcohol', 'smoking', 'sleep', 'anxiety', 'gluten', 'dairy', 'sugar', 'humidity', 'sunlight', 'infection', 'hormones', 'pregnancy', 'medication', 'pollution', 'exercise', 'dehydration'];
const TREATMENT_KEYWORDS = ['steroid', 'cream', 'moisturizer', 'phototherapy', 'uv', 'methotrexate', 'biologics', 'humira', 'coal tar', 'salicylic acid', 'vitamin d', 'turmeric', 'aloe vera', 'fish oil', 'meditation', 'yoga', 'retinoid', 'cyclosporine', 'cortisone', 'emollient', 'antibiotics', 'antifungal', 'calcineurin'];
const OUTCOME_KEYWORDS = ['improved', 'cleared', 'worse', 'flare-up', 'remission', 'stable', 'reduced', 'spread', 'healed', 'controlled', 'worsened', 'subsided', 'persistent', 'recurring', 'mild improvement', 'significant improvement'];
const SYMPTOM_KEYWORDS = ['itching', 'scaling', 'redness', 'burning', 'cracking', 'bleeding', 'dryness', 'swelling', 'joint pain', 'nail changes', 'plaques', 'flaking', 'inflammation', 'soreness', 'peeling', 'blistering', 'thickening', 'discoloration'];

function localSummarize(text) {
  if (!text || text.length < 50) return text;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  const summary = sentences.slice(0, 3).join('. ').trim();
  return summary ? summary + '.' : text.substring(0, 200) + '...';
}

function localExtractInsights(post) {
  const allText = `${post.title} ${post.description} ${post.results || ''} ${post.advice || ''} ${post.mistakes || ''}`.toLowerCase();

  return {
    detectedTriggers: TRIGGER_KEYWORDS.filter((k) => allText.includes(k)),
    detectedTreatments: TREATMENT_KEYWORDS.filter((k) => allText.includes(k)),
    detectedOutcomes: OUTCOME_KEYWORDS.filter((k) => allText.includes(k)),
    detectedSymptoms: SYMPTOM_KEYWORDS.filter((k) => allText.includes(k)),
  };
}

function localSentiment(text) {
  const lower = text.toLowerCase();
  const positive = ['improved', 'better', 'healed', 'cleared', 'remission', 'happy', 'grateful', 'hope', 'progress', 'relief', 'stable', 'controlled'];
  const negative = ['worse', 'painful', 'frustrated', 'suffering', 'spread', 'terrible', 'depressed', 'hopeless', 'flare', 'agony', 'unbearable'];
  const posCount = positive.filter(w => lower.includes(w)).length;
  const negCount = negative.filter(w => lower.includes(w)).length;
  if (posCount > negCount) return { sentiment: 'positive', confidence: Math.min(0.9, 0.5 + posCount * 0.1) };
  if (negCount > posCount) return { sentiment: 'negative', confidence: Math.min(0.9, 0.5 + negCount * 0.1) };
  return { sentiment: 'neutral', confidence: 0.5 };
}

// ── Gemini AI Functions ──

async function geminiSummarize(text) {
  try {
    const prompt = `Summarize this skin condition experience in 2-3 concise sentences. Focus on the condition, treatments tried, and outcomes:\n\n"${text}"`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error('Gemini summarize error:', err.message);
    return localSummarize(text);
  }
}

async function geminiExtractInsights(post) {
  try {
    const text = `${post.title} ${post.description} ${post.results || ''} ${post.advice || ''}`;
    const prompt = `Analyze this skin condition post and extract the following as JSON. Be specific and return only valid JSON, no markdown:\n{\n  "detectedTriggers": [],\n  "detectedTreatments": [],\n  "detectedOutcomes": [],\n  "detectedSymptoms": [],\n  "recommendation": "brief one-line suggestion"\n}\n\nPost: "${text}"`;
    const result = await model.generateContent(prompt);
    let responseText = result.response.text().trim();
    // Remove markdown code fences if present
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(responseText);
  } catch (err) {
    console.error('Gemini insights error:', err.message);
    return localExtractInsights(post);
  }
}

async function geminiSentiment(text) {
  try {
    const prompt = `Analyze the emotional sentiment of this skin condition post. Return only valid JSON: {"sentiment": "positive|negative|neutral|mixed", "confidence": 0.0-1.0}\n\nPost: "${text}"`;
    const result = await model.generateContent(prompt);
    let responseText = result.response.text().trim();
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(responseText);
  } catch (err) {
    console.error('Gemini sentiment error:', err.message);
    return localSentiment(text);
  }
}

// ── Exported API (auto-selects Gemini or local) ──

exports.summarize = async (text) => {
  if (model) return geminiSummarize(text);
  return localSummarize(text);
};

exports.extractInsights = async (post) => {
  if (model) return geminiExtractInsights(post);
  return localExtractInsights(post);
};

exports.analyzeSentiment = async (text) => {
  if (model) return geminiSentiment(text);
  return localSentiment(text);
};

exports.isGeminiAvailable = () => !!model;
