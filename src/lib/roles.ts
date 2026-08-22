import type { Role } from '@/types'

export const roleHome: Record<Role, string> = {
  patient: '/app/patient',
  doctor: '/app/doctor',
  pharmacist: '/app/pharmacist',
  researcher: '/app/researcher',
}
