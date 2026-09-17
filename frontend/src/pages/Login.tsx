import { useState } from 'react'
import { Mail, Lock, Loader2, Sparkles } from 'lucide-react'
import { api } from '../lib/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const endpoint = isLogin
      ? '/api/auth/sign-in/email'
      : '/api/auth/sign-up/email'

    try {
      await api.post(endpoint, {
        email,
        password,
        name: email.split('@')[0] || 'Demo User',
      })
      
      window.location.href = '/projects'
    } catch (err: unknown) {
      console.error('Auth error:', err)
      const errorMessage = getAuthErrorMessage(err)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-page-container">
      {/* Ambient background glowing circles */}
      <div className="glow-circle glow-1" />
      <div className="glow-circle glow-2" />
      <div className="glow-circle glow-3" />

      <div className="login-card-wrapper">
        <form onSubmit={handleSubmit} className="login-card">
          <header className="login-card-header">
            <div className="login-logo">
              <span className="logo-emoji">📝</span>
              <span className="logo-text">FlowDraft</span>
            </div>
            <h2>{isLogin ? 'Welcome back' : 'Create an account'}</h2>
            <p className="subtitle">
              {isLogin ? 'Simplify your writing, paragraph by paragraph.' : 'Start your journey to structured writing.'}
            </p>
          </header>

          {error && (
            <div className="login-error-box" role="alert">
              <span className="error-icon">⚠️</span>
              <p className="error-message">{error}</p>
            </div>
          )}

          <div className="login-input-group">
            <label className="input-label" htmlFor="email-input">Email address</label>
            <div className="input-with-icon">
              <Mail className="input-icon" size={18} />
              <input
                id="email-input"
                type="email"
                required
                className="login-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="login-input-group">
            <label className="input-label" htmlFor="password-input">Password</label>
            <div className="input-with-icon">
              <Lock className="input-icon" size={18} />
              <input
                id="password-input"
                type="password"
                required
                className="login-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button className="login-submit-btn" disabled={isLoading} type="submit">
            {isLoading ? (
              <>
                <Loader2 className="spinner" size={18} />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>{isLogin ? 'Sign In' : 'Sign Up'}</span>
              </>
            )}
          </button>

          <footer className="login-card-footer">
            <button
              type="button"
              className="toggle-auth-btn"
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
              }}
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

function getAuthErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    if ('response' in error && error.response && typeof error.response === 'object') {
      const response = error.response as { 
        data?: unknown, 
        status?: number 
      }
      
      if (response.data && typeof response.data === 'object') {
        const data = response.data as Record<string, unknown>
        
        if (data.message && typeof data.message === 'string') {
          return data.message
        }
        if (data.error && typeof data.error === 'string') {
          return data.error
        }
        if (data.detail && typeof data.detail === 'string') {
          return data.detail
        }
        
        if (data.errors && Array.isArray(data.errors)) {
          return data.errors.join(', ')
        }
      }
      
      if (response.status === 401) {
        return 'Invalid email or password'
      }
      if (response.status === 403) {
        return 'Access denied'
      }
      if (response.status === 409) {
        return 'Email already exists. Please use a different email or login.'
      }
      if (response.status === 422) {
        return 'Please check your input and try again'
      }
    }
    
    if ('request' in error) {
      return 'Network error: Could not connect to server. Please check your connection.'
    }
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return 'Authentication failed. Please try again later.'
}
