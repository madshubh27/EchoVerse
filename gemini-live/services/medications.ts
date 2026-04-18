// Common medications used in clinical practice
// Data sourced from WHO Essential Medicines List and Indian National Formulary

export const COMMON_MEDICATIONS = {
  cardiovascular: [
    { name: 'Amlodipine', dosage: '5-10mg', frequency: 'OD', indication: 'Hypertension, Angina' },
    { name: 'Enalapril', dosage: '10-20mg', frequency: 'OD', indication: 'Hypertension, Heart failure' },
    { name: 'Atorvastatin', dosage: '20-40mg', frequency: 'OD', indication: 'Hypercholesterolemia' },
    { name: 'Metoprolol', dosage: '50-100mg', frequency: 'BD', indication: 'Hypertension, Angina' },
    { name: 'Aspirin', dosage: '75-325mg', frequency: 'OD', indication: 'Post-MI prophylaxis' },
  ],
  
  respiratory: [
    { name: 'Albuterol/Salbutamol', dosage: '100μg', frequency: 'PRN', indication: 'Asthma, COPD' },
    { name: 'Fluticasone', dosage: '100-250μg', frequency: 'BD', indication: 'Asthma control' },
    { name: 'Montelukast', dosage: '10mg', frequency: 'OD', indication: 'Asthma, Allergies' },
    { name: 'Ipratropium', dosage: '20μg', frequency: 'TDS', indication: 'COPD' },
  ],
  
  gastrointestinal: [
    { name: 'Omeprazole', dosage: '20-40mg', frequency: 'OD', indication: 'GERD, PUD' },
    { name: 'Metoclopramide', dosage: '10mg', frequency: 'TDS', indication: 'Nausea, Vomiting' },
    { name: 'Ranitidine', dosage: '150-300mg', frequency: 'BD', indication: 'Acid reflux' },
    { name: 'Ondansetron', dosage: '4-8mg', frequency: 'TDS', indication: 'Chemotherapy nausea' },
  ],
  
  infections: [
    { name: 'Amoxicillin', dosage: '500mg', frequency: 'TDS', indication: 'Bacterial infections' },
    { name: 'Azithromycin', dosage: '500mg', frequency: 'OD', indication: 'Respiratory infections' },
    { name: 'Ciprofloxacin', dosage: '500mg', frequency: 'BD', indication: 'Urinary tract infections' },
    { name: 'Cephalexin', dosage: '500mg', frequency: 'QID', indication: 'Skin infections' },
  ],
  
  painAndInflammation: [
    { name: 'Ibuprofen', dosage: '400-600mg', frequency: 'TDS-QID', indication: 'Pain, Fever, Inflammation' },
    { name: 'Paracetamol', dosage: '500-1000mg', frequency: 'QID', indication: 'Pain, Fever' },
    { name: 'Diclofenac', dosage: '50mg', frequency: 'BD-TDS', indication: 'Acute pain, Inflammation' },
    { name: 'Tramadol', dosage: '50-100mg', frequency: 'QID', indication: 'Moderate pain' },
  ],
  
  neurological: [
    { name: 'Phenytoin', dosage: '300mg', frequency: 'OD', indication: 'Epilepsy' },
    { name: 'Levetiracetam', dosage: '500-1000mg', frequency: 'BD', indication: 'Seizures' },
    { name: 'Amitriptyline', dosage: '25-75mg', frequency: 'OD', indication: 'Depression, Neuropathic pain' },
    { name: 'Fluoxetine', dosage: '20-40mg', frequency: 'OD', indication: 'Depression, Anxiety' },
  ],
  
  endocrine: [
    { name: 'Metformin', dosage: '500-2000mg', frequency: 'BD-TDS', indication: 'Type 2 Diabetes' },
    { name: 'Glibenclamide', dosage: '2.5-15mg', frequency: 'OD-BD', indication: 'Type 2 Diabetes' },
    { name: 'Levothyroxine', dosage: '50-200μg', frequency: 'OD', indication: 'Hypothyroidism' },
  ],
};

export const MEDICATION_SIDE_EFFECTS: Record<string, string[]> = {
  'Amlodipine': ['Headache', 'Dizziness', 'Flushing', 'Peripheral edema'],
  'Metformin': ['Nausea', 'Diarrhea', 'Metallic taste', 'Vitamin B12 deficiency (long-term)'],
  'Ibuprofen': ['GI upset', 'Heartburn', 'Dizziness', 'Rash'],
  'Fluoxetine': ['Nausea', 'Headache', 'Insomnia', 'Sexual dysfunction'],
  'Omeprazole': ['Headache', 'Diarrhea', 'Abdominal pain', 'Vitamin B12 deficiency (long-term)'],
};

export const MEDICATION_INTERACTIONS: Record<string, string[]> = {
  'Warfarin': ['NSAIDs', 'Aspirin', 'Antibiotics', 'Alcohol (excessive)'],
  'Metformin': ['Alcohol (excessive)', 'Contrast media', 'NSAIDs'],
  'Lithium': ['NSAIDs', 'ACE inhibitors', 'Thiazide diuretics'],
  'Fluoxetine': ['MAOIs', 'Tricyclic antidepressants', 'Alcohol'],
};

export function getMedicationDetails(medName: string): {
  name: string  ;
  dosage?: string;
  frequency?: string;
  indication?: string;
  sideEffects?: string[];
  interactions?: string[];
} | null {
  for (const category of Object.values(COMMON_MEDICATIONS)) {
    const med = category.find(m => m.name.toLowerCase() === medName.toLowerCase());
    if (med) {
      return {
        ...med,
        sideEffects: MEDICATION_SIDE_EFFECTS[med.name] || [],
        interactions: MEDICATION_INTERACTIONS[med.name] || [],
      };
    }
  }
  return null;
}

export function checkDrugInteraction(med1: string, med2: string): boolean {
  const interactions = MEDICATION_INTERACTIONS[med1] || [];
  return interactions.some(drug => drug.toLowerCase().includes(med2.toLowerCase()));
}
