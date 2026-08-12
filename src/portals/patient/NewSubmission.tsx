import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Attachment, Case, ReasoningStep, SubmissionType } from '@/types'
import { buildCaseFromSubmission, generateReportStream, PIPELINE_STAGES } from '@/lib/agents'
import { addCase, useAppState } from '@/lib/store'
import { Icon } from '@/components/Icon'
import { ReasoningTrace } from '@/components/ReasoningTrace'
import { ReportView } from '@/components/ReportView'
import { Card, SectionTitle } from '@/components/ui'

const TYPES: { id: SubmissionType; label: string; icon: string; hint: string }[] = [
  { id: 'symptoms', label: 'Symptoms', icon: 'Stethoscope', hint: 'Describe what you feel' },
  { id: 'prescription', label: 'Prescription', icon: 'Pill', hint: 'List your medications' },
  { id: 'lab', label: 'Lab report', icon: 'TestTube', hint: 'Attach results' },
]

const SAMPLE =
  'Chest tightness on exertion for the last 3 days, radiating to the left arm, with shortness of breath and sweating. Occasional dizziness when climbing stairs.'

export function NewSubmission() {
  const navigate = useNavigate()
  const { profile } = useAppState()
  const [type, setType] = useState<SubmissionType>('symptoms')
  const [title, setTitle] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [meds, setMeds] = useState<string[]>(profile.medications)
  const [medInput, setMedInput] = useState('')
  const [files, setFiles] = useState<Attachment[]>([])
  const [phase, setPhase] = useState<'form' | 'running' | 'done'>('form')
  const [steps, setSteps] = useState<ReasoningStep[]>([])
  const [listening, setListening] = useState(false)
  const [ocrBusy, setOcrBusy] = useState(false)
  const [ocrMsg, setOcrMsg] = useState<string | null>(null)
  const [result, setResult] = useState<Case | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const addMed = () => {
    const v = medInput.trim()
    if (v && !meds.includes(v)) setMeds([...meds, v])
    setMedInput('')
  }

  const addFile = () => {
    const id = Math.random().toString(36).slice(2, 8)
    setFiles([
      ...files,
      {
        id,
        name: `${type}_${id}.pdf`,
        type,
        sizeKb: Math.round(120 + Math.random() * 900),
        addedAt: new Date().toISOString(),
      },
    ])
  }

  // --- Voice-to-symptom (#8) ---
  const startListening = () => {
    interface RecLike {
      lang: string
      interimResults: boolean
      onstart: (() => void) | null
      onend: (() => void) | null
      onerror: (() => void) | null
      onresult: ((e: { results: { 0: { transcript: string } }[] }) => void) | null
      start: () => void
    }
    const w = window as unknown as {
      SpeechRecognition?: new () => RecLike
      webkitSpeechRecognition?: new () => RecLike
    }
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) {
      setOcrMsg('Voice input is not supported in this browser.')
      return
    }
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.onstart = () => setListening(true)
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    rec.onresult = (e) => {
      const text = e.results.map((r) => r[0].transcript).join(' ')
      setSymptoms((prev) => (prev ? `${prev} ${text}` : text))
    }
    rec.start()
  }

  // --- Prescription image OCR (#8) ---
  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setOcrBusy(true)
    setOcrMsg('Reading prescription image…')
    const url = URL.createObjectURL(file)
    try {
      const { recognize } = await import('tesseract.js')
      const { data } = await recognize(url, 'eng')
      const text = (data.text || '').trim()
      const medsFound = extractMeds(text)
      if (medsFound.length) {
        setMeds((prev) => Array.from(new Set([...prev, ...medsFound])))
        setOcrMsg(`OCR found ${medsFound.length} medication(s): ${medsFound.join(', ')}.`)
      } else if (text) {
        setOcrMsg('No medications recognised — paste text manually. OCR preview added to notes.')
        setSymptoms((prev) => (prev ? `${prev}\n[OCR] ${text.slice(0, 200)}` : `[OCR] ${text.slice(0, 200)}`))
      } else {
        setOcrMsg('No text recognised in the image.')
      }
      setFiles((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).slice(2, 8),
          name: file.name,
          type,
          sizeKb: Math.round(file.size / 1024),
          addedAt: new Date().toISOString(),
        },
      ])
    } catch {
      setOcrMsg('OCR failed — you can type the medications manually.')
    } finally {
      URL.revokeObjectURL(url)
      setOcrBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const run = async () => {
    setPhase('running')
    setSteps([])
    const newCase = buildCaseFromSubmission({
      profile,
      title: title.trim() || defaultTitle(type, symptoms),
      type,
      symptomsText: symptoms.trim() || SAMPLE,
      medications: meds,
      attachments: files,
    })

    // Stream the live reasoning trace, then attach the streamed report.
    const report = await generateReportStream(
      {
        symptomsText: symptoms.trim() || SAMPLE,
        medications: meds,
        profile,
      },
      {
        onStep: (step) => {
          setSteps((prev) => {
            const idx = prev.findIndex((s) => s.agentId === step.agentId)
            if (idx === -1) return [...prev, step]
            const copy = [...prev]
            copy[idx] = step
            return copy
          })
        },
      },
    )
    const streamedCase: Case = { ...newCase, report }
    addCase(streamedCase)
    setResult(streamedCase)
    setPhase('done')
    void PIPELINE_STAGES
  }

  if (phase === 'done' && result?.report) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-ink-900">Your AI report is ready</h1>
            <p className="text-ink-500">
              {result.report.triage?.destination === 'auto'
                ? 'Autonomously resolved with guidance — a doctor has been informed asynchronously.'
                : result.report.triage?.destination === 'pharmacist'
                  ? 'Routed to the pharmacist queue for medication-safety review.'
                  : 'Submitted for remote doctor review — you will be notified when a clinician signs off.'}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn-outline" onClick={() => navigate('/app/patient/reports')}>
              <Icon name="FileText" size={16} /> All reports
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                setPhase('form')
                setResult(null)
                setSymptoms('')
                setTitle('')
                setFiles([])
                setSteps([])
              }}
            >
              <Icon name="Plus" size={16} /> New submission
            </button>
          </div>
        </div>
        <ReportView report={result.report} />
      </div>
    )
  }

  if (phase === 'running') {
    return (
      <div className="mx-auto max-w-xl py-10">
        <Card className="text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 animate-pulse-ring place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-teal-500 text-white">
            <Icon name="BrainCircuit" size={30} />
          </div>
          <h2 className="text-xl font-extrabold text-ink-900">Agents are thinking…</h2>
          <p className="mt-1 text-sm text-ink-500">
            Watch the agent mesh reason step-by-step over your submission.
          </p>
          <div className="mt-6 text-left">
            <ReasoningTrace steps={steps} />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">New submission</h1>
        <p className="text-ink-500">
          Share your symptoms, prescription or lab report. The agent mesh will reason through it and
          generate a report — auto-routed by the triage agent.
        </p>
      </div>

      <Card>
        <SectionTitle icon="LayoutGrid" title="What are you submitting?" />
        <div className="grid gap-3 sm:grid-cols-3">
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={
                'rounded-2xl border p-4 text-left transition ' +
                (type === t.id
                  ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-100'
                  : 'border-ink-200 hover:bg-ink-50')
              }
            >
              <Icon name={t.icon} size={22} className={type === t.id ? 'text-brand-600' : 'text-ink-500'} />
              <div className="mt-2 font-bold text-ink-900">{t.label}</div>
              <div className="text-xs text-ink-500">{t.hint}</div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <label className="label">Title (optional)</label>
          <input
            className="input"
            placeholder="e.g. Chest tightness for 3 days"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label">
              {type === 'symptoms' ? 'Describe your symptoms' : 'Notes / context'}
            </label>
            <div className="flex items-center gap-2">
              <button
                className="text-xs font-semibold text-brand-600"
                onClick={() => setSymptoms(SAMPLE)}
                type="button"
              >
                Use sample
              </button>
              <button
                type="button"
                onClick={startListening}
                className={
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition ' +
                  (listening ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-700')
                }
                title="Voice-to-symptom input"
              >
                <Icon name={listening ? 'Circle' : 'Mic'} size={13} className={listening ? 'animate-pulse' : ''} />
                {listening ? 'Listening…' : 'Voice'}
              </button>
            </div>
          </div>
          <textarea
            className="input min-h-[120px] resize-y"
            placeholder="Describe onset, duration, severity, and anything that makes it better or worse…"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Current medications</label>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="e.g. Metformin 1000mg"
              value={medInput}
              onChange={(e) => setMedInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMed())}
            />
            <button className="btn-ghost" type="button" onClick={addMed}>
              <Icon name="Plus" size={16} /> Add
            </button>
          </div>
          {meds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {meds.map((m) => (
                <span key={m} className="chip bg-ink-100 text-ink-700">
                  {m}
                  <button onClick={() => setMeds(meds.filter((x) => x !== m))}>
                    <Icon name="X" size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="label">Attachments</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChosen}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={addFile}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-ink-300 bg-ink-50/50 px-4 py-6 text-sm font-semibold text-ink-500 transition hover:border-brand-300 hover:text-brand-600"
            >
              <Icon name="CloudUpload" size={20} /> Attach a {type} file
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={ocrBusy}
              className="btn-outline px-4 py-6 text-sm"
              title="Upload a photo of a prescription — OCR extracts medications"
            >
              <Icon name={ocrBusy ? 'LoaderCircle' : 'ScanText'} size={20} className={ocrBusy ? 'animate-spin' : ''} />
              {ocrBusy ? 'Scanning…' : 'Scan Rx photo'}
            </button>
          </div>
          {ocrMsg && (
            <p className="mt-2 text-xs text-ink-500">
              <Icon name="ScanText" size={12} className="mr-1 inline text-brand-500" />
              {ocrMsg}
            </p>
          )}
          {files.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {files.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-sm"
                >
                  <Icon name="Paperclip" size={15} className="text-ink-400" />
                  <span className="flex-1 truncate text-ink-700">{f.name}</span>
                  <span className="text-xs text-ink-400">{f.sizeKb} KB</span>
                  <button onClick={() => setFiles(files.filter((x) => x.id !== f.id))}>
                    <Icon name="Trash2" size={15} className="text-ink-400 hover:text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="btn-primary w-full py-3" onClick={run}>
          <Icon name="Sparkles" size={18} /> Run AI analysis
        </button>
      </Card>
    </div>
  )
}

function defaultTitle(type: SubmissionType, symptoms: string) {
  if (type === 'prescription') return 'Prescription review'
  if (type === 'lab') return 'Lab report analysis'
  const first = symptoms.split(/[.,\n]/)[0]?.trim()
  return first ? first.slice(0, 60) : 'Symptom assessment'
}

/** Pull likely drug names out of OCR text against a small known-drug list. */
const KNOWN_DRUGS = [
  'metformin', 'amlodipine', 'atorvastatin', 'lisinopril', 'clopidogrel', 'warfarin',
  'salbutamol', 'ibuprofen', 'aspirin', 'losartan', 'omeprazole', 'simvastatin',
]
function extractMeds(text: string): string[] {
  const lower = text.toLowerCase()
  return KNOWN_DRUGS.filter((d) => lower.includes(d)).map(
    (d) => d.charAt(0).toUpperCase() + d.slice(1),
  )
}
