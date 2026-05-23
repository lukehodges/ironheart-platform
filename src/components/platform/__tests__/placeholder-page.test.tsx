import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlaceholderPage } from '../placeholder-page'

describe('PlaceholderPage', () => {
  it('renders the title', () => {
    render(<PlaceholderPage section="Platform / Today" title="Today" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Today')
  })

  it('renders subtitle when provided', () => {
    render(
      <PlaceholderPage
        section="Platform / Today"
        title="Today"
        subtitle="Your daily command centre."
      />
    )
    expect(screen.getByText('Your daily command centre.')).toBeInTheDocument()
  })

  it('does not render subtitle when omitted', () => {
    render(<PlaceholderPage section="Platform / Today" title="Today" />)
    expect(screen.queryByText(/command centre/i)).not.toBeInTheDocument()
  })

  it('renders the breadcrumb section', () => {
    render(<PlaceholderPage section="Platform / Today" title="Today" />)
    expect(screen.getByText('Platform / Today')).toBeInTheDocument()
  })

  it('shows the Coming soon badge', () => {
    render(<PlaceholderPage section="Platform / Today" title="Today" />)
    expect(screen.getByText('Coming soon')).toBeInTheDocument()
  })
})
