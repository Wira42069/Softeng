import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'

import './index.css'
import './projects.css'
import Login from './pages/Login.tsx'
import Dashboard from './pages/Dashboard.tsx'
import ProjectsHome from './pages/ProjectsHome.tsx'
import NewDraftWizard from './pages/NewDraft.tsx'

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