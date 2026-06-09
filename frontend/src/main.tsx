import React, { lazy } from 'react'
import ReactDOM from 'react-dom/client'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'

import './index.css'
import './projects.css'
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ProjectsHome = lazy(() => import('./pages/ProjectsHome'))
const NewDraftWizard = lazy(() => import('./pages/NewDraft'))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/projects" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/projects" element={<ProjectsHome />} />
        <Route path="/new-draft" element={<NewDraftWizard />} />
        <Route path="/dashboard/:draftId" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)