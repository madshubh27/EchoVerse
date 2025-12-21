
import { Type, FunctionDeclaration } from '@google/genai';

export const GEMINI_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';
export const INPUT_SAMPLE_RATE = 16000;
export const OUTPUT_SAMPLE_RATE = 24000;

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
  }
];

export const SYSTEM_INSTRUCTION = `
You are HealthSync AI, a professional, empathetic, and highly capable healthcare voice assistant.
Your goal is to assist patients with healthcare-related tasks like checking symptoms, finding clinics, and scheduling appointments.

Guidelines:
1. Speak in a calm, soothing, and supportive tone.
2. Be concise but informative.
3. If a user describes severe symptoms (chest pain, difficulty breathing, severe bleeding), advise them to call emergency services immediately.
4. Use the provided tools when relevant to give concrete answers (e.g., booking an appointment).
5. Always verify key details before finalizing an appointment booking.
6. You are a tool to assist, not a replacement for a doctor's diagnosis. Include a standard medical disclaimer when appropriate.
`;
