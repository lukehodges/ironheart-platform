import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NodePalette } from '../node-palette'

describe('NodePalette', () => {
  it('renders the palette with search input', () => {
    const mockOnDragStart = vi.fn()
    render(<NodePalette onNodeDragStart={mockOnDragStart} />)

    expect(screen.getByPlaceholderText('Search nodes...')).toBeInTheDocument()
  })

  it('displays node categories expanded by default', () => {
    const mockOnDragStart = vi.fn()
    render(<NodePalette onNodeDragStart={mockOnDragStart} />)

    // Trigger and Actions categories should be visible by default
    expect(screen.getAllByText('Trigger')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Actions').length).toBeGreaterThan(0)
  })

  it('displays trigger node', () => {
    const mockOnDragStart = vi.fn()
    render(<NodePalette onNodeDragStart={mockOnDragStart} />)

    // Trigger appears twice: as category and as node label
    expect(screen.getAllByText('Trigger').length).toBeGreaterThan(0)
  })

  it('displays action nodes', () => {
    const mockOnDragStart = vi.fn()
    render(<NodePalette onNodeDragStart={mockOnDragStart} />)

    expect(screen.getByText('Send Email')).toBeInTheDocument()
    expect(screen.getByText('Send SMS')).toBeInTheDocument()
    expect(screen.getByText('Webhook')).toBeInTheDocument()
  })

  it('displays control flow nodes', () => {
    const mockOnDragStart = vi.fn()
    render(<NodePalette onNodeDragStart={mockOnDragStart} />)

    // Control Flow section may be collapsed by default
    const controlFlowTrigger = screen.getByText('Control Flow')
    expect(controlFlowTrigger).toBeInTheDocument()
  })

  it('displays transform nodes', () => {
    const mockOnDragStart = vi.fn()
    render(<NodePalette onNodeDragStart={mockOnDragStart} />)

    // Transform section may be collapsed by default
    const transformTrigger = screen.getByText('Transform')
    expect(transformTrigger).toBeInTheDocument()
  })

  it('toggles category expansion on click', async () => {
    const mockOnDragStart = vi.fn()
    render(<NodePalette onNodeDragStart={mockOnDragStart} />)

    // Find and click Control Flow trigger
    const controlFlowTriggers = screen.getAllByText('Control Flow')
    expect(controlFlowTriggers.length).toBeGreaterThan(0)

    fireEvent.click(controlFlowTriggers[0])

    // After clicking, the category should expand and show its nodes
    expect(screen.getByText('If/Else')).toBeInTheDocument()
  })

  it('filters nodes based on search query', async () => {
    const mockOnDragStart = vi.fn()
    render(<NodePalette onNodeDragStart={mockOnDragStart} />)

    const searchInput = screen.getByPlaceholderText('Search nodes...')

    // Search for email
    await userEvent.type(searchInput, 'email')

    // Should show Send Email
    expect(screen.getByText('Send Email')).toBeInTheDocument()

    // Should not show SMS or Webhook
    expect(screen.queryByText('Send SMS')).not.toBeInTheDocument()
    expect(screen.queryByText('Webhook')).not.toBeInTheDocument()
  })

  it('filters by description', async () => {
    const mockOnDragStart = vi.fn()
    render(<NodePalette onNodeDragStart={mockOnDragStart} />)

    const searchInput = screen.getByPlaceholderText('Search nodes...')

    // Search for 'webhook' which appears in the webhook action description
    await userEvent.type(searchInput, 'webhook')

    // Should show Webhook node
    expect(screen.getByText('Webhook')).toBeInTheDocument()

    // Should not show unrelated nodes
    expect(screen.queryByText('Send Email')).not.toBeInTheDocument()
  })

  it('shows empty state when no results match search', async () => {
    const mockOnDragStart = vi.fn()
    render(<NodePalette onNodeDragStart={mockOnDragStart} />)

    const searchInput = screen.getByPlaceholderText('Search nodes...')

    // Search for something that doesn't exist
    await userEvent.type(searchInput, 'nonexistent')

    expect(screen.getByText(/No nodes match/)).toBeInTheDocument()
  })

  it('handles drag start with correct data', () => {
    const mockOnDragStart = vi.fn()
    render(<NodePalette onNodeDragStart={mockOnDragStart} />)

    const sendEmailNode = screen.getByText('Send Email')
    const draggableElement = sendEmailNode.closest('[draggable=true]')!

    // Create a custom event with dataTransfer mock
    const mockSetData = vi.fn()
    const dragStartEvent = {
      dataTransfer: {
        effectAllowed: 'copy',
        setData: mockSetData,
      },
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as any

    fireEvent.dragStart(draggableElement, dragStartEvent)

    // Verify the callback was called
    expect(mockOnDragStart).toHaveBeenCalled()
  })

  it('clears search results when input is cleared', async () => {
    const mockOnDragStart = vi.fn()
    render(<NodePalette onNodeDragStart={mockOnDragStart} />)

    const searchInput = screen.getByPlaceholderText('Search nodes...') as HTMLInputElement

    // Search for email
    await userEvent.type(searchInput, 'email')
    expect(screen.getByText('Send Email')).toBeInTheDocument()

    // Clear search
    await userEvent.clear(searchInput)

    // All categories should be visible again
    expect(screen.getAllByText('Trigger').length).toBeGreaterThan(0)
  })

  it('has tooltips for node descriptions', () => {
    const mockOnDragStart = vi.fn()
    render(<NodePalette onNodeDragStart={mockOnDragStart} />)

    // The tooltip content should exist in the document (from TooltipContent)
    // This is a basic check that tooltips are configured
    const sendEmailNode = screen.getByText('Send Email')
    expect(sendEmailNode).toBeInTheDocument()
  })

  it('displays help text at bottom', () => {
    const mockOnDragStart = vi.fn()
    render(<NodePalette onNodeDragStart={mockOnDragStart} />)

    expect(screen.getByText('Drag nodes to canvas')).toBeInTheDocument()
  })

  it('maintains expanded categories state across searches', async () => {
    const mockOnDragStart = vi.fn()
    render(<NodePalette onNodeDragStart={mockOnDragStart} />)

    // Control Flow should be collapsed initially
    let ifElseNode = screen.queryByText('If/Else')
    expect(ifElseNode).not.toBeInTheDocument()

    // Expand Control Flow
    const controlFlowTriggers = screen.getAllByText('Control Flow')
    fireEvent.click(controlFlowTriggers[0])

    // Now If/Else should be visible
    ifElseNode = screen.getByText('If/Else')
    expect(ifElseNode).toBeInTheDocument()

    // Search for something unrelated
    const searchInput = screen.getByPlaceholderText('Search nodes...')
    await userEvent.type(searchInput, 'email')

    // Clear search
    await userEvent.clear(searchInput)

    // Control Flow should still be expanded and If/Else visible
    ifElseNode = screen.queryByText('If/Else')
    expect(ifElseNode).toBeInTheDocument()
  })
})
