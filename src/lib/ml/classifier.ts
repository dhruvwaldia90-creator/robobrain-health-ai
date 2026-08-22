import type { DiseaseCategoryId } from '@/types'
import modelJson from './model.json'

/**
 * In-browser ML inference for the symptom->disease classifier.
 *
 * The model is a multinomial logistic regression trained offline (see
 * `ml/train.py`) on the Kaggle Disease Prediction dataset (4,920 cases,
 * 132 binary symptoms, 41 diseases) and exported to `model.json`.
 * Inference here is a pure dot-product + softmax — no server round-trip.
 *
 * Honest metrics: 100% on the synthetic holdout, ~93% top-1 / 100% top-3
 * under partial+noisy symptom input (see ml/eval_report.json).
 */

interface MlModel {
  name: string
  type: 'logreg' | 'bernoulli_nb'
  symptoms: string[]
  classes: string[]
  coef: number[][]
  intercept: number[]
  metrics: Record<string, number>
}

const model = modelJson as unknown as MlModel

export const ML_MODEL_INFO = {
  name: model.name,
  source: 'Kaggle Disease Prediction (4,920 cases, 132 symptoms, 41 diseases)',
  metrics: model.metrics,
} as const

export interface MlPrediction {
  disease: string
  category: DiseaseCategoryId
  probability: number
  matchedSymptoms: string[]
}

/** Extra free-text phrases that should activate a dataset symptom feature. */
const SYNONYMS: Record<string, string[]> = {
  high_fever: ['fever', 'high temperature', 'temperature'],
  mild_fever: ['low grade fever'],
  breathlessness: ['shortness of breath', 'breathless', 'difficulty breathing', 'dyspnea'],
  chest_pain: ['chest tightness', 'tight chest'],
  continuous_sneezing: ['sneezing', 'sneeze'],
  runny_nose: ['runny nose', 'sniffles'],
  congestion: ['stuffy nose', 'blocked nose', 'nasal congestion'],
  cough: ['coughing'],
  sore_throat: ['throat pain', 'throat hurts'],
  headache: ['head ache', 'head pain'],
  vomiting: ['throwing up', 'threw up', 'puking'],
  nausea: ['feel sick', 'queasy'],
  stomach_pain: ['stomach ache', 'tummy ache'],
  abdominal_pain: ['stomach pain', 'belly pain', 'tummy pain'],
  joint_pain: ['joint ache', 'aching joints', 'joints hurt'],
  muscle_pain: ['body ache', 'body pain', 'muscle ache'],
  skin_rash: ['rash'],
  itching: ['itchy', 'itch'],
  fatigue: ['tired', 'tiredness', 'exhausted', 'exhaustion'],
  weight_loss: ['losing weight', 'lost weight'],
  weight_gain: ['gaining weight', 'gained weight'],
  dizziness: ['dizzy', 'lightheaded', 'light headed'],
  blurred_and_distorted_vision: ['blurred vision', 'blurry vision', 'vision blurry'],
  polyuria: ['frequent urination', 'urinating often', 'peeing a lot'],
  excessive_hunger: ['very hungry', 'always hungry'],
  increased_appetite: ['hungry often'],
  loss_of_appetite: ['no appetite', 'not hungry', 'appetite loss'],
  diarrhoea: ['diarrhea', 'loose motions', 'loose stool'],
  constipation: ['constipated'],
  sweating: ['sweaty', 'perspiring'],
  chills: ['shivering'],
  yellowish_skin: ['yellow skin', 'jaundice'],
  yellowing_of_eyes: ['yellow eyes'],
  dark_urine: ['dark pee'],
  fast_heart_rate: ['rapid heartbeat', 'racing heart', 'palpitations', 'heart racing'],
  irregular_sugar_level: ['blood sugar', 'sugar levels'],
  back_pain: ['backache', 'back ache'],
  neck_pain: ['neck ache', 'stiff neck'],
  weakness_in_limbs: ['weak arms', 'weak legs', 'limb weakness'],
  throat_irritation: ['scratchy throat'],
  acidity: ['heartburn', 'acid reflux'],
  ulcers_on_tongue: ['mouth ulcers', 'tongue ulcers'],
  muscle_wasting: ['muscle loss'],
}

const DISEASE_CATEGORY: Record<string, DiseaseCategoryId> = {
  'Fungal infection': 'infectious',
  Allergy: 'respiratory',
  GERD: 'metabolic',
  'Chronic cholestasis': 'metabolic',
  'Drug Reaction': 'metabolic',
  'Peptic ulcer diseae': 'metabolic',
  AIDS: 'infectious',
  Diabetes: 'metabolic',
  Gastroenteritis: 'infectious',
  'Bronchial Asthma': 'respiratory',
  Hypertension: 'cardiovascular',
  Migraine: 'neurological',
  'Cervical spondylosis': 'neurological',
  'Paralysis (brain hemorrhage)': 'neurological',
  Jaundice: 'infectious',
  Malaria: 'infectious',
  'Chicken pox': 'infectious',
  Dengue: 'infectious',
  Typhoid: 'infectious',
  'hepatitis A': 'infectious',
  'Hepatitis B': 'infectious',
  'Hepatitis C': 'infectious',
  'Hepatitis D': 'infectious',
  'Hepatitis E': 'infectious',
  'Alcoholic hepatitis': 'infectious',
  Tuberculosis: 'infectious',
  'Common Cold': 'infectious',
  Pneumonia: 'infectious',
  'Dimorphic hemmorhoids(piles)': 'metabolic',
  'Heart attack': 'cardiovascular',
  'Varicose veins': 'cardiovascular',
  Hypothyroidism: 'metabolic',
  Hyperthyroidism: 'metabolic',
  Hypoglycemia: 'metabolic',
  Osteoarthristis: 'genetic',
  Arthritis: 'genetic',
  '(vertigo) Paroymsal  Positional Vertigo': 'neurological',
  Acne: 'genetic',
  'Urinary tract infection': 'infectious',
  Psoriasis: 'genetic',
  Impetigo: 'infectious',
}

const normalize = (s: string) => s.toLowerCase().replace(/[_\s]+/g, ' ').trim()

/** Phrase (normalized) for each model feature, precomputed once. */
const FEATURE_PHRASES = model.symptoms.map((s) => normalize(s))

/** Negation cues checked in the few words before a matched symptom phrase. */
const NEGATIONS = ['no', 'not', 'denies', 'denied', 'without', 'never', 'none']

/** True when the occurrence of `phrase` at `at` in `text` is negated. */
function isNegated(text: string, at: number): boolean {
  const before = text.slice(Math.max(0, at - 30), at)
  const words = before.split(/[^a-z]+/).filter(Boolean)
  return words.slice(-3).some((w) => NEGATIONS.includes(w))
}

/** Find a phrase in normalized text at word boundaries, skipping negated mentions. */
function findPhrase(text: string, phrase: string): boolean {
  let from = 0
  for (;;) {
    const at = text.indexOf(` ${phrase}`, from)
    if (at === -1) return false
    if (!isNegated(text, at)) return true
    from = at + 1
  }
}

/**
 * Turn free text into the 132-dim binary feature vector and report which
 * symptoms were detected. Negated mentions ("no fever", "denies chest pain")
 * do not activate a feature.
 */
export function extractFeatures(text: string): { vector: number[]; matched: string[] } {
  const t = ` ${normalize(text)} `
  const vector = new Array<number>(model.symptoms.length).fill(0)
  const matched: string[] = []
  model.symptoms.forEach((sym, i) => {
    const phrases = [FEATURE_PHRASES[i], ...(SYNONYMS[sym] ?? [])]
    if (phrases.some((p) => p.length > 2 && findPhrase(t, p))) {
      vector[i] = 1
      matched.push(sym)
    }
  })
  return { vector, matched }
}

const softmax = (logits: number[]): number[] => {
  const max = Math.max(...logits)
  const exps = logits.map((z) => Math.exp(z - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map((e) => e / sum)
}

/** Raw inference: feature vector -> per-class probabilities. */
export function predictProba(vector: number[]): number[] {
  const logits = model.coef.map((row, c) => {
    let z = model.intercept[c]
    for (let i = 0; i < vector.length; i++) if (vector[i] === 1) z += row[i]
    return z
  })
  return softmax(logits)
}

/**
 * Classify free-text symptoms. Returns the top-k predicted diseases with
 * probabilities, or an empty array when no known symptom was detected.
 */
export function classifySymptomText(text: string, topK = 3): MlPrediction[] {
  const { vector, matched } = extractFeatures(text)
  if (matched.length === 0) return []
  const probs = predictProba(vector)
  return model.classes
    .map((raw, i) => {
      const disease = raw.trim()
      return {
        disease,
        category: DISEASE_CATEGORY[disease] ?? 'infectious',
        probability: probs[i],
        matchedSymptoms: matched,
      }
    })
    .sort((a, b) => b.probability - a.probability)
    .slice(0, topK)
}
