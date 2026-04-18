
// Emergency Red Flag Detection Service

export const RED_FLAGS = [
    'acute chest pain', 'myocardial infarction', 'respiratory distress', 'severe dyspnea',
    'acute coronary syndrome', 'stroke', 'altered consciousness', 'loss of consciousness',
    'massive hemorrhage', 'acute myocardial infarction', 'unconscious', 'status epilepticus',
    'anaphylactic shock', 'anaphylaxis', 'acute paralysis', 'apnea',
    'airway obstruction', 'drug overdose', 'toxic ingestion', 'severe thermal burns', 'penetrating trauma',
    'acute abdomen', 'severe shock', 'life-threatening arrhythmia',
];

const RED_FLAG_PATTERNS: Array<{ pattern: RegExp; flag: string }> = [
    { pattern: /\b(chest pain|pressure in chest|tight chest|pain in chest)\b/, flag: 'chest pain' },
    { pattern: /\b(shortness of breath|difficulty breathing|trouble breathing|breathless|wheezing)\b/, flag: 'shortness of breath' },
    { pattern: /\b(chest pain.*shortness of breath|shortness of breath.*chest pain)\b/, flag: 'chest pain with shortness of breath' },
    { pattern: /\b(loss of consciousness|unconscious|passed out|fainted)\b/, flag: 'loss of consciousness' },
    { pattern: /\b(stroke|face droop|arm weakness|speech difficulty|slurred speech)\b/, flag: 'stroke' },
    { pattern: /\b(anaphylaxis|anaphylactic shock|allergic reaction with swelling|throat closing)\b/, flag: 'anaphylaxis' },
    { pattern: /\b(vomiting blood|coughing blood|blood in stool|black stool)\b/, flag: 'bleeding' },
    { pattern: /\b(severe trauma|major trauma|deep wound|penetrating trauma)\b/, flag: 'trauma' },
    { pattern: /\b(overdose|drug overdose|toxic ingestion|poisoning)\b/, flag: 'overdose' },
    { pattern: /\b(apnea|not breathing|stopped breathing)\b/, flag: 'apnea' },
];

function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export interface RedFlagResult {
    triggered: boolean;
    matchedFlag: string | null;
    emergencyMessage: string;
    nearbyER: string;
    ambulanceNumber: string;
}

export function checkRedFlags(symptomInput: string): RedFlagResult {
    const lower = normalizeText(symptomInput);

    for (const { pattern, flag } of RED_FLAG_PATTERNS) {
        if (pattern.test(lower)) {
            return {
                triggered: true,
                matchedFlag: flag,
                emergencyMessage: `🚨 CRITICAL: "${flag}" detected. Call Emergency Services immediately. Do NOT delay.`,
                nearbyER: 'Locate nearest trauma center via Google Maps or call emergency dispatch',
                ambulanceNumber: '108 (India - Ambulance) / 911 (US) / 999 (UK)',
            };
        }
    }

    for (const flag of RED_FLAGS) {
        if (lower.includes(flag)) {
            return {
                triggered: true,
                matchedFlag: flag,
                emergencyMessage: `🚨 CRITICAL: "${flag}" detected. Call Emergency Services immediately. Do NOT delay.`,
                nearbyER: 'Locate nearest trauma center via Google Maps or call emergency dispatch',
                ambulanceNumber: '108 (India - Ambulance) / 911 (US) / 999 (UK)',
            };
        }
    }
    return {
        triggered: false,
        matchedFlag: null,
        emergencyMessage: '',
        nearbyER: '',
        ambulanceNumber: '',
    };
}

// Run this before any other routing — it's non-skippable
export function isEmergency(text: string): boolean {
    return checkRedFlags(text).triggered;
}
