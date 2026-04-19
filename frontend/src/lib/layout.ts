import type { Edge } from '@xyflow/react';

import type { DecisionNode } from '../types';

const HORIZONTAL_GAP = 340;
const VERTICAL_GAP = 360;

/**
 * Hierarchical layout: leaves packed left-to-right with fixed horizontal gap;
 * each parent is centered over its subtree. Children are ordered by id for stability.
 */
export function layoutDecisionTree(nodes: DecisionNode[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const childrenByParent = new Map<string | null, DecisionNode[]>();

  nodes.forEach((node) => {
    const parentKey = node.parent_id ?? null;
    const siblings = childrenByParent.get(parentKey) ?? [];
    siblings.push(node);
    childrenByParent.set(parentKey, siblings);
  });

  for (const [, siblings] of childrenByParent) {
    siblings.sort((a, b) => a.id.localeCompare(b.id));
  }

  const root = nodes.find((node) => node.parent_id === null);
  if (!root) {
    return positions;
  }

  let leafCursor = 0;

  const layoutSubtree = (nodeId: string, depth: number): { minX: number; maxX: number } => {
    const children = childrenByParent.get(nodeId) ?? [];
    if (children.length === 0) {
      const x = leafCursor * HORIZONTAL_GAP;
      leafCursor += 1;
      positions.set(nodeId, { x, y: depth * VERTICAL_GAP });
      return { minX: x, maxX: x };
    }

    const ranges = children.map((child) => layoutSubtree(child.id, depth + 1));
    const minX = Math.min(...ranges.map((r) => r.minX));
    const maxX = Math.max(...ranges.map((r) => r.maxX));
    const centerX = (minX + maxX) / 2;
    positions.set(nodeId, { x: centerX, y: depth * VERTICAL_GAP });
    return { minX, maxX };
  };

  layoutSubtree(root.id, 0);

  nodes.forEach((node) => {
    if (!positions.has(node.id)) {
      positions.set(node.id, { x: 0, y: node.depth * VERTICAL_GAP });
    }
  });

  return positions;
}

export function buildEdges(nodes: DecisionNode[], hiddenNodeIds: Set<string>): Edge[] {
  return nodes
    .filter((node) => node.parent_id)
    .map((node) => ({
      id: `${node.parent_id}-${node.id}`,
      source: node.parent_id as string,
      target: node.id,
      type: 'smoothstep',
      animated: !hiddenNodeIds.has(node.id),
      hidden: hiddenNodeIds.has(node.id) || hiddenNodeIds.has(node.parent_id as string),
      style: {
        stroke: '#8f9dff',
        strokeWidth: 2,
        filter: 'drop-shadow(0 0 5px rgba(99, 102, 241, 0.32))',
        opacity: 0.9,
      },
    }));
}

export function buildContext(nodeId: string, nodes: DecisionNode[]): string {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const path: string[] = [];
  let current = nodeMap.get(nodeId);

  while (current) {
    path.unshift(current.title);
    current = current.parent_id ? nodeMap.get(current.parent_id) : undefined;
  }

  return path.join(' > ');
}

export function hiddenDescendants(nodes: DecisionNode[], collapsedNodeIds: Set<string>): Set<string> {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const hidden = new Set<string>();

  nodes.forEach((node) => {
    let currentParentId = node.parent_id;
    while (currentParentId) {
      if (collapsedNodeIds.has(currentParentId)) {
        hidden.add(node.id);
        break;
      }
      currentParentId = nodeMap.get(currentParentId)?.parent_id ?? null;
    }
  });

  return hidden;
}
