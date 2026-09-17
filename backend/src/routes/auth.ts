// src/routes/auth.ts
import { Router, Request, Response } from 'express'

const router = Router()

// Sign-up endpoint
router.post('/sign-up/email', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      })
    }
    
    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters' 
      })
    }
    
    console.log('Sign-up attempt:', { email, name })
    
    res.status(201).json({ 
      message: 'User created successfully',
      user: { email, name }
    })
    
  } catch (error) {
    console.error('Sign-up error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Sign-in endpoint
router.post('/sign-in/email', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      })
    }
    
    // Temporary response for testing
    console.log('Sign-in attempt:', { email })
    
    res.status(200).json({ 
      message: 'Login successful',
      user: { email },
      token: 'dummy-token-123' // Remove this when you implement real auth
    })
    
  } catch (error) {
    console.error('Sign-in error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router