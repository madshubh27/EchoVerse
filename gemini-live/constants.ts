
import { Type, FunctionDeclaration } from '@google/genai';
import { Language } from './types';

export const GEMINI_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';
export const INPUT_SAMPLE_RATE = 16000;
export const OUTPUT_SAMPLE_RATE = 24000;

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
];

export const HEALTHCARE_TOOLS: FunctionDeclaration[] = [
  {
    name: 'bookAppointment',
    description: 'Schedule a medical appointment for a patient with a specific department or doctor.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        department: {
          type: Type.STRING,
          description: 'The medical department (e.g., Cardiology, Pediatrics, General Medicine).'
        },
        preferredTime: {
          type: Type.STRING,
          description: 'The requested time or date for the appointment.'
        },
        reason: {
          type: Type.STRING,
          description: 'Brief reason for the visit.'
        }
      },
      required: ['department', 'preferredTime']
    }
  },
  {
    name: 'checkSymptomSeverity',
    description: 'Analyzes symptoms provided by the patient and provides a severity score and recommended action.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        symptoms: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'List of symptoms mentioned by the user.'
        },
        duration: {
          type: Type.STRING,
          description: 'How long the symptoms have been present.'
        }
      },
      required: ['symptoms']
    }
  },
  {
    name: 'findNearbyClinic',
    description: 'Finds healthcare facilities near the user based on their current location.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        location: {
          type: Type.STRING,
          description: 'The user\'s city or zip code if available, otherwise "current".'
        },
        clinicType: {
          type: Type.STRING,
          description: 'Type of clinic (e.g., Urgent Care, Pharmacy, Hospital).'
        }
      },
      required: ['clinicType']
    }
  },
  {
    name: 'setPrescriptionReminder',
    description: 'Creates a reminder for the patient to take their medication at a specific time.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        medication: {
          type: Type.STRING,
          description: 'Name of the medication.'
        },
        time: {
          type: Type.STRING,
          description: 'Time to take the medication (e.g., "8:00 AM", "every 6 hours").'
        },
        frequency: {
          type: Type.STRING,
          description: 'How often to take it (e.g., "daily", "twice daily", "every 8 hours").'
        }
      },
      required: ['medication', 'time']
    }
  },
  {
    name: 'getMedicationInfo',
    description: 'Retrieves detailed information about a medication including dosage, side effects, and drug interactions.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        medicationName: {
          type: Type.STRING,
          description: 'Name of the medication to look up.'
        }
      },
      required: ['medicationName']
    }
  },
  {
    name: 'getWeatherHealthAlert',
    description: 'Gets weather conditions and health alerts (air quality, pollen, UV index) for a location. Useful for patients with asthma, allergies, or respiratory conditions.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        location: {
          type: Type.STRING,
          description: 'City name or zip code.'
        }
      },
      required: ['location']
    }
  },
  {
    name: 'generateSessionSummary',
    description: 'Generates a structured summary of the current consultation session for the patient to share with their doctor.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        keyFindings: {
          type: Type.STRING,
          description: 'Main findings or concerns discussed.'
        },
        recommendations: {
          type: Type.STRING,
          description: 'Recommended actions or next steps.'
        },
        followUp: {
          type: Type.STRING,
          description: 'Suggested follow-up timing.'
        }
      },
      required: ['keyFindings', 'recommendations']
    }
  }
];

export const getSystemInstruction = (language: string, userProfile?: any): string => {
  const profileContext = userProfile && userProfile.name
    ? `\nPatient Profile:\n- Name: ${userProfile.name}\n- Age: ${userProfile.age || 'Not provided'}\n- Known Allergies: ${userProfile.allergies || 'None reported'}\n- Existing Conditions: ${userProfile.conditions || 'None reported'}\n- Current Medications: ${userProfile.medications || 'None reported'}\n`
    : '';

  return `
You are med_ai, a professional, empathetic, and highly capable healthcare voice assistant.
Your goal is to assist patients with healthcare-related tasks like checking symptoms, finding clinics, scheduling appointments, managing prescriptions, and providing medication information.

${profileContext}

Respond in ${language}. If the user speaks in a different language, switch to match their language.

EMERGENCY RED FLAGS — CHECK FIRST (NON-SKIPPABLE):
If the user mentions any of these, immediately advise them to call emergency services and use the SOS button:
- Chest pain / heart attack symptoms
- Difficulty breathing / shortness of breath
- Loss of consciousness / seizure
- Severe bleeding / stroke symptoms
- Anaphylaxis / severe allergic reaction
These cases skip ALL normal booking flows. Safety first.

SEVERITY ROUTING:
After listening to symptoms, classify the severity:
- SEVERE (score 8-10): Redirect to emergency immediately.
- MODERATE (score 4-7): Offer booking / teleconsult options. Ask if they prefer Voice, Video, or In-Person.
- MILD (score 1-3): Provide self-care guidance and monitoring tips. Only book if symptoms persist.

TELECONSULT FIRST:
For moderate cases, recommend voice or video consult before in-person visits. It reduces clinic crowding.

Guidelines:
1. Speak in a calm, soothing, and supportive tone.
2. Be concise but informative.
3. Use the provided tools when relevant to give concrete answers.
4. Always verify key details before finalizing an appointment booking (specialty, date, time, consult type).
5. You can set prescription reminders — confirm medication name, time, and frequency.
6. You can look up medication information including dosage guidelines, side effects, and drug interactions.
7. You can check weather and health alerts (air quality, pollen, UV) for locations.
8. At the end of a consultation, offer to generate a session summary for the patient to share with their doctor.
9. You are a tool to assist, not a replacement for a doctor's diagnosis. Include a standard medical disclaimer when appropriate.
10. For follow-up patients: ask how they are feeling since their last appointment and monitor for worsening symptoms.
`;
};

// Keep backward compat
export const SYSTEM_INSTRUCTION = getSystemInstruction('English');
