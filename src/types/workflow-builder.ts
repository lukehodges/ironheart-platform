import type { Node, Edge } from 'reactflow';

// Workflow builder UI types
export type WorkflowNodeCategory = 'trigger' | 'action' | 'control' | 'transform';

export interface WorkflowNodePalette {
  category: WorkflowNodeCategory;
  label: string;
  items: WorkflowNodeTemplate[];
}

export interface WorkflowNodeTemplate {
  type: string; // matches backend node types
  label: string;
  icon: string; // lucide icon name
  description: string;
  defaultConfig: Record<string, unknown>;
}

export interface WorkflowCanvasState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  isPanelOpen: boolean;
}

export interface NodeConfigPanelProps {
  nodeId: string;
  nodeType: string;
  config: Record<string, unknown>;
  onUpdate: (config: Record<string, unknown>) => void;
  onClose: () => void;
}

export interface WorkflowExecutionStep {
  stepId: string;
  nodeId: string;
  status: 'pending' | 'running' | 'success' | 'error';
  startedAt?: Date;
  completedAt?: Date;
  output?: unknown;
  error?: string;
}
