import { describe, expect, it } from 'vitest'
import { classifySymptomText, extractFeatures, predictProba } from './classifier'

describe('extractFeatures', () => {
  it('matches dataset symptom names in free text', () => {
    const { matched } = extractFeatures('I have itching and a skin rash')
    expect(matched).toContain('itching')
    expect(matched).toContain('skin_rash')
  })

  it('maps lay synonyms to model features', () => {
    const { matched } = extractFeatures('shortness of breath and a racing heart')
    expect(matched).toContain('breathlessness')
    expect(matched).toContain('fast_heart_rate')
  })

  it('ignores negated mentions', () => {
    const { matched } = extractFeatures('no fever, denies chest pain, without vomiting')
    expect(matched).not.toContain('high_fever')
    expect(matched).not.toContain('chest_pain')
    expect(matched).not.toContain('vomiting')
  })

  it('keeps positive mentions alongside negated ones', () => {
    const { matched } = extractFeatures('high fever but no chills and no headache')
    expect(matched).toContain('high_fever')
    expect(matched).not.toContain('chills')
    expect(matched).not.toContain('headache')
  })

  it('does not match substrings of unrelated words', () => {
    const { matched } = extractFeatures('my elbow hurts when I play tennis')
    expect(matched).toHaveLength(0)
  })
})

describe('predictProba', () => {
  it('returns a normalized distribution over all classes', () => {
    const { vector } = extractFeatures('itching skin rash')
    const probs = predictProba(vector)
    expect(probs).toHaveLength(41)
    expect(probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6)
    expect(Math.min(...probs)).toBeGreaterThan(0)
  })
})

describe('classifySymptomText', () => {
  it('predicts the textbook disease for canonical symptoms', () => {
    const top = classifySymptomText('itching, skin rash and nodal skin eruptions')[0]
    expect(top.disease).toBe('Fungal infection')
    expect(top.probability).toBeGreaterThan(0.5)
  })

  it('flags heart attack for chest pain with autonomic signs', () => {
    const preds = classifySymptomText('chest pain, shortness of breath, sweating and fast heart rate')
    expect(preds[0].disease).toBe('Heart attack')
    expect(preds[0].category).toBe('cardiovascular')
  })

  it('abstains when no known symptom is detected', () => {
    expect(classifySymptomText('my elbow hurts when I play tennis')).toHaveLength(0)
  })

  it('does not activate features from negated-only mentions', () => {
    expect(classifySymptomText('no fever, no cough, denies headache, feeling fine')).toHaveLength(0)
  })
})
