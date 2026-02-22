import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkflowToolbar } from '../workflow-toolbar';

describe('WorkflowToolbar', () => {
  const mockProps = {
    workflowName: 'Test Workflow',
    isActive: false,
    errorCount: 0,
    warningCount: 0,
    isSaving: false,
    onNameChange: vi.fn(),
    onSave: vi.fn(),
    onToggleActive: vi.fn(),
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onFitView: vi.fn(),
  };

  it('renders workflow toolbar with all elements', () => {
    render(<WorkflowToolbar {...mockProps} />);

    expect(screen.getByDisplayValue('Test Workflow')).toBeInTheDocument();
    expect(screen.getByText('Workflow Name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save workflow/i })).toBeInTheDocument();
  });

  it('displays workflow name input', () => {
    render(<WorkflowToolbar {...mockProps} />);
    const input = screen.getByDisplayValue('Test Workflow') as HTMLInputElement;
    expect(input.value).toBe('Test Workflow');
  });

  it('calls onNameChange when workflow name changes', async () => {
    const user = userEvent.setup();
    const onNameChange = vi.fn();
    render(<WorkflowToolbar {...mockProps} onNameChange={onNameChange} />);

    const input = screen.getByDisplayValue('Test Workflow') as HTMLInputElement;
    // Select all and delete, then type new value
    await user.tripleClick(input);
    await user.keyboard('{Delete}');
    await user.type(input, 'New');

    // Verify the callback was called
    expect(onNameChange).toHaveBeenCalled();
  });

  it('displays validation status as valid when no errors', () => {
    render(<WorkflowToolbar {...mockProps} errorCount={0} warningCount={0} />);
    expect(screen.getByText('Valid')).toBeInTheDocument();
  });

  it('displays error badge when errorCount > 0', () => {
    render(<WorkflowToolbar {...mockProps} errorCount={2} warningCount={0} />);
    expect(screen.getByText('2 errors')).toBeInTheDocument();
  });

  it('displays warning badge when warningCount > 0', () => {
    render(<WorkflowToolbar {...mockProps} errorCount={0} warningCount={1} />);
    expect(screen.getByText('1 warning')).toBeInTheDocument();
  });

  it('displays both error and warning badges when both > 0', () => {
    render(<WorkflowToolbar {...mockProps} errorCount={1} warningCount={1} />);
    expect(screen.getByText('1 error')).toBeInTheDocument();
    expect(screen.getByText('1 warning')).toBeInTheDocument();
  });

  it('displays active/inactive status', () => {
    const { rerender } = render(<WorkflowToolbar {...mockProps} isActive={false} />);
    expect(screen.getByText('Inactive')).toBeInTheDocument();

    rerender(<WorkflowToolbar {...mockProps} isActive={true} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('disables save button when isSaving is true', () => {
    render(<WorkflowToolbar {...mockProps} isSaving={true} />);
    const saveButton = screen.getByRole('button', { name: /saving/i });
    expect(saveButton).toBeDisabled();
  });

  it('disables save button when errorCount > 0', () => {
    render(<WorkflowToolbar {...mockProps} errorCount={1} />);
    const saveButton = screen.getByRole('button', { name: /save workflow/i });
    expect(saveButton).toBeDisabled();
  });

  it('calls onSave when save button is clicked', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<WorkflowToolbar {...mockProps} onSave={onSave} />);

    const saveButton = screen.getByRole('button', { name: /save workflow/i });
    await user.click(saveButton);

    expect(onSave).toHaveBeenCalled();
  });

  it('calls onToggleActive when active toggle is clicked', async () => {
    const user = userEvent.setup();
    const onToggleActive = vi.fn();
    render(<WorkflowToolbar {...mockProps} onToggleActive={onToggleActive} />);

    const toggle = screen.getByRole('switch');
    await user.click(toggle);

    expect(onToggleActive).toHaveBeenCalled();
  });

  it('displays info about TRIGGER nodes', () => {
    render(<WorkflowToolbar {...mockProps} />);

    // Check that the hint about trigger nodes is displayed
    expect(screen.getByText(/Add TRIGGER nodes from the palette/i)).toBeInTheDocument();
  });

  it('renders zoom controls', () => {
    render(<WorkflowToolbar {...mockProps} />);
    expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
    expect(screen.getByLabelText('Fit to view')).toBeInTheDocument();
  });

  it('calls onZoomIn when zoom in button is clicked', async () => {
    const user = userEvent.setup();
    const onZoomIn = vi.fn();
    render(<WorkflowToolbar {...mockProps} onZoomIn={onZoomIn} />);

    const zoomInButton = screen.getByLabelText('Zoom in');
    await user.click(zoomInButton);

    expect(onZoomIn).toHaveBeenCalled();
  });

  it('calls onZoomOut when zoom out button is clicked', async () => {
    const user = userEvent.setup();
    const onZoomOut = vi.fn();
    render(<WorkflowToolbar {...mockProps} onZoomOut={onZoomOut} />);

    const zoomOutButton = screen.getByLabelText('Zoom out');
    await user.click(zoomOutButton);

    expect(onZoomOut).toHaveBeenCalled();
  });

  it('calls onFitView when fit view button is clicked', async () => {
    const user = userEvent.setup();
    const onFitView = vi.fn();
    render(<WorkflowToolbar {...mockProps} onFitView={onFitView} />);

    const fitViewButton = screen.getByLabelText('Fit to view');
    await user.click(fitViewButton);

    expect(onFitView).toHaveBeenCalled();
  });

  it('is responsive and wraps on small screens', () => {
    const { container } = render(<WorkflowToolbar {...mockProps} />);
    const wrapper = container.querySelector('.flex-wrap');
    expect(wrapper).toBeInTheDocument();
  });

  it('displays singular error message when errorCount is 1', () => {
    render(<WorkflowToolbar {...mockProps} errorCount={1} />);
    expect(screen.getByText('1 error')).toBeInTheDocument();
  });

  it('displays plural warnings message when warningCount > 1', () => {
    render(<WorkflowToolbar {...mockProps} warningCount={3} />);
    expect(screen.getByText('3 warnings')).toBeInTheDocument();
  });
});
