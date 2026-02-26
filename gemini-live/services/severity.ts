
import { SeverityLevel, SeverityResult } from '../types';

// Symptom scoring map — each keyword adds to the severity score
const SEVERITY_SCORES: Record<string, number> = {
    // Severe triggers (score 8-10)
    'chest pain': 10, 'heart attack': 10, 'stroke': 10, 'unconscious': 10,
    'severe bleeding': 10, 'can\'t breathe': 10, 'difficulty breathing': 9,
    'shortness of breath': 9, 'loss of consciousness': 10, 'seizure': 9,
    'paralysis': 9, 'severe allergic': 9, 'anaphylaxis': 10,
    // Moderate triggers (score 4-7)
    'high fever': 6, 'fever': 4, 'vomiting': 5, 'severe headache': 6,
    'persistent pain': 5, 'infection': 5, 'swelling': 4, 'dizziness': 5,
    'fainting': 7, 'blood in urine': 6, 'blood in stool': 7, 'dehydration': 5,
    'migraine': 5, 'abdominal pain': 5, 'chest tightness': 7, 'palpitations': 6,
    'rash': 4, 'jaundice': 6, 'numbness': 5, 'vision problems': 6,
    // Mild triggers (score 1-3)
    'cold': 2, 'cough': 2, 'sore throat': 2, 'runny nose': 1, 'sneeze': 1,
    'mild headache': 2, 'fatigue': 2, 'tiredness': 2, 'minor cut': 1,
    'bruise': 1, 'stomach ache': 3, 'nausea': 3, 'back pain': 3,
};

const SELF_CARE_TIPS: Record<string, string[]> = {
    cold: ['Rest and stay hydrated', 'Warm fluids like ginger tea', 'OTC cold medicine if needed'],
    cough: ['Honey and warm water', 'Steam inhalation', 'Rest your voice'],
    headache: ['Drink water', 'Rest in a quiet dark room', 'OTC pain reliever if needed'],
    fatigue: ['Get 7-8 hours of sleep', 'Light exercise', 'Balanced nutrition'],
};

export function classifySeverity(symptoms: string[]): SeverityResult {
    let score = 0;
    const text = symptoms.join(' ').toLowerCase();

    for (const [keyword, points] of Object.entries(SEVERITY_SCORES)) {
        if (text.includes(keyword)) {
            score = Math.max(score, points);
        }
    }

    if (score >= 8) {
        return {
            level: 'severe',
            score,
            message: '🚨 Emergency detected. Please seek immediate medical attention or call emergency services.',
            action: 'emergency',
        };
    } else if (score >= 4) {
        return {
            level: 'moderate',
            score,
            message: '⚠️ Your symptoms suggest you should consult a doctor. Choose your preferred consultation method.',
            action: 'book_appointment',
        };
    } else {
        return {
            level: 'mild',
            score,
            message: '✅ Your symptoms appear mild. Here are some self-care tips to help you feel better.',
            action: 'self_care',
        };
    }
}

export function classifySeverityFromText(text: string): SeverityResult {
    const words = text.toLowerCase().split(/[\s,]+/);
    return classifySeverity(words);
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
    const text = symptoms.join(' ').toLowerCase();
    for (const [key, keyTips] of Object.entries(SELF_CARE_TIPS)) {
        if (text.includes(key)) tips.push(...keyTips);
    }
    if (tips.length === 0) {
        tips.push('Rest and stay hydrated', 'Monitor your symptoms closely', 'Seek medical advice if symptoms worsen');
    }
    return [...new Set(tips)].slice(0, 5);
}
