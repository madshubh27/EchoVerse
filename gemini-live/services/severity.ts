
import { SeverityLevel, SeverityResult } from '../types';

// Symptom scoring map — based on WHO triage and clinical severity assessment
const SEVERITY_SCORES: Record<string, number> = {
    // Life-threatening/Immediate triage (score 9-10)
    'acute chest pain': 10, 'myocardial infarction': 10, 'acute stroke': 10, 'unconscious': 10,
    'massive hemorrhage': 10, 'respiratory distress': 10, 'severe dyspnea': 9,
    'acute coronary': 9, 'loss of consciousness': 10, 'status epilepticus': 9,
    'anaphylactic shock': 10, 'airway obstruction': 10,
    // Urgent/Emergent triage (score 6-8)
    'high fever': 6, 'severe headache': 7, 'acute abdominal pain': 7, 'persistent vomiting': 6,
    'acute infection': 6, 'difficulty breathing': 8, 'chest tightness': 7, 'severe hypertension': 7,
    'acute dehydration': 6, 'severe migraine': 7, 'hematuria': 6, 'hemoptysis': 8,
    'altered mental status': 8, 'acute allergic reaction': 7, 'cardiac palpitations': 6,
    'acute dizziness': 6, 'syncope': 7, 'acute rash': 5, 'severe trauma': 9,
    // Non-urgent/Routine (score 1-5)
    'common cold': 2, 'dry cough': 2, 'pharyngitis': 2, 'nasal congestion': 1, 
    'mild headache': 2, 'general fatigue': 2, 'muscle pain': 3, 'minor laceration': 1,
    'contusion': 1, 'dyspepsia': 3, 'nausea': 3, 'myalgia': 2, 'arthralgia': 2,
};

const GREETING_ONLY_PATTERNS = [
    /^hi+$/,
    /^hello+$/,
    /^hey+$/,
    /^hii+$/,
    /^yo+$/,
    /^sup+$/,
];

const MEDICAL_PATTERNS: Array<{ pattern: RegExp; score: number }> = [
    { pattern: /\b(chest pain|pressure in chest|tight chest|pain in chest)\b/, score: 9 },
    { pattern: /\b(shortness of breath|difficulty breathing|trouble breathing|breathless|wheezing)\b/, score: 8 },
    { pattern: /\b(high fever|fever|temperature|febrile)\b/, score: 3 },
    { pattern: /\b(cough|dry cough|productive cough|phlegm|sputum)\b/, score: 2 },
    { pattern: /\b(sore throat|throat pain|pharyngitis)\b/, score: 2 },
    { pattern: /\b(headache|migraine|head pain)\b/, score: 3 },
    { pattern: /\b(vomiting|vomit|nausea|retching)\b/, score: 3 },
    { pattern: /\b(abdominal pain|stomach pain|belly pain|stomach ache|cramps)\b/, score: 4 },
    { pattern: /\b(diarrhea|loose stools)\b/, score: 3 },
    { pattern: /\b(rash|hives|itching|itchy skin)\b/, score: 2 },
    { pattern: /\b(dizziness|lightheaded|fainting|syncope)\b/, score: 4 },
    { pattern: /\b(weakness|fatigue|tired|exhausted)\b/, score: 2 },
    { pattern: /\b(back pain|lower back pain|neck pain)\b/, score: 2 },
    { pattern: /\b(burning urination|painful urination|dysuria)\b/, score: 4 },
    { pattern: /\b(joint pain|arthralgia|muscle pain|myalgia)\b/, score: 2 },
    { pattern: /\b(runny nose|nasal congestion|blocked nose)\b/, score: 1 },
    { pattern: /\b(swelling|edema|puffy)\b/, score: 3 },
    { pattern: /\b(fever with cough|cough with fever|fever and cough)\b/, score: 4 },
    { pattern: /\b(chest pain with shortness of breath|shortness of breath with chest pain)\b/, score: 10 },
    { pattern: /\b(severe headache|worst headache|thunderclap headache)\b/, score: 7 },
    { pattern: /\b(blood in stool|black stool|vomiting blood|coughing blood)\b/, score: 8 },
];

function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isGreetingOnly(text: string): boolean {
    const normalized = normalizeText(text);
    return GREETING_ONLY_PATTERNS.some(pattern => pattern.test(normalized));
}

function getMatchingScore(text: string): number {
    const normalized = normalizeText(text);
    let score = 0;

    for (const [keyword, points] of Object.entries(SEVERITY_SCORES)) {
        if (normalized.includes(keyword)) {
            score = Math.max(score, points);
        }
    }

    for (const entry of MEDICAL_PATTERNS) {
        if (entry.pattern.test(normalized)) {
            score = Math.max(score, entry.score);
        }
    }

    return score;
}

const SELF_CARE_TIPS: Record<string, string[]> = {
    cold: ['Rest for 7-10 days', 'Increase fluid intake (2-3 liters daily)', 'Vitamin C supplementation', 'Paracetamol for symptomatic relief'],
    cough: ['Honey and warm water (15ml)', 'Steam inhalation 2-3 times daily', 'Maintain humidity', 'Avoid irritants'],
    headache: ['Hydration - drink 500ml water immediately', 'Rest in dark quiet environment', 'Apply cold compress', 'NSAIDs if persistent'],
    fatigue: ['Sleep 7-9 hours nightly', 'Light aerobic activity', 'Balanced nutrition with proteins', 'Stress management'],
    pharyngitis: ['Warm salt water gargles (3-4 times daily)', 'Throat lozenges', 'Avoid cold foods', 'Rest voice'],
};

export function classifySeverity(symptoms: string[]): SeverityResult {
    const score = getMatchingScore(symptoms.join(' '));

    if (score >= 8) {
        return {
            level: 'severe',
            score,
            message: '🚨 EMERGENT: These symptoms require immediate medical attention. Call emergency services or go to nearest trauma center.',
            action: 'emergency',
        };
    } else if (score >= 5) {
        return {
            level: 'moderate',
            score,
            message: '⚠️ URGENT: Your symptoms warrant prompt medical evaluation within 2-4 hours. Schedule urgent appointment or visit clinic.',
            action: 'book_appointment',
        };
    } else {
        return {
            level: 'mild',
            score,
            message: '✅ ROUTINE: Your symptoms are non-urgent. Follow self-care measures and revisit if symptoms persist >7 days.',
            action: 'self_care',
        };
    }
}

export function classifySeverityFromText(text: string): SeverityResult {
    const normalized = normalizeText(text);

    // Validate input
    if (!normalized || normalized.length < 3 || isGreetingOnly(normalized)) {
        return {
            level: 'mild',
            score: 0,
            message: '📋 Please describe a symptom or complaint, such as fever, cough, chest pain, rash, headache, or stomach pain.',
            action: 'self_care',
        };
    }

    const score = getMatchingScore(normalized);
    
    // If no keywords matched, ask for more specific symptoms
    if (score === 0) {
        return {
            level: 'mild',
            score: 0,
            message: '📋 I did not identify a clear medical symptom from that text. Please describe what feels wrong, how long it has been happening, and any associated symptoms.',
            action: 'self_care',
        };
    }

    return classifySeverity([normalized]);
}

export function getSeverityColor(level: SeverityLevel): string {
    switch (level) {
        case 'severe': return 'text-red-500 bg-red-500/10 border-red-500/30';
        case 'moderate': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
        case 'mild': return 'text-green-500 bg-green-500/10 border-green-500/30';
    }
}

export function getSeverityIcon(level: SeverityLevel): string {
    switch (level) {
        case 'severe': return '🚨';
        case 'moderate': return '⚠️';
        case 'mild': return '✅';
    }
}

export function getSelfCareTips(symptoms: string[]): string[] {
    const tips: string[] = [];
    const text = normalizeText(symptoms.join(' '));
    
    // If no symptoms recognized, return generic tips only
    let foundMatch = false;
    for (const [key, keyTips] of Object.entries(SELF_CARE_TIPS)) {
        if (text.includes(key)) {
            tips.push(...keyTips);
            foundMatch = true;
        }
    }

    if (text.includes('fever')) {
        tips.push('Check your temperature regularly', 'Stay hydrated with water and oral fluids', 'Rest and avoid strenuous activity');
        foundMatch = true;
    }
    if (text.includes('cough')) {
        tips.push('Use warm fluids or honey if appropriate', 'Avoid smoke and irritants', 'Consider steam inhalation if it helps');
        foundMatch = true;
    }
    if (text.includes('headache')) {
        tips.push('Rest in a quiet dark room', 'Drink water', 'Avoid excess screen time');
        foundMatch = true;
    }
    if (text.includes('rash') || text.includes('itch')) {
        tips.push('Avoid scratching the area', 'Use gentle, fragrance-free skincare', 'Seek care if swelling or breathing issues occur');
        foundMatch = true;
    }
    
    if (!foundMatch || tips.length === 0) {
        tips.push(
            'Drink plenty of water (2-3 liters daily)',
            'Rest and avoid strenuous activity',
            'Monitor symptoms closely',
            'Maintain proper nutrition',
            'Seek professional help if symptoms persist >7 days'
        );
    }
    
    return [...new Set(tips)].slice(0, 5);
}
