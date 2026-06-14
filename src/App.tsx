import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Landing } from '@/pages/Landing'
import { Login } from '@/pages/Login'
import { NotFound } from '@/pages/NotFound'

import { PatientDashboard } from '@/portals/patient/PatientDashboard'
import { NewSubmission } from '@/portals/patient/NewSubmission'
import { PatientReports } from '@/portals/patient/PatientReports'
import { HealthProfile } from '@/portals/patient/HealthProfile'

import { DoctorDashboard } from '@/portals/doctor/DoctorDashboard'
import { ReviewQueue } from '@/portals/doctor/ReviewQueue'
import { DoctorAnalytics } from '@/portals/doctor/DoctorAnalytics'

import { PharmacistDashboard } from '@/portals/pharmacist/PharmacistDashboard'
import { DrugIntelligence } from '@/portals/pharmacist/DrugIntelligence'
import { AdrMonitor } from '@/portals/pharmacist/AdrMonitor'

import { ResearcherDashboard } from '@/portals/researcher/ResearcherDashboard'
import { CohortExplorer } from '@/portals/researcher/CohortExplorer'
import { DiseaseAtlas } from '@/portals/researcher/DiseaseAtlas'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/app/patient"
        element={
          <ProtectedRoute role="patient">
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<PatientDashboard />} />
        <Route path="upload" element={<NewSubmission />} />
        <Route path="reports" element={<PatientReports />} />
        <Route path="profile" element={<HealthProfile />} />
      </Route>

      <Route
        path="/app/doctor"
        element={
          <ProtectedRoute role="doctor">
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DoctorDashboard />} />
        <Route path="queue" element={<ReviewQueue />} />
        <Route path="analytics" element={<DoctorAnalytics />} />
      </Route>

      <Route
        path="/app/pharmacist"
        element={
          <ProtectedRoute role="pharmacist">
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<PharmacistDashboard />} />
        <Route path="intelligence" element={<DrugIntelligence />} />
        <Route path="adr" element={<AdrMonitor />} />
      </Route>

      <Route
        path="/app/researcher"
        element={
          <ProtectedRoute role="researcher">
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ResearcherDashboard />} />
        <Route path="cohorts" element={<CohortExplorer />} />
        <Route path="categories" element={<DiseaseAtlas />} />
      </Route>

      <Route path="/app" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
