import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  ArrowLeft,
  ArrowRight,
  Rocket,
  ChevronDown,
} from 'lucide-react'
import { api } from '../lib/api'

interface UserInfo {
  id: string
  name: string
  email: string
  image: string | null
}

interface RecommendCard {
  id: string
  title: string
  tag: string
  tagClass: string
  outline: string[]
}

const TOPICS = [
  'Education',
  'Technology',
  'Literature',
  'Science',
  'Business',
  'Philosophy',
  'Work & Career',
]

const WRITING_SKILLS = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert',
]

function getRecommendations(topic: string, skill: string): RecommendCard[] {
  const normalizedTopic = topic.trim().toLowerCase()

  if (normalizedTopic.includes('education')) {
    return [
      {
        id: 'edu-1',
        title: 'The Future of Hybrid Learning: Balancing Digital and Physical Spaces',
        tag: 'Education & Tech',
        tagClass: 'tag-education',
        outline: [
          '1. The Classroom Redefined: Introduction to Hybrid Spaces',
          '2. Pedagogy in 2D vs 3D Environments',
          '3. Overcoming Digital Fatigue: Mental Health Considerations',
          '4. A New Paradigm: Designing Next-Generation Curriculum',
        ],
      },
      {
        id: 'edu-2',
        title: 'Rethinking Standardized Testing: A Holistic Assessment Blueprint',
        tag: 'Education Policy',
        tagClass: 'tag-education',
        outline: [
          '1. The History and Legacy of Standardized Testing',
          '2. Cognitive Limits of Multiple-Choice Metrics',
          '3. Designing Holistic Assessment Matrices',
          '4. Case Study: Progressive Assessment Models Globally',
        ],
      },
      {
        id: 'edu-3',
        title: 'Neurodiversity in Modern Classrooms: Unlocking Unique Potentials',
        tag: 'Special Ed',
        tagClass: 'tag-education',
        outline: [
          '1. Understanding Neurodiversity: Beyond Diagnosis Labels',
          '2. Universal Design for Learning (UDL) Principles',
          '3. Sensory-Friendly Classroom Interventions',
          '4. Empowering Neurodivergent Voices through Choice',
        ],
      },
    ]
  }

  if (normalizedTopic.includes('technology')) {
    return [
      {
        id: 'tech-1',
        title: 'The Ethics of Autonomous AI: Balancing Innovation and Safety',
        tag: 'AI & Ethics',
        tagClass: 'tag-tech',
        outline: [
          '1. The Autonomous Horizon: Growth of Machine Agency',
          '2. Algorithmic Bias and Training Set Disparities',
          '3. Setting Global Guardrails: Regulation Frameworks',
          '4. Designing Human-in-the-Loop Safe Artificial Minds',
        ],
      },
      {
        id: 'tech-2',
        title: 'The Decentralized Web (Web3): Sovereignty vs. Centralized Platforms',
        tag: 'Web3 & Blockchain',
        tagClass: 'tag-tech',
        outline: [
          '1. Evolution of Web Infrastructure: From Web1 to Web3',
          '2. Cryptographic Proofs and Ownership Rights',
          '3. The Scalability Bottleneck: UX and Tech Barriers',
          '4. Decentralization vs Governance: Finding Equilibrium',
        ],
      },
      {
        id: 'tech-3',
        title: 'Quantum Computing and the Impending Cryptography Paradox',
        tag: 'Future Computing',
        tagClass: 'tag-tech',
        outline: [
          '1. Quantum Mechanics 101: Qubits and Superposition',
          '2. Breaking the Internet: Threat to RSA Encryption',
          '3. The Quantum-Resistant Safe Cryptography Framework',
          '4. Timeline to Utility: When Will Quantum Scale?',
        ],
      },
    ]
  }

  if (normalizedTopic.includes('literature')) {
    return [
      {
        id: 'lit-1',
        title: 'Speculative Fiction as a Modern Mirror of Existential Threats',
        tag: 'Literature Theory',
        tagClass: 'tag-literature-phil',
        outline: [
          '1. Roots of Speculative Fiction: Shelley to Gibson',
          '2. Dystopian Tropes and Real-World Technological Parallels',
          '3. Climate Fiction (Cli-Fi) and the Anthropocene Narratives',
          '4. The Hope-punk Response: Reimagining Better Futures',
        ],
      },
      {
        id: 'lit-2',
        title: 'The Mechanics of Tension: Pacing in Contemporary Psychological Thrillers',
        tag: 'Creative Craft',
        tagClass: 'tag-literature-phil',
        outline: [
          '1. Pacing and Sentence Architecture: Hooking the Reader',
          '2. The Unreliable Narrator: Sowing Subversive Seeds',
          '3. Creating Psychological Dread: Environment as Character',
          '4. Reversing Expectations: Designing the Unpredictable Twists',
        ],
      },
      {
        id: 'lit-3',
        title: 'Poetry in the Instagram Age: Short-Form Verse and Democratized Art',
        tag: 'Modern Media',
        tagClass: 'tag-literature-phil',
        outline: [
          '1. Micro-Poetry: Sincerity and Simplistic Sentence Layouts',
          '2. Visual Integration: Typographical Layouts and Photography',
          '3. Commercialization vs Artistic Rigor in Digital Mediums',
          '4. Community-Driven Creation: Instant Feedback Loops',
        ],
      },
    ]
  }

  if (normalizedTopic.includes('science')) {
    return [
      {
        id: 'sci-1',
        title: 'The Hunt for Biosignatures in the Oceans of Enceladus and Europa',
        tag: 'Astrobiology',
        tagClass: 'tag-science-work',
        outline: [
          '1. Tidal Heating: Keeping Sub-Surface Oceans Liquid',
          '2. Hydrothermal Vent Analogs: Chemical Precursors of Life',
          '3. Flyby Spectroscopy: Detecting Organics in Water Plumes',
          '4. Robotic Deep-Ice Submersibles: Designing Missions',
        ],
      },
      {
        id: 'sci-2',
        title: 'CRISPR Gene Therapy: Curing Inherited Disease vs Enhancement Ethics',
        tag: 'Genetics',
        tagClass: 'tag-science-work',
        outline: [
          '1. CRISPR-Cas9: Molecular Scissors Explained Simply',
          '2. Clinical Milestones: Reversing Sickle Cell Anemia',
          '3. The Germline Boundary: Ethical Slippery Slopes',
          '4. Global Democratization of Life-Saving Gene Therapies',
        ],
      },
      {
        id: 'sci-3',
        title: 'Decoding the Deep Abyss: Extremophile Adaptations in Hadal Trenches',
        tag: 'Marine Biology',
        tagClass: 'tag-science-work',
        outline: [
          '1. The Hadal Zone Environment: Pressures, Darkness, and Chill',
          '2. Piezophilic Enzymes: How Proteins Survive Extreme Compression',
          '3. Alternative Energy Pathways: Chemosynthesis vs Photosynthesis',
          '4. Medical Breakthroughs Derived from Deep-Sea Enzymes',
        ],
      },
    ]
  }

  if (normalizedTopic.includes('business')) {
    return [
      {
        id: 'biz-1',
        title: 'Building a High-Trust, Remote-First Corporate Culture',
        tag: 'Operations',
        tagClass: 'tag-general',
        outline: [
          '1. Beyond Face Time: Redefining Performance Metrics',
          '2. Asynchronous Workflows: Overcoming Time Zone Gaps',
          '3. Fostering Social Cohesion Without Physical Desks',
          '4. Retaining Talent: Combating Isolation and Burnout',
        ],
      },
      {
        id: 'biz-2',
        title: 'Micro-SaaS Strategy: Finding Niche Wealth as a Solopreneur',
        tag: 'Startup Strategy',
        tagClass: 'tag-general',
        outline: [
          '1. Identifying Laser-Focused Pain Points in API Ecosystems',
          '2. The Bootstrapped Philosophy: Zero VC Funding, High Margins',
          '3. Streamlining Tech Stacks for Maximum Autonomy',
          '4. Scaled Acquisitions: Exiting the Micro-SaaS Business',
        ],
      },
      {
        id: 'biz-3',
        title: 'Green Supply Chains: Circular Economy Integration at Scale',
        tag: 'Sustainability',
        tagClass: 'tag-general',
        outline: [
          '1. The Linear Take-Make-Waste Supply Model Deficiencies',
          '2. Closed-Loop Logistics: Turning Waste Back into Inputs',
          '3. ESG Auditing and Supplier Transparency Frameworks',
          '4. Case Studies: Large-Scale Circular Success Patterns',
        ],
      },
    ]
  }

  if (normalizedTopic.includes('philosophy')) {
    return [
      {
        id: 'phil-1',
        title: 'Stoic Principles for Navigating Hyper-Connected Digital Lives',
        tag: 'Applied Philosophy',
        tagClass: 'tag-literature-phil',
        outline: [
          '1. The Dichotomy of Control: Sifting Feeds from Reality',
          '2. Negative Visualization: Bulletproofing Against Online Outrage',
          '3. Digital Asceticism: Voluntarily Unplugging from Notifications',
          '4. The Cosmopolitan Duty: Healthy Civic Action Without Drama',
        ],
      },
      {
        id: 'phil-2',
        title: 'The Simulation Hypothesis: Metaphysics in the Age of High-Fidelity VR',
        tag: 'Metaphysics',
        tagClass: 'tag-literature-phil',
        outline: [
          '1. Nick Bostrom’s Trilemma: The Probabilistic Argument',
          '2. Quantum Entanglement and Game Rendering Optimizations',
          '3. Existential Dread: How to Live in a Programmed Universe',
          '4. Epistemological Proofs: Can We Ever Pierce the Simulation?',
        ],
      },
      {
        id: 'phil-3',
        title: 'Radical Choice and Sartrean Bad Faith in Algorithmic Feeds',
        tag: 'Existentialism',
        tagClass: 'tag-literature-phil',
        outline: [
          '1. Existence Precedes Essence: We Are What We Click',
          '2. Bad Faith Defined: Blaming Algorithms for Self-Indulgences',
          '3. Reclaiming Agency: Active Curation as Self-Actualization',
          '4. The Terror of Absolute Freedom in Unlimited Digital Choices',
        ],
      },
    ]
  }

  if (
    normalizedTopic.includes('work & career') ||
    normalizedTopic.includes('career') ||
    normalizedTopic.includes('work')
  ) {
    return [
      {
        id: 'career-1',
        title: 'The 4-Day Workweek: Boosting Output and Restoring Focus',
        tag: 'Future of Work',
        tagClass: 'tag-general',
        outline: [
          '1. The Industrial Legacy of the 40-Hour Monday-Friday Paradigm',
          '2. Analysis of the 100-80-100 Rule: 100% Pay, 80% Time, 100% Output',
          '3. Re-engineering Meetings: Dropping Bloat and Restoring Deep Work',
          '4. Legislative Obstacles and Practical Implementation Pitfalls',
        ],
      },
      {
        id: 'career-2',
        title: 'The Art of Career Pivoting: Transferring Skills to New Sectors',
        tag: 'Career Strategy',
        tagClass: 'tag-general',
        outline: [
          '1. Auditing the Personal Stack: Technical vs Transferable Skills',
          '2. Narrative Crafting: Framing Old Work for New Audiences',
          '3. Accelerated Reskilling: The Role of Bootcamps and Certificates',
          '4. Leveraging Weak Ties: Strategic Networking in a New Space',
        ],
      },
      {
        id: 'career-3',
        title: 'Combating Professional Burnout: Personal Boundaries & Systemic Reform',
        tag: 'Work Wellness',
        tagClass: 'tag-general',
        outline: [
          '1. Burnout Anatomy: Exhaustion, Cynicism, and Depersonalization',
          '2. The Myth of Individual Self-Care: Why Bubble Baths Don\'t Fix Toxic Culture',
          '3. Establishing Hard Digital Boundaries: "Right to Disconnect"',
          '4. Structural Overhauls: Sustainable Resource Planning and Audits',
        ],
      },
    ]
  }

  return [
    {
      id: 'custom-1',
      title: `A Deep Analysis of ${topic || 'Your Custom Topic'}: Core Dynamics & Future Outlook`,
      tag: `${skill} Essay`,
      tagClass: 'tag-general',
      outline: [
        `1. Introduction: Scope and Significance of ${topic || 'Subject'}`,
        `2. Core Pillars and Historical Evolution of ${topic || 'Subject'}`,
        `3. Critical Evaluation: Disruptive Factors, Challenges, and Tensions`,
        `4. Conclusion: Projected Forecasts and Recommendations`,
      ],
    },
    {
      id: 'custom-2',
      title: `Practical Guide: Mastering the Essentials of ${topic || 'Your Custom Topic'}`,
      tag: `${skill} Guide`,
      tagClass: 'tag-general',
      outline: [
        `1. Foundational Concept: Getting Started with ${topic || 'Subject'}`,
        `2. Essential Tools, Methodologies, and Practices`,
        `3. Step-by-Step Walkthrough: Implementing Core Principles`,
        `4. Troubleshooting Common Roadblocks and Maximizing Outcomes`,
      ],
    },
    {
      id: 'custom-3',
      title: `Perspectives on ${topic || 'Your Custom Topic'}: Key Arguments & Counterclaims`,
      tag: `${skill} Critique`,
      tagClass: 'tag-general',
      outline: [
        `1. Frame of Reference: The Central Debate of ${topic || 'Subject'}`,
        `2. Proponent Arguments: Evidence, Cases, and Solid Data`,
        `3. Rebuttal & Alternative Views: Weaknesses and Counter-Narratives`,
        `4. Synthesis: A Balanced Path Forward and Final Reflections`,
      ],
    },
  ]
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatOutlineForTipTap(outline: string[]) {
  const nodes = []
  for (const item of outline) {
    const cleanTitle = item.replace(/^\d+\.\s+/, '')
    nodes.push({
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: cleanTitle }],
    })
    nodes.push({
      type: 'paragraph',
      content: [],
    })
  }

  return {
    type: 'doc',
    content: nodes,
  }
}

export default function NewDraftWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<string>('')
  const [isCustomTopic, setIsCustomTopic] = useState<boolean>(false)
  const [customTopicText, setCustomTopicText] = useState<string>('')
  const [writingSkill, setWritingSkill] = useState<string>('Creative Writing')
  const [deadline, setDeadline] = useState<string>('')
  const [recommendations, setRecommendations] = useState<RecommendCard[]>([])
  const [selectedRecommend, setSelectedRecommend] = useState<RecommendCard | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [creating, setCreating] = useState<boolean>(false)

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await api.get<UserInfo>('/api/me')
        setUser(res.data)
      } catch {
        navigate('/login')
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [navigate])

  const handleSelectTopic = (topic: string) => {
    setSelectedTopic(topic)
    setIsCustomTopic(false)
    setSelectedRecommend(null)
  }

  const handleSelectCustomTopic = () => {
    setSelectedTopic('Other')
    setIsCustomTopic(true)
    setSelectedRecommend(null)
  }

  const getActiveTopicName = () => {
    if (isCustomTopic) {
      return customTopicText.trim() || 'Custom Topic'
    }
    return selectedTopic
  }

  const handleNextToStep2 = () => {
    const topicName = getActiveTopicName()
    const recs = getRecommendations(topicName, writingSkill)
    setRecommendations(recs)
    // Do not auto-select a recommendation — allow continuing without choosing one
    setSelectedRecommend(null)
    setStep(2)
  }

  const handleNextToStep3 = () => {
    setStep(3)
  }

  const handleStartDraft = async () => {
    if (creating) return
    setCreating(true)

    const topicName = getActiveTopicName()
    const draftTitle = selectedRecommend
      ? selectedRecommend.title
      : `${topicName} - Draft`

    const initialContent = selectedRecommend
      ? formatOutlineForTipTap(selectedRecommend.outline)
      : { type: 'doc', content: [] }

    try {
      const res = await api.post('/api/drafts', {
        title: draftTitle,
        content: initialContent,
        topic: topicName,
        deadline: deadline || null,
      })
      navigate(`/dashboard/${res.data.id}`)
    } catch (err) {
      console.error('Failed to create custom draft:', err)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="projects-loading">
        <div className="projects-spinner" />
      </div>
    )
  }

  const topicName = getActiveTopicName()

  return (
    <div className="wizard-shell">
      {/* Header Bar */}
      <header className="wizard-topbar">
        <a href="/projects" className="wizard-logo-text">
          FlowDraft
        </a>
        <div className="projects-topbar-actions">
          <label className="projects-search">
            <input type="text" placeholder="Search" disabled />
            <Search size={18} />
          </label>

          <div className="projects-avatar" title={user?.name || 'User'}>
            {user?.image ? (
              <img src={user.image} alt={user.name} />
            ) : (
              <span>{getInitials(user?.name || 'U')}</span>
            )}
          </div>
        </div>
      </header>

      {/* Main Wizard Content */}
      <main className="wizard-main">
        {/* Stepper Progress Indicator */}
        <div className="wizard-stepper">
          <div className={`wizard-step ${step === 1 ? 'is-active' : ''} ${step > 1 ? 'is-completed' : ''}`}>
            <div className="wizard-step-bubble">1</div>
            <span className="wizard-step-label">Your Topic</span>
          </div>

          <div className={`wizard-step-line ${step > 1 ? 'is-active' : ''}`} />

          <div className={`wizard-step ${step === 2 ? 'is-active' : ''} ${step > 2 ? 'is-completed' : ''}`}>
            <div className="wizard-step-bubble">2</div>
            <span className="wizard-step-label">Recommendations</span>
          </div>

          <div className={`wizard-step-line ${step > 2 ? 'is-active' : ''}`} />

          <div className={`wizard-step ${step === 3 ? 'is-active' : ''}`}>
            <div className="wizard-step-bubble">3</div>
            <span className="wizard-step-label">Get Started</span>
          </div>
        </div>

        {/* Wizard Card Context */}
        <div className="wizard-card-container">
          {/* STEP 1: TOPIC SELECTION */}
          {step === 1 && (
            <div style={{ width: '100%', animation: 'fadeIn 0.3s ease' }}>
              <div className="wizard-greeting-section">
                <span className="wizard-welcome">Welcome!</span>
                <h2 className="wizard-tagline">Ready to make another impactful writing?</h2>
              </div>

              {/* Topic Choice Pills */}
              <div className="wizard-pills-grid">
                {TOPICS.map((topic) => (
                  <button
                    key={topic}
                    className={`wizard-pill ${selectedTopic === topic && !isCustomTopic ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => handleSelectTopic(topic)}
                  >
                    {topic}
                  </button>
                ))}
                <button
                  className={`wizard-pill ${isCustomTopic ? 'is-active' : ''}`}
                  type="button"
                  onClick={handleSelectCustomTopic}
                >
                  Other...
                </button>
              </div>

              {/* Custom Topic Input */}
              {isCustomTopic && (
                <div className="wizard-custom-topic-container">
                  <label className="wizard-custom-label" htmlFor="custom-topic-input">
                    Enter your custom topic
                  </label>
                  <input
                    id="custom-topic-input"
                    className="wizard-custom-input"
                    type="text"
                    placeholder="e.g. Environmental Architecture, Artificial Consciousness..."
                    value={customTopicText}
                    onChange={(e) => setCustomTopicText(e.target.value)}
                    autoFocus
                  />
                </div>
              )}

              {/* Writing Skills Dropdown Selection */}
              <div className="wizard-skills-section">
                <label className="wizard-custom-label" htmlFor="skills-select">
                  Choose your writing skill style
                </label>
                <div className="wizard-select-wrapper">
                  <select
                    id="skills-select"
                    className="wizard-select"
                    value={writingSkill}
                    onChange={(e) => setWritingSkill(e.target.value)}
                  >
                    {WRITING_SKILLS.map((skill) => (
                      <option key={skill} value={skill}>
                        {skill}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="wizard-select-arrow" size={18} />
                </div>
              </div>

              {/* Step Navigation Controls */}
              <div className="wizard-nav-controls">
                <button
                  className="wizard-control-btn btn-back"
                  type="button"
                  onClick={() => navigate('/projects')}
                >
                  <ArrowLeft size={16} /> Exit to Projects
                </button>
                <button
                  className="wizard-control-btn btn-next"
                  type="button"
                  disabled={!selectedTopic || (isCustomTopic && !customTopicText.trim())}
                  onClick={handleNextToStep2}
                >
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: RECOMMENDATIONS */}
          {step === 2 && (
            <div style={{ width: '100%', animation: 'fadeIn 0.3s ease' }}>
              <div className="wizard-recommends-header">
                <h3 className="wizard-recommends-title">Recommended Outlines for You</h3>
                <p className="wizard-recommends-desc">
                  Based on topic "{topicName}" & skill "{writingSkill}"
                </p>
              </div>

              {/* Recommendation Cards Grid */}
              <div className="wizard-recommends-grid">
                {recommendations.map((rec) => {
                  const isSelected = selectedRecommend?.id === rec.id
                  return (
                    <article
                      key={rec.id}
                      className={`wizard-recommend-card ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => setSelectedRecommend(rec)}
                    >
                      <span className={`wizard-recommend-tag ${rec.tagClass}`}>
                        {rec.tag}
                      </span>
                      <h4 className="wizard-recommend-card-title">{rec.title}</h4>
                      <ul className="wizard-recommend-outline-preview">
                        {rec.outline.map((oItem, idx) => (
                          <li key={idx}>{oItem}</li>
                        ))}
                      </ul>
                      <button className="wizard-recommend-card-btn" type="button">
                        {isSelected ? '✓ Outline Selected' : 'Choose this outline'}
                      </button>
                    </article>
                  )
                })}
              </div>

              {/* Step Navigation Controls */}
              <div className="wizard-nav-controls">
                <button
                  className="wizard-control-btn btn-back"
                  type="button"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft size={16} /> Back to Topic
                </button>
                <button
                  className="wizard-control-btn btn-next"
                  type="button"
                  onClick={handleNextToStep3}
                >
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: GET STARTED */}
          {step === 3 && (
            <div style={{ width: '100%', animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="wizard-recommends-header">
                <h3 className="wizard-recommends-title">You're Ready to Flow!</h3>
                <p className="wizard-recommends-desc">Review your writing configuration below</p>
              </div>

              {/* Summary Card */}
              <div className="wizard-summary-card">
                <h4 className="wizard-summary-title">Draft Blueprint</h4>

                <div className="wizard-summary-row">
                  <span className="wizard-summary-label">Selected Topic</span>
                  <span className="wizard-summary-value">{topicName}</span>
                </div>

                <div className="wizard-summary-row">
                  <span className="wizard-summary-label">Writing Skill Style</span>
                  <span className="wizard-summary-value">{writingSkill}</span>
                </div>

                <div className="wizard-summary-row">
                  <label className="wizard-summary-label" htmlFor="draft-deadline">
                    Deadline
                  </label>
                  <input
                    id="draft-deadline"
                    className="wizard-deadline-input"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>

                {selectedRecommend && (
                  <div className="wizard-summary-row">
                    <span className="wizard-summary-label">Selected Document Outline</span>
                    <span className="wizard-summary-value">{selectedRecommend.title}</span>
                    <div className="wizard-summary-outline">
                      <ul className="wizard-summary-outline-items">
                        {selectedRecommend.outline.map((oItem, idx) => (
                          <li key={idx}>{oItem}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Step Navigation Controls */}
              <div className="wizard-nav-controls" style={{ width: '100%' }}>
                <button
                  className="wizard-control-btn btn-back"
                  type="button"
                  onClick={() => setStep(2)}
                >
                  <ArrowLeft size={16} /> Back to Outlines
                </button>
                <button
                  className="wizard-control-btn btn-next"
                  type="button"
                  style={{ background: '#1a5632' }}
                  disabled={creating}
                  onClick={handleStartDraft}
                >
                  {creating ? 'Creating...' : 'Start Writing!'} <Rocket size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
