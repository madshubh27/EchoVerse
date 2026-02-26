
// Emergency Red Flag Detection Service

export const RED_FLAGS = [
    'chest pain', 'heart attack', 'difficulty breathing', 'can\'t breathe',
    'shortness of breath', 'stroke symptoms', 'loss of consciousness',
    'severe bleeding', 'signs of heart attack', 'unconscious', 'seizure',
    'anaphylaxis', 'severe allergic reaction', 'paralysis', 'not breathing',
    'choking', 'overdose', 'poisoning', 'severe burns', 'deep wound',
];

export interface RedFlagResult {
    triggered: boolean;
    matchedFlag: string | null;
    emergencyMessage: string;
    nearbyER: string;
    ambulanceNumber: string;
}

export function checkRedFlags(symptomInput: string): RedFlagResult {
    const lower = symptomInput.toLowerCase();
    for (const flag of RED_FLAGS) {
        if (lower.includes(flag)) {
            return {
                triggered: true,
                matchedFlag: flag,
                emergencyMessage: `🚨 Emergency: "${flag}" detected. Do NOT delay — call emergency services immediately.`,
                nearbyER: 'Find nearest emergency room at google.com/maps/search/emergency+room+near+me',
                ambulanceNumber: '112 (India) / 911 (US)',
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
