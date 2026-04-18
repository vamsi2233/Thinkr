import type { Edge } from '@xyflow/react';

import type { DecisionNode } from '../types';

const HORIZONTAL_GAP = 320;
const VERTICAL_GAP = 220;

export function layoutDecisionTree(nodes: DecisionNode[]): Map<string, { x: number; y: number }> {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const childrenByParent = new Map<string, DecisionNode[]>();

  nodes.forEach((node) => {
    if (!node.parent_id) {
      return;
    }

    const siblings = childrenByParent.get(node.parent_id) ?? [];
    siblings.push(node);
    childrenByParent.set(node.parent_id, siblings);
  });

  const root = nodes.find((node) => node.parent_id === null);
  const positions = new Map<string, { x: number; y: number }>();

  if (!root) {
    return positions;
  }

  let leafIndex = 0;

  const visit = (nodeId: string, depth: number): number => {
    const children = childrenByParent.get(nodeId) ?? [];
    if (children.length === 0) {
      const x = leafIndex * HORIZONTAL_GAP;
      positions.set(nodeId, { x, y: depth * VERTICAL_GAP });
      leafIndex += 1;
      return x;
    }

    const childXs = children.map((child) => visit(child.id, depth + 1));
    const x = (Math.min(...childXs) + Math.max(...childXs)) / 2;
    positions.set(nodeId, { x, y: depth * VERTICAL_GAP });
    return x;
  };

  visit(root.id, 0);

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
        stroke: '#8fb8ff',
        strokeWidth: 1.8,
        filter: 'drop-shadow(0 0 4px rgba(91, 154, 245, 0.28))',
        opacity: 0.85,
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
