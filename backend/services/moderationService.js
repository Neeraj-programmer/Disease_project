/**
 * Content Moderation & Trust Scoring Service
 * Detects: fake reviews, promotions, medical claims, contact info, spam
 */

// ── Suspicious keyword dictionaries ──
const PROMO_KEYWORDS = [
  'best doctor', 'top doctor', 'famous doctor', 'contact dr', 'call dr',
  'visit dr', 'best hospital', 'best clinic', 'guaranteed cure', 'permanent cure',
  '100% cure', 'miracle cure', 'money back', 'discount', 'offer', 'free consultation',
  'book appointment', 'whatsapp', 'telegram', 'dm me', 'inbox me',
  'guaranteed results', 'best treatment center', 'recommended doctor',
  'only doctor', 'must visit', 'changed my life completely',
  'affiliate', 'sponsored', 'paid partnership', 'use my code', 'promo code',
  'link in bio', 'check out', 'buy now', 'order now', 'limited time',
];

const MEDICAL_CLAIM_KEYWORDS = [
  '100% cure', 'permanent cure', 'complete cure', 'guaranteed treatment',
  'never come back', 'fully cured', 'miracle treatment', 'instant relief',
  'works for everyone', 'scientifically proven to cure', 'cures all',
  'no side effects guaranteed', 'better than doctors', 'doctors don\'t want you to know',
  'secret treatment', 'ancient remedy that cures', 'one pill cures',
];

const CONTACT_PATTERNS = [
  /\b\d{10,}\b/,                          // phone numbers
  /\+\d{1,3}[\s-]?\d{6,}/,               // international phone
  /[\w.+-]+@[\w-]+\.[\w.]+/,             // emails
  /(?:whatsapp|wa\.me|t\.me|telegram)/i,  // messaging apps
  /(?:instagram|facebook|twitter|youtube)\.com\/\w+/i, // social links
  /https?:\/\/[^\s]+/,                    // any URLs
  /dr\.?\s+[A-Z][a-z]+\s+[A-Z][a-z]+/i, // Doctor names like "Dr. John Smith"
];

const SPAM_PATTERNS = [
  /(.{20,})\1{2,}/,      // repeated text blocks
  /[A-Z\s]{30,}/,         // excessive caps
  /!{5,}/,                // excessive exclamation marks
  /\${2,}/,               // currency spam
];

// ── Main Moderation Function ──
function moderateContent(text) {
  const lower = text.toLowerCase();
  const flags = [];
  let trustScore = 100;

  // 1. Check promotional keywords
  const promoMatches = PROMO_KEYWORDS.filter(k => lower.includes(k));
  if (promoMatches.length > 0) {
    flags.push({
      type: 'promotional',
      reason: `Promotional keywords detected: ${promoMatches.join(', ')}`,
    });
    trustScore -= Math.min(40, promoMatches.length * 15);
  }

  // 2. Check medical claims
  const claimMatches = MEDICAL_CLAIM_KEYWORDS.filter(k => lower.includes(k));
  if (claimMatches.length > 0) {
    flags.push({
      type: 'medical-claim',
      reason: `Unrealistic medical claims: ${claimMatches.join(', ')}`,
    });
    trustScore -= Math.min(35, claimMatches.length * 15);
  }

  // 3. Check contact info
  const contactMatches = CONTACT_PATTERNS.filter(p => p.test(text));
  if (contactMatches.length > 0) {
    flags.push({
      type: 'contact-info',
      reason: 'Contains contact information, links, or doctor names',
    });
    trustScore -= 25;
  }

  // 4. Check spam patterns
  const spamMatches = SPAM_PATTERNS.filter(p => p.test(text));
  if (spamMatches.length > 0) {
    flags.push({
      type: 'spam',
      reason: 'Spam patterns detected (repeated text, excessive caps)',
    });
    trustScore -= 20;
  }

  // 5. Sentiment analysis for promotional tone
  const promoTone = analyzePromotionalTone(lower);
  if (promoTone.isPromotional) {
    flags.push({
      type: 'promotional-tone',
      reason: `Promotional writing style detected (confidence: ${(promoTone.confidence * 100).toFixed(0)}%)`,
    });
    trustScore -= Math.floor(promoTone.confidence * 20);
  }

  // 6. Check text quality
  const quality = analyzeTextQuality(text);
  trustScore += quality.bonus;
  if (quality.flags.length > 0) {
    flags.push(...quality.flags);
  }

  return {
    trustScore: Math.max(0, Math.min(100, trustScore)),
    flags,
    isPromotional: promoMatches.length > 0 || promoTone.isPromotional,
    hasMedicalClaims: claimMatches.length > 0,
    hasContactInfo: contactMatches.length > 0,
    moderationStatus: trustScore < 20 ? 'hidden' : trustScore < 40 ? 'under-review' : 'published',
  };
}

// ── Promotional Tone Analysis ──
function analyzePromotionalTone(text) {
  const promoIndicators = [
    'you should try', 'highly recommend', 'must try', 'changed my life',
    'best ever', 'amazing results', 'you won\'t believe', 'trust me',
    'i promise', 'guaranteed', 'act now', 'don\'t miss', 'life changing',
    'revolutionary', 'breakthrough', 'exclusive', 'special offer',
  ];
  const matches = promoIndicators.filter(ind => text.includes(ind));
  const confidence = Math.min(0.95, matches.length * 0.2);
  return {
    isPromotional: matches.length >= 2,
    confidence,
    matches,
  };
}

// ── Text Quality Analysis ──
function analyzeTextQuality(text) {
  const flags = [];
  let bonus = 0;
  const wordCount = text.split(/\s+/).length;

  // Very short posts are suspicious
  if (wordCount < 15) {
    flags.push({ type: 'low-quality', reason: 'Post is very short (less than 15 words)' });
    bonus -= 10;
  }

  // Detailed posts get bonus
  if (wordCount > 50) bonus += 5;
  if (wordCount > 100) bonus += 5;

  // Check for balanced content (mentions both positives and negatives)
  const hasPositive = /improved|better|helped|relief|cleared/.test(text.toLowerCase());
  const hasNegative = /didn't work|side effects|worse|painful|failed/.test(text.toLowerCase());
  if (hasPositive && hasNegative) bonus += 10; // Balanced = more authentic

  return { bonus, flags };
}

// ── Chat Message Safety Check ──
function moderateChat(message) {
  const lower = message.toLowerCase();
  const warnings = [];

  // Check for doctor promotion
  const promoInChat = PROMO_KEYWORDS.filter(k => lower.includes(k));
  if (promoInChat.length > 0) {
    warnings.push('⚠️ Avoid sharing doctor promotions or recommendations in chat.');
  }

  // Check for contact info
  const contactInChat = CONTACT_PATTERNS.filter(p => p.test(message));
  if (contactInChat.length > 0) {
    warnings.push('⚠️ Sharing contact details, links, or personal info is not allowed.');
  }

  // Check for medical claims
  const claimsInChat = MEDICAL_CLAIM_KEYWORDS.filter(k => lower.includes(k));
  if (claimsInChat.length > 0) {
    warnings.push('⚠️ Avoid making guaranteed cure claims. This is a support community, not medical advice.');
  }

  return {
    isBlocked: warnings.length > 0,
    warnings,
  };
}

// ── Check for duplicate/similar posts by same user ──
async function checkDuplicatePost(userId, title, description, Post) {
  const recentPosts = await Post.find({
    author: userId,
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  }).select('title description');

  for (const post of recentPosts) {
    const titleSimilarity = calculateSimilarity(title.toLowerCase(), post.title.toLowerCase());
    const descSimilarity = calculateSimilarity(
      description.toLowerCase().substring(0, 200),
      post.description.toLowerCase().substring(0, 200)
    );
    if (titleSimilarity > 0.7 || descSimilarity > 0.6) {
      return { isDuplicate: true, reason: 'Similar post already published in last 24 hours' };
    }
  }
  return { isDuplicate: false };
}

// Simple similarity calculation (Jaccard)
function calculateSimilarity(a, b) {
  const setA = new Set(a.split(/\s+/));
  const setB = new Set(b.split(/\s+/));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

function extractDoctorNames(text) {
  if (!text) return [];
  const matches = text.match(/dr\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/g) || [];
  return [...new Set(matches.map((name) => name.trim().toLowerCase()))];
}

module.exports = {
  moderateContent,
  moderateChat,
  checkDuplicatePost,
  extractDoctorNames,
};
