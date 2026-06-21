
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GraphData, AnalysisResult, NodeObject, NodeAnalysisResult } from './types';
import { parseEdgeList, parseGedcom, exportToGedcom, getGraphStats } from './services/graphService';
import ControlPanel from './components/ControlPanel';
import GraphVisualizer from './components/GraphVisualizer';
import GraphLegend from './components/GraphLegend';
import { UploadIcon, GraphIcon } from './components/ui/Icons';
import { GoogleGenAI } from "@google/genai";
import { translations } from './locales';

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-moon"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
);

const GRAPH_WORKER_CODE = `
const bfs = (startNodeId, adjacencyList) => {
  const distances = new Map([[startNodeId, 0]]);
  const queue = [startNodeId];
  let maxDistance = 0;
  let totalDistance = 0;
  
  let head = 0;
  while(head < queue.length) {
    const currentNodeId = queue[head++];
    const currentDistance = distances.get(currentNodeId);

    if (currentDistance > maxDistance) maxDistance = currentDistance;
    totalDistance += currentDistance;

    const neighbors = adjacencyList.get(currentNodeId) || [];
    for (let i = 0; i < neighbors.length; i++) {
      const neighborId = neighbors[i];
      if (!distances.has(neighborId)) {
        distances.set(neighborId, currentDistance + 1);
        queue.push(neighborId);
      }
    }
  }
  return { distances, maxDistance, totalDistance, reachableCount: distances.size };
};

const findConnectedComponents = (graphData, adjacencyList) => {
    const components = [];
    const visited = new Set();
    for(const node of graphData.nodes) {
        if(!visited.has(node.id)) {
            const component = [];
            const queue = [node.id];
            visited.add(node.id);
            let head = 0;
            while(head < queue.length) {
                const u = queue[head++];
                component.push(u);
                for(const v of adjacencyList.get(u) || []) {
                    if(!visited.has(v)) {
                        visited.add(v);
                        queue.push(v);
                    }
                }
            }
            components.push(component);
        }
    }
    return components;
};

const detectCommunities = (graphData, adjacencyList) => {
    const nodes = graphData.nodes.map(n => n.id);
    if (nodes.length === 0) return [];

    let labels = new Map();
    nodes.forEach(id => labels.set(id, id));

    let changed = true;
    let iterations = 0;
    const maxIterations = 15;

    while (changed && iterations < maxIterations) {
        changed = false;
        iterations++;
        const shuffled = nodes.slice().sort(() => Math.random() - 0.5);

        for (const nodeId of shuffled) {
            const neighbors = adjacencyList.get(nodeId) || [];
            if (neighbors.length === 0) continue;

            const counts = new Map();
            for (const neighborId of neighbors) {
                const label = labels.get(neighborId);
                counts.set(label, (counts.get(label) || 0) + 1);
            }

            let maxCount = 0;
            let bestLabels = [];
            for (const [label, count] of counts.entries()) {
                if (count > maxCount) {
                    maxCount = count;
                    bestLabels = [label];
                } else if (count === maxCount) {
                    bestLabels.push(label);
                }
            }

            const newLabel = bestLabels[Math.floor(Math.random() * bestLabels.length)];
            if (labels.get(nodeId) !== newLabel) {
                labels.set(nodeId, newLabel);
                changed = true;
            }
        }
    }

    const communityGroups = new Map();
    labels.forEach((label, nodeId) => {
        if (!communityGroups.has(label)) communityGroups.set(label, []);
        communityGroups.get(label).push(nodeId);
    });

    const nodeMap = new Map(graphData.nodes.map(n => [n.id, n]));
    return Array.from(communityGroups.values())
        .map(ids => ids.map(id => nodeMap.get(id)))
        .sort((a, b) => b.length - a.length);
};

const calculateTransitivity = (adjacencyList) => {
    let triplets = 0;
    let closedTriplets = 0;
    
    for (const [nodeId, neighbors] of adjacencyList.entries()) {
        const k = neighbors.length;
        if (k < 2) continue;
        
        triplets += (k * (k - 1)) / 2;
        
        for (let i = 0; i < k; i++) {
            for (let j = i + 1; j < k; j++) {
                const n1 = neighbors[i];
                const n2 = neighbors[j];
                const n1Neighbors = adjacencyList.get(n1) || [];
                if (n1Neighbors.includes(n2)) {
                    closedTriplets++;
                }
            }
        }
    }
    return triplets > 0 ? (closedTriplets / triplets) : 0;
};

const calculateBetweennessCentrality = (nodeIds, adjacencyList, isSampled = false) => {
    const centrality = new Map();
    nodeIds.forEach(id => centrality.set(id, 0));

    const sources = isSampled ? nodeIds.sort(() => 0.5 - Math.random()).slice(0, 200) : nodeIds;

    for (const s of sources) {
        const stack = [];
        const predecessors = new Map();
        const sigma = new Map();
        const dist = new Map();
        
        nodeIds.forEach(id => {
            predecessors.set(id, []);
            sigma.set(id, 0);
            dist.set(id, -1);
        });

        sigma.set(s, 1);
        dist.set(s, 0);
        const queue = [s];

        let head = 0;
        while (head < queue.length) {
            const v = queue[head++];
            stack.push(v);
            for (const w of adjacencyList.get(v) || []) {
                if (dist.get(w) < 0) {
                    dist.set(w, dist.get(v) + 1);
                    queue.push(w);
                }
                if (dist.get(w) === dist.get(v) + 1) {
                    sigma.set(w, sigma.get(w) + sigma.get(v));
                    predecessors.get(w).push(v);
                }
            }
        }

        const delta = new Map();
        nodeIds.forEach(id => delta.set(id, 0));

        while (stack.length > 0) {
            const w = stack.pop();
            for (const v of predecessors.get(w)) {
                delta.set(v, delta.get(v) + (sigma.get(v) / sigma.get(w)) * (1 + delta.get(w)));
            }
            if (w !== s) {
                centrality.set(w, centrality.get(w) + delta.get(w));
            }
        }
    }

    return Array.from(centrality.entries())
        .map(([id, val]) => ({ id, value: isSampled ? val : val / 2 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
};

const getAncestorsIterative = (startId, parentMap) => {
    const ancestors = new Set();
    const stack = [startId];
    const visited = new Set();
    while (stack.length > 0) {
        const curr = stack.pop();
        if (visited.has(curr)) continue;
        visited.add(curr);
        if (curr !== startId) ancestors.add(curr);
        const parents = parentMap.get(curr) || [];
        stack.push(...parents);
    }
    return ancestors;
};

const calculatePedigreeCollapse = (graphData) => {
    const nodes = graphData.nodes;
    if (nodes.length > 4000) return { avg: 'N/A (Too Large)', count: 0 };
    
    const parentMap = new Map();
    const childToParents = new Map();
    
    graphData.links.forEach(l => {
        if (l.type === 'parent-child') {
            const s = typeof l.source === 'object' ? l.source.id : l.source;
            const t = typeof l.target === 'object' ? l.target.id : l.target;
            if (!parentMap.has(t)) parentMap.set(t, []);
            parentMap.get(t).push(s);
            
            if (!childToParents.has(t)) childToParents.set(t, []);
            childToParents.get(t).push(s);
        }
    });

    const parentalPairs = new Set();
    childToParents.forEach((parents) => {
        if (parents.length >= 2) {
            const sorted = [...parents].sort();
            for (let i = 0; i < sorted.length; i++) {
                for (let j = i + 1; j < sorted.length; j++) {
                    parentalPairs.add(sorted[i] + "|||" + sorted[j]);
                }
            }
        }
    });

    let collapseEvents = 0;
    const memoAncestors = new Map();

    parentalPairs.forEach(pairStr => {
        const [p1, p2] = pairStr.split("|||");
        
        if (!memoAncestors.has(p1)) memoAncestors.set(p1, getAncestorsIterative(p1, parentMap));
        if (!memoAncestors.has(p2)) memoAncestors.set(p2, getAncestorsIterative(p2, parentMap));
        
        const ancestors1 = memoAncestors.get(p1);
        const ancestors2 = memoAncestors.get(p2);
        
        for (let anc of ancestors1) {
            if (ancestors2.has(anc)) {
                // We count every path that joins back to a common ancestor
                // instead of breaking on the first match.
                collapseEvents++;
            }
        }
    });

    return { 
        avg: parentalPairs.size > 0 ? (collapseEvents / parentalPairs.size).toFixed(4) : "0", 
        count: collapseEvents 
    };
};

const findArticulationPoints = (componentNodeIds, adjacencyList) => {
    const points = new Set();
    const visited = new Set();
    const discoveryTimes = new Map();
    const lowLinkValues = new Map();
    const parent = new Map();
    let time = 0;

    const dfs = (u) => {
        visited.add(u);
        discoveryTimes.set(u, time);
        lowLinkValues.set(u, time);
        time++;
        let children = 0;
        
        const neighbors = adjacencyList.get(u) || [];
        for (const v of neighbors) {
            if (v === parent.get(u)) continue;
            if (visited.has(v)) {
                lowLinkValues.set(u, Math.min(lowLinkValues.get(u), discoveryTimes.get(v)));
            } else {
                children++;
                parent.set(v, u);
                dfs(v);
                lowLinkValues.set(u, Math.min(lowLinkValues.get(u), lowLinkValues.get(v)));
                if (parent.get(u) === null && children > 1) points.add(u);
                if (parent.get(u) !== null && lowLinkValues.get(v) >= discoveryTimes.get(u)) points.add(u);
            }
        }
    };

    for (const nodeId of componentNodeIds) {
        if (!visited.has(nodeId)) {
            parent.set(nodeId, null);
            dfs(nodeId);
        }
    }
    return Array.from(points);
};

const analyzeGraph = (graphData, adjacencyList) => {
    const nodeCount = graphData.nodes.length;
    const edgeCount = graphData.links.length;
    const isLarge = nodeCount >= 5000;
    const isGedcom = graphData.links.some(l => l.type === 'parent-child' || l.type === 'marriage');
    const nodeMap = new Map(graphData.nodes.map(n => [n.id, n]));

    const components = findConnectedComponents(graphData, adjacencyList);
    const largestComponent = components.reduce((l, c) => c.length > l.length ? c : l, []);

    let diameter = 0;
    let radius = 0;
    let centerNodes = [];
    let peripheryNodes = [];
    let avgPath = 0;

    if (largestComponent.length > 1) {
        const sampleSize = isLarge ? 100 : Math.min(largestComponent.length, 500);
        const pivots = largestComponent.slice().sort(() => 0.5 - Math.random()).slice(0, sampleSize);
        
        let totalPathSum = 0;
        let totalPairs = 0;
        let maxFoundDist = 0;
        const eccentricities = new Map();

        for (const startId of pivots) {
            const { maxDistance, totalDistance, reachableCount } = bfs(startId, adjacencyList);
            eccentricities.set(startId, maxDistance);
            maxFoundDist = Math.max(maxFoundDist, maxDistance);
            totalPathSum += totalDistance;
            totalPairs += (reachableCount - 1);
        }

        diameter = maxFoundDist;
        avgPath = totalPairs > 0 ? (totalPathSum / totalPairs) : 0;
        
        const validEccValues = Array.from(eccentricities.values());
        radius = Math.min(...validEccValues);
        
        for (const [id, ecc] of eccentricities.entries()) {
            if (ecc === radius) centerNodes.push(nodeMap.get(id));
            if (ecc === diameter) peripheryNodes.push(nodeMap.get(id));
        }
    }

    const degreeCounts = new Map();
    for (const neighbors of adjacencyList.values()) {
        const degree = neighbors.length;
        degreeCounts.set(degree, (degreeCounts.get(degree) || 0) + 1);
    }
    const degreeDistribution = Array.from(degreeCounts.entries())
        .map(([degree, count]) => ({ degree, count }))
        .sort((a, b) => a.degree - b.degree);

    const articulationPoints = findArticulationPoints(largestComponent, adjacencyList)
        .slice(0, 10)
        .map(id => nodeMap.get(id));

    const result = {
        nodeCount,
        edgeCount,
        averageDegree: (2 * edgeCount) / nodeCount || 0,
        transitivity: calculateTransitivity(adjacencyList),
        componentCount: components.length,
        isConnected: components.length === 1,
        graphDensity: ( (2 * edgeCount) / (nodeCount * (nodeCount - 1)) || 0 ).toFixed(10),
        largestComponentSize: largestComponent.length,
        isLargeGraph: isLarge,
        diameter: isLarge ? diameter + " (משוער)" : diameter,
        radius: isLarge ? radius + " (משוער)" : radius,
        centerNodes: centerNodes.slice(0, 5),
        peripheryNodes: peripheryNodes.slice(0, 5),
        averageShortestPath: isLarge ? avgPath.toFixed(2) + " (משוער)" : avgPath.toFixed(2),
        articulationPoints,
        centralityByConnections: graphData.nodes.map(n => ({
            node: n, value: (adjacencyList.get(n.id) || []).length
        })).sort((a,b) => b.value - a.value).slice(0, 5),
        degreeDistribution
    };

    if (largestComponent.length > 1) {
        const betweenness = calculateBetweennessCentrality(largestComponent, adjacencyList, largestComponent.length > 1500);
        result.betweennessCentrality = betweenness.map(item => ({
            node: nodeMap.get(item.id),
            value: item.value.toFixed(2)
        }));
    }

    if (isGedcom) {
        const childMap = new Map();
        const parentMap = new Map();
        const surnames = new Set();

        graphData.nodes.forEach(n => {
            if (n.type === 'person' && n.name) {
                const parts = n.name.trim().split(/\s+/);
                if (parts.length > 1) surnames.add(parts[parts.length - 1]);
            }
        });

        graphData.links.forEach(l => {
            if (l.type === 'parent-child') {
                const s = typeof l.source === 'object' ? l.source.id : l.source;
                const t = typeof l.target === 'object' ? l.target.id : l.target;
                if (!childMap.has(s)) childMap.set(s, []);
                childMap.get(s).push(t);
                if (!parentMap.has(t)) parentMap.set(t, []);
                parentMap.get(t).push(s);
            }
        });

        const countDescendants = (startId) => {
            const descendants = new Set();
            const stack = [startId];
            const visited = new Set();
            while (stack.length > 0) {
                const curr = stack.pop();
                if (visited.has(curr)) continue;
                visited.add(curr);
                if (curr !== startId) descendants.add(curr);
                stack.push(...(childMap.get(curr) || []));
            }
            return descendants.size;
        };

        const countAncestors = (startId) => {
            const ancestors = new Set();
            const stack = [startId];
            const visited = new Set();
            while (stack.length > 0) {
                const curr = stack.pop();
                if (visited.has(curr)) continue;
                visited.add(curr);
                if (curr !== startId) ancestors.add(curr);
                stack.push(...(parentMap.get(curr) || []));
            }
            return ancestors.size;
        };

        result.centralityByDescendants = graphData.nodes
            .map(n => ({ node: n, value: countDescendants(n.id) }))
            .sort((a,b) => b.value - a.value).slice(0, 5);

        result.centralityByAncestors = graphData.nodes
            .map(n => ({ node: n, value: countAncestors(n.id) }))
            .sort((a,b) => b.value - a.value).slice(0, 5);

        const pci = calculatePedigreeCollapse(graphData);
        result.averagePedigreeCollapse = pci.avg;
        result.totalPedigreeCollapseOccurrences = pci.count;
        result.surnameDiversity = surnames.size > 0 ? (surnames.size / (graphData.nodes.filter(n=>n.type==='person').length || 1)).toFixed(3) : "N/A";

        if (graphData.nodes.length > 0) {
            const genLevels = new Map();
            const getGenLevel = (id) => {
                if (genLevels.has(id)) return genLevels.get(id);
                const parents = parentMap.get(id) || [];
                if (parents.length === 0) {
                    genLevels.set(id, 0);
                    return 0;
                }
                // Avoid infinite recursion in case of data errors (cycles)
                genLevels.set(id, 0); 
                const maxParentLevel = Math.max(...parents.map(p => getGenLevel(p)));
                const level = 1 + maxParentLevel;
                genLevels.set(id, level);
                return level;
            };

            let maxGenDepth = 0;
            const leafDepths = [];
            const genCounts = new Map();

            graphData.nodes.forEach(n => {
                const level = getGenLevel(n.id);
                if (level > maxGenDepth) maxGenDepth = level;
                genCounts.set(level, (genCounts.get(level) || 0) + 1);
                
                const children = childMap.get(n.id) || [];
                if (children.length === 0) leafDepths.push(level);
            });

            const totalNodes = Array.from(genCounts.values()).reduce((a,b)=>a+b, 0);
            result.averageGenerationWidth = genCounts.size > 0 ? (totalNodes / genCounts.size).toFixed(2) : "0";
            result.averageLeafDepth = leafDepths.length > 0 ? (leafDepths.reduce((a,b)=>a+b, 0) / leafDepths.length).toFixed(2) : "0";
            result.maxGenerationalDepth = maxGenDepth + 1; // +1 to convert steps to generation count

            const families = Array.from(childMap.values());
            result.averageBranchingFactor = families.length > 0 ? (families.reduce((acc, curr) => acc + curr.length, 0) / families.length).toFixed(2) : "0";
        }
    }
    return result;
};

self.onmessage = (event) => {
  try {
    const { type, graphData, nodeId } = event.data;
    const adjacencyList = new Map();
    
    if (graphData.nodes) {
        graphData.nodes.forEach(n => adjacencyList.set(n.id, []));
    }

    if (graphData.links) {
        graphData.links.forEach(l => {
            const s = typeof l.source === 'object' && l.source !== null ? l.source.id : l.source;
            const t = typeof l.target === 'object' && l.target !== null ? l.target.id : l.target;
            if (!adjacencyList.has(s)) adjacencyList.set(s, []);
            if (!adjacencyList.has(t)) adjacencyList.set(t, []);
            adjacencyList.get(s).push(t);
            adjacencyList.get(t).push(s);
        });
    }

    if (type === 'analyze') {
        const result = analyzeGraph(graphData, adjacencyList);
        self.postMessage({ type: 'analysis_success', result });
    } else if (type === 'detectCommunities') {
        const communities = detectCommunities(graphData, adjacencyList);
        self.postMessage({ type: 'communities_success', communities });
    } else if (type === 'analyzeNode' && nodeId) {
        const neighbors = adjacencyList.get(nodeId) || [];
        const { maxDistance, distances, totalDistance } = bfs(nodeId, adjacencyList);
        const avgDist = distances.size > 1 ? (totalDistance / (distances.size - 1)) : 0;
        self.postMessage({ 
            type: 'node_analysis_success', 
            result: { 
                id: nodeId, degree: neighbors.length,
                eccentricity: maxDistance, reachableNodes: distances.size,
                averageDistance: avgDist, clusteringCoefficient: 0 // Local CC not calculated in basic BFS
            } 
        });
    }
  } catch (error) {
    self.postMessage({ type: 'error', error: error.message || 'An unknown worker error occurred.' });
  }
};
`;

const App: React.FC = () => {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isDetectingCommunities, setIsDetectingCommunities] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isGedcom, setIsGedcom] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [selectedNode, setSelectedNode] = useState<NodeObject | null>(null);
  const [selectedNodeStats, setSelectedNodeStats] = useState<NodeAnalysisResult | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NodeObject | null>(null);
  const fgRef = useRef<any>(null);
  const workerRef = useRef<Worker | null>(null);
  const [rawFileContent, setRawFileContent] = useState<string | null>(null);
  const [isAdvancedMode, setIsAdvancedMode] = useState<boolean>(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);

  const [isLightMode, setIsLightMode] = useState<boolean>(false);
  const [lang, setLang] = useState<'he' | 'en'>('he');
  const t = translations[lang];

  // Tree Arranger Selection and Editing States
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [pendingDeletions, setPendingDeletions] = useState<Set<string>>(new Set());
  const [pendingAnonymizations, setPendingAnonymizations] = useState<Set<string>>(new Set());

  // Staging action history for precise click multiple-level Undo (שחזר)
  const [lastActionsStaged, setLastActionsStaged] = useState<{ ids: string[], type: 'delete' | 'anonymize' }[]>([]);

  // BFS search helper to recursively fetch all descendants (children, grandchildren, etc.) for branches
  const getDescendantsOfNode = useCallback((startId: string) => {
    const descendants = new Set<string>();
    if (!graphData) return descendants;

    // Parent -> list of children Map
    const childMap = new Map<string, string[]>();
    graphData.links.forEach(l => {
      if (l.type === 'parent-child') {
        const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
        if (!childMap.has(s)) childMap.set(s, []);
        childMap.get(s)!.push(t);
      }
    });

    const stack = [startId];
    const visited = new Set<string>();
    while (stack.length > 0) {
      const curr = stack.pop()!;
      if (visited.has(curr)) continue;
      visited.add(curr);
      if (curr !== startId) {
        descendants.add(curr);
      }
      const children = childMap.get(curr) || [];
      stack.push(...children);
    }
    return descendants;
  }, [graphData]);

  // Recursively fetch all ancestors (parents, grandparents, great-grandparents, etc.)
  const getAncestorsOfNode = useCallback((startId: string) => {
    const ancestors = new Set<string>();
    if (!graphData) return ancestors;

    // Child -> list of parents Map
    const parentMap = new Map<string, string[]>();
    graphData.links.forEach(l => {
      if (l.type === 'parent-child') {
        const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
        if (!parentMap.has(t)) parentMap.set(t, []);
        parentMap.get(t)!.push(s);
      }
    });

    const stack = [startId];
    const visited = new Set<string>();
    while (stack.length > 0) {
      const curr = stack.pop()!;
      if (visited.has(curr)) continue;
      visited.add(curr);
      if (curr !== startId) {
        ancestors.add(curr);
      }
      const parents = parentMap.get(curr) || [];
      stack.push(...parents);
    }
    return ancestors;
  }, [graphData]);

  // Handler to stage simple nodes to be deleted
  const handleStageDeletion = useCallback((ids: Set<string> | string) => {
    const targetSet = typeof ids === 'string' ? new Set([ids]) : ids;
    const arrayIds = Array.from(targetSet);

    setPendingDeletions(prev => {
      const next = new Set(prev);
      targetSet.forEach(id => {
        next.add(id);
        // Remove from pending anonymizations
        setPendingAnonymizations(prevAnon => {
          const nextAnon = new Set(prevAnon);
          nextAnon.delete(id);
          return nextAnon;
        });
      });
      return next;
    });

    setLastActionsStaged(prev => [...prev, { ids: arrayIds, type: 'delete' }]);
    setStatusMessage(`הוסרו זמנית מהתצוגה ${targetSet.size} דמויות. ניתן לבצע שחזר / Undo.`);
  }, []);

  // Handler to stage simple nodes to be anonymized
  const handleStageAnonymization = useCallback((ids: Set<string> | string) => {
    const targetSet = typeof ids === 'string' ? new Set([ids]) : ids;
    const arrayIds = Array.from(targetSet);

    setPendingAnonymizations(prev => {
      const next = new Set(prev);
      targetSet.forEach(id => {
        next.add(id);
        // Remove from pending deletions
        setPendingDeletions(prevDelete => {
          const nextDel = new Set(prevDelete);
          nextDel.delete(id);
          return nextDel;
        });
      });
      return next;
    });

    setLastActionsStaged(prev => [...prev, { ids: arrayIds, type: 'anonymize' }]);
    setStatusMessage(`סומנו ${targetSet.size} דמויות לאנונימיזציה.`);
  }, []);

  // Multiple levels undo function (שחזר / Undo בשלב מהיר)
  const handleUndoLastStaged = useCallback(() => {
    if (lastActionsStaged.length === 0) {
      setStatusMessage('אין פעולות סימון קודמות לביטול.');
      return;
    }

    const last = lastActionsStaged[lastActionsStaged.length - 1];
    
    if (last.type === 'delete') {
      setPendingDeletions(prev => {
        const next = new Set(prev);
        last.ids.forEach(id => next.delete(id));
        return next;
      });
      setStatusMessage(`בוטלה מחיקה זמנית ל-${last.ids.length} דמויות והן הוחזרו לתצוגה.`);
    } else {
      setPendingAnonymizations(prev => {
        const next = new Set(prev);
        last.ids.forEach(id => next.delete(id));
        return next;
      });
      setStatusMessage(`בוטלה אנונימיזציה ל-${last.ids.length} דמויות.`);
    }

    setLastActionsStaged(prev => prev.slice(0, -1));
  }, [lastActionsStaged]);

  // Unstage specific nodes from either list
  const handleUnstageNodes = useCallback((ids: Set<string> | string) => {
    const targetSet = typeof ids === 'string' ? new Set([ids]) : ids;
    setPendingDeletions(prev => {
      const next = new Set(prev);
      targetSet.forEach(id => next.delete(id));
      return next;
    });
    setPendingAnonymizations(prev => {
      const next = new Set(prev);
      targetSet.forEach(id => next.delete(id));
      return next;
    });
    setStatusMessage(`בוטל הסימון.`);
  }, []);

  // Clear all staged changes
  const handleClearStaged = useCallback(() => {
    setPendingDeletions(new Set());
    setPendingAnonymizations(new Set());
    setLastActionsStaged([]);
    setStatusMessage('כל הסימונים הממתינים נוקו.');
  }, []);

  // Export the active graph structure to GEDCOM format and trigger auto-download
  const handleExportGedcom = useCallback(() => {
    if (!graphData) {
      setError('אין מידע משפחתי זמין בעץ ליצירת קובץ ייצוא.');
      return;
    }
    try {
      const gedcomString = exportToGedcom(graphData, pendingDeletions, pendingAnonymizations);
      // Prepend UTF-8 BOM (\uFEFF) to ensure external genealogic software correctly parses Hebrew characters
      const blob = new Blob(['\uFEFF' + gedcomString], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Use original file name if we can extract it or general name
      link.download = 'exported_family_tree.ged';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      setError(`שגיאה בייצוא קובץ ה-GEDCOM: ${err.message || err}`);
    }
  }, [graphData, pendingDeletions, pendingAnonymizations]);

  // Handler to rename individual character names smoothly
  const handleRenameNode = useCallback((nodeId: string, newName: string) => {
    if (!graphData) return;
    const nextNodes = graphData.nodes.map(n => {
      if (n.id === nodeId) {
        return { ...n, name: newName };
      }
      return n;
    });

    const nextGraphData = { ...graphData, nodes: nextNodes };
    setGraphData(nextGraphData);
    setSelectedNode(prev => prev && prev.id === nodeId ? { ...prev, name: newName } : prev);
    setStatusMessage(`שונה השם ל-${newName}.`);

    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'analyze', graphData: nextGraphData });
    }
  }, [graphData]);

  // Handler to toggle whether a specific character is deceased or living
  const handleToggleDeceased = useCallback((nodeId: string) => {
    if (!graphData) return;
    let newStatus = false;
    const nextNodes = graphData.nodes.map(n => {
      if (n.id === nodeId) {
        newStatus = !n.isDeceased;
        return { ...n, isDeceased: newStatus };
      }
      return n;
    });

    const nextGraphData = { ...graphData, nodes: nextNodes };
    setGraphData(nextGraphData);
    setSelectedNode(prev => prev && prev.id === nodeId ? { ...prev, isDeceased: newStatus } : prev);
    setStatusMessage(`עודכן סטטוס חיים עבור הדמות.`);

    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'analyze', graphData: nextGraphData });
    }
  }, [graphData]);

  // Stage recursively for deletion based on descendants or parents direction
  const handleStageDeleteBranch = useCallback((nodeId: string, direction: 'descendants' | 'ancestors') => {
    const targets = direction === 'descendants' ? getDescendantsOfNode(nodeId) : getAncestorsOfNode(nodeId);
    const setOfIds = direction === 'ancestors' ? new Set<string>(targets) : new Set<string>([nodeId, ...Array.from(targets)]);
    handleStageDeletion(setOfIds);
  }, [getDescendantsOfNode, getAncestorsOfNode, handleStageDeletion]);

  // Stage recursively for anonymization based on descendants or parents direction
  const handleStageAnonymizeBranch = useCallback((nodeId: string, direction: 'descendants' | 'ancestors') => {
    const targets = direction === 'descendants' ? getDescendantsOfNode(nodeId) : getAncestorsOfNode(nodeId);
    const setOfIds = direction === 'ancestors' ? new Set<string>(targets) : new Set<string>([nodeId, ...Array.from(targets)]);
    handleStageAnonymization(setOfIds);
  }, [getDescendantsOfNode, getAncestorsOfNode, handleStageAnonymization]);

  // Execute / Commit all pending changes!
  const handleApplyPendingChanges = useCallback(() => {
    if (!graphData) return;
    if (pendingDeletions.size === 0 && pendingAnonymizations.size === 0) {
      setStatusMessage('אין שינויים ממתינים לביצוע בשלב זה.');
      return;
    }

    // 1. Delete nodes
    const nextNodes = graphData.nodes
      .filter(n => !pendingDeletions.has(n.id))
      // 2. Anonymize remaining nodes
      .map(n => {
        if (pendingAnonymizations.has(n.id)) {
          const anonymizedNode: NodeObject = {
            id: n.id,
            name: n.type === 'person' || !n.type ? 'אנונימי/ת' : n.name,
            type: n.type,
            gender: n.gender,
            isDeceased: n.isDeceased || false,
            isAnonymized: true,
          };
          
          // Preserve d3 force positions/velocities to retain visual layout topology
          ['x', 'y', 'vx', 'vy', 'fx', 'fy'].forEach(key => {
            if (n[key] !== undefined) {
              anonymizedNode[key] = n[key];
            }
          });
          
          return anonymizedNode;
        }
        return n;
      });

    // 3. Keep family links (marriage & parent-child) active for anonymized nodes; remove all event_links
    const nextLinks = graphData.links
      .filter(l => {
        const sId = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const tId = typeof l.target === 'object' ? (l.target as any).id : l.target;
        
        // Remove links connected to deleted nodes
        if (pendingDeletions.has(sId) || pendingDeletions.has(tId)) {
          return false;
        }

        // Keep family connections (marriage & parent-child), filter out non-essential info (event_link)
        const isSAnon = pendingAnonymizations.has(sId);
        const isTAnon = pendingAnonymizations.has(tId);
        if (isSAnon || isTAnon) {
          return l.type === 'marriage' || l.type === 'parent-child';
        }

        return true;
      })
      .map(l => {
        const sId = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const tId = typeof l.target === 'object' ? (l.target as any).id : l.target;
        return { ...l, source: sId, target: tId };
      });

    const nextGraphData = { nodes: nextNodes, links: nextLinks };
    setGraphData(nextGraphData);
    
    // Clear lists
    setPendingDeletions(new Set());
    setPendingAnonymizations(new Set());
    setSelectedNodeIds(new Set());
    setSelectedNode(null);
    setSelectedNodeStats(null);

    setStatusMessage('כל השינויים הממתינים הוחלו על מבנה העץ ובוצעו בהצלחה!');

    // Re-trigger analysis
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'analyze', graphData: nextGraphData });
    }
  }, [graphData, pendingDeletions, pendingAnonymizations]);

  // Add a new parent, spouse, or child to the family tree with proper links
  const handleAddRelative = useCallback((
    relationshipType: 'parent' | 'spouse' | 'child',
    targetNodeId: string,
    name: string,
    gender: 'M' | 'F'
  ) => {
    if (!graphData) return;

    const newId = `INDI_MANUAL_${Date.now()}`;
    const newPersonNode: NodeObject = {
      id: newId,
      name: name || 'ללא שם',
      type: 'person',
      gender: gender
    };

    const newLinks: LinkObject[] = [];

    if (relationshipType === 'parent') {
      newLinks.push({
        source: newId,
        target: targetNodeId,
        type: 'parent-child'
      });
    } else if (relationshipType === 'spouse') {
      newLinks.push({
        source: targetNodeId,
        target: newId,
        type: 'marriage'
      });
    } else if (relationshipType === 'child') {
      newLinks.push({
        source: targetNodeId,
        target: newId,
        type: 'parent-child'
      });

      // Find spouses of targetNodeId to link as dual parent
      const spouses = graphData.links
        .filter(l => l.type === 'marriage')
        .map(l => {
          const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
          const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
          if (s === targetNodeId) return t;
          if (t === targetNodeId) return s;
          return null;
        })
        .filter(Boolean) as string[];

      if (spouses.length > 0) {
        newLinks.push({
          source: spouses[0],
          target: newId,
          type: 'parent-child'
        });
      }
    }

    const updatedNodes = [...graphData.nodes, newPersonNode];
    const updatedLinks = [...graphData.links, ...newLinks];
    
    const nextGraphData = { nodes: updatedNodes, links: updatedLinks };
    setGraphData(nextGraphData);
    setStatusMessage(`תווסף בהצלחה: ${name}`);
    
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'analyze', graphData: nextGraphData });
    }

    setSelectedNodeIds(new Set());
    setSelectedNode(null);
  }, [graphData]);

  useEffect(() => {
    const blob = new Blob([GRAPH_WORKER_CODE], { type: 'application/javascript' });
    const objectUrl = URL.createObjectURL(blob);
    const worker = new Worker(objectUrl);
    workerRef.current = worker;
    worker.addEventListener('message', (event) => {
      const { type, result, communities, error: workerError } = event.data;
      if (type === 'analysis_success') {
        setIsAnalyzing(false);
        setAnalysisResult(result);
        setStatusMessage('חישוב מדדי מבנה וקשרים בעץ הושלם בהצלחה!');
      } else if (type === 'communities_success') {
        setIsDetectingCommunities(false);
        setAnalysisResult(prev => prev ? ({ ...prev, communities }) : null);
        setStatusMessage(`זוהו ${communities.length} קהילות משפחתיות.`);
      } else if (type === 'node_analysis_success') {
        setSelectedNodeStats(result);
      } else if (type === 'error') {
        setIsAnalyzing(false);
        setIsDetectingCommunities(false);
        setError(workerError);
      }
    });

    // Auto-load Royal family tree gedcom sample on startup!
    import('./services/sampleData').then(({ royalGedcom }) => {
      setRawFileContent(royalGedcom);
      setIsGedcom(true);
      const data = parseGedcom(royalGedcom, false);
      setGraphData(data);
      setStatusMessage('ברוכים הבאים! עץ השושלת המלכותית נטען אוטומטית כברירת מחדל.');
      
      setIsAnalyzing(true);
      worker.postMessage({ type: 'analyze', graphData: data });
    });

    return () => { worker.terminate(); URL.revokeObjectURL(objectUrl); };
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    setError(null); setAnalysisResult(null); setSelectedNode(null); setGraphData(null); setAiSummary(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        setRawFileContent(content);
        const isGedcomFile = file.name.toLowerCase().endsWith('.ged');
        setIsGedcom(isGedcomFile);
        const data = isGedcomFile ? parseGedcom(content, false) : parseEdgeList(content);
        setGraphData(data);
        const stats = getGraphStats(data);
        setStatusMessage(`נטען בהצלחה: ${file.name} (${stats.peopleCount} אנשים, ${stats.familyCount} משפחות, ${stats.componentsCount} רכיבי קשירות)`);
      } catch (err) { setError('שגיאה בניתוח הקובץ.'); }
    };
    reader.readAsText(file);
  }, []);

  const handleSampleSelect = useCallback((content: string, type: 'ged' | 'txt', name: string) => {
    setError(null); setAnalysisResult(null); setSelectedNode(null); setAiSummary(null);
    setRawFileContent(content);
    const isGedcomFile = type === 'ged';
    setIsGedcom(isGedcomFile);
    const data = isGedcomFile ? parseGedcom(content, false) : parseEdgeList(content);
    setGraphData(data);
    const stats = getGraphStats(data);
    setStatusMessage(`נטען בהצלחה: ${name} (${stats.peopleCount} אנשים, ${stats.familyCount} משפחות, ${stats.componentsCount} רכיבי קשירות)`);
  }, []);

  const handleAnalyze = useCallback(() => {
    if (!graphData || !workerRef.current) return;
    setAnalysisResult(null); setIsAnalyzing(true);
    workerRef.current.postMessage({ type: 'analyze', graphData });
  }, [graphData]);

  const handleDetectCommunities = useCallback(() => {
    if (!graphData || !workerRef.current) return;
    setIsDetectingCommunities(true);
    workerRef.current.postMessage({ type: 'detectCommunities', graphData });
  }, [graphData]);

  const handleNodeClick = useCallback((node: NodeObject) => {
    setSelectedNode(node); setSelectedNodeStats(null);
    if (graphData && workerRef.current) {
        workerRef.current.postMessage({ type: 'analyzeNode', graphData, nodeId: node.id });
    }
  }, [graphData]);

  const handleToggleAdvancedMode = useCallback(() => {
    if (!rawFileContent || !isGedcom) return;
    const newMode = !isAdvancedMode;
    setIsAdvancedMode(newMode);
    setAnalysisResult(null); setAiSummary(null);
    try { const data = parseGedcom(rawFileContent, newMode); setGraphData(data); } catch (err: any) { setError(`שגיאה בשינוי מצב התצוגה המתקדם: ${err.message || err}`); }
  }, [rawFileContent, isGedcom, isAdvancedMode]);

  const handleGenerateAiInsights = useCallback(async () => {
    if (!analysisResult) return;
    if (!(await (window as any).aistudio.hasSelectedApiKey())) {
      await (window as any).aistudio.openSelectKey();
    }
    setIsGeneratingAi(true); setAiSummary(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `נתח את הנתונים הבאים על עץ משפחה/רשת חברתית: ${JSON.stringify(analysisResult)}`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { 
          systemInstruction: "אתה מומחה גנאלוגיה ורשתות. נתח את הנתונים וספק הסבר מה ניתן ללמוד מהם על המבנה המשפחתי, צמתים מרכזיים ודפוסים חריגים. ענה בעברית.",
          thinkingConfig: { thinkingBudget: 32768 } 
        }
      });
      setAiSummary(response.text || 'לא נוצרו תובנות.');
    } catch (err: any) { 
        if (err?.message?.includes("Requested entity was not found.")) {
            await (window as any).aistudio.openSelectKey();
            setError('מפתח ה-API לא תקף. אנא בחר מפתח חדש.');
        } else {
            setError('הפקת תובנות AI נכשלה.'); 
        }
    } finally { setIsGeneratingAi(false); }
  }, [analysisResult]);

  const parsedStats = useMemo(() => {
    if (!graphData) return null;
    return getGraphStats(graphData);
  }, [graphData]);

  // Keep staged deletions visible on the screen so they can be rendered with an 'X' shape.
  // We keep family lines (marriage, parent-child) active for any nodes that are staged for anonymization, 
  // but hide their non-essential event links to preserve the exact topology.
  const visibleGraphData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] };
    
    // When nodes are only staged for anonymization, we keep their original name on the screen
    // so the user knows who is being edited. They will still have a different visual style (e.g. hollow circle).
    const nextNodes = graphData.nodes.map(n => {
      if (pendingAnonymizations.has(n.id)) {
        return {
          ...n,
          isDeceased: false // "אפשר להשאיר את זה שהדמות בחיים"
        };
      }
      return n;
    });

    const nextLinks = graphData.links
      .filter(l => {
        const sId = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const tId = typeof l.target === 'object' ? (l.target as any).id : l.target;
        
        // Remove links connected to deleted nodes to preview their absence
        if (pendingDeletions.has(sId) || pendingDeletions.has(tId)) {
          return false;
        }

        const isSAnon = pendingAnonymizations.has(sId);
        const isTAnon = pendingAnonymizations.has(tId);
        if (isSAnon || isTAnon) {
          return l.type === 'marriage' || l.type === 'parent-child';
        }

        return true;
      })
      .map(l => {
        const sId = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const tId = typeof l.target === 'object' ? (l.target as any).id : l.target;
        return { ...l, source: sId, target: tId };
      });

    return { nodes: nextNodes, links: nextLinks };
  }, [graphData, pendingDeletions, pendingAnonymizations]);

  return (
    <div className={`h-screen flex flex-col font-sans overflow-hidden transition-colors duration-200 ${isLightMode ? 'bg-gray-50 text-gray-800 light-mode' : 'bg-gray-900 text-gray-200'}`} dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <style>{`
        /* Overrides for Light Mode */
        .light-mode {
          background-color: #f3f4f6 !important;
          color: #1f2937 !important;
        }

        /* Catch any gray backgrounds and convert them to clean white/light surfaces */
        .light-mode .bg-gray-950,
        .light-mode [class*="bg-gray-950"],
        .light-mode .bg-gray-900,
        .light-mode [class*="bg-gray-900"],
        .light-mode .bg-gray-850,
        .light-mode [class*="bg-gray-850"],
        .light-mode .bg-gray-800,
        .light-mode [class*="bg-gray-800"] {
          background-color: #ffffff !important;
          color: #111827 !important;
        }

        .light-mode .bg-gray-50,
        .light-mode [class*="bg-gray-50"] {
          background-color: #f9fafb !important;
        }

        .light-mode .bg-gray-700,
        .light-mode [class*="bg-gray-700"] {
          background-color: #d1d5db !important;
        }

        /* Headers and sub-boxes default to an elegant, softened contrast background */
        .light-mode header,
        .light-mode [class*="bg-gray-950/60"],
        .light-mode [class*="bg-gray-950/40"],
        .light-mode [class*="bg-gray-950/50"] {
          background-color: rgba(243, 244, 246, 0.9) !important;
          border-color: #d1d5db !important;
        }

        /* Borders override */
        .light-mode .border-gray-800,
        .light-mode [class*="border-gray-800"],
        .light-mode .border-gray-750,
        .light-mode [class*="border-gray-750"],
        .light-mode .border-gray-700,
        .light-mode [class*="border-gray-700"],
        .light-mode .border-gray-850,
        .light-mode [class*="border-gray-850"] {
          border-color: #e5e7eb !important;
        }

        .light-mode .divide-gray-800,
        .light-mode [class*="divide-gray-800"],
        .light-mode .divide-gray-900,
        .light-mode [class*="divide-gray-900"] {
          border-color: #e5e7eb !important;
        }

        /* Specific alert / staging colors */
        .light-mode .bg-cyan-950/20,
        .light-mode [class*="bg-cyan-950/20"],
        .light-mode [class*="bg-cyan-950/45"],
        .light-mode .bg-cyan-950/45 {
          background-color: rgba(207, 250, 254, 0.45) !important;
          border-color: rgba(6, 182, 212, 0.3) !important;
        }

        .light-mode .bg-red-950/10,
        .light-mode [class*="bg-red-950/10"],
        .light-mode [class*="bg-red-950/20"],
        .light-mode [class*="bg-red-950/40"],
        .light-mode [class*="bg-red-950"] {
          background-color: rgba(254, 226, 226, 0.5) !important;
          border-color: rgba(239, 68, 68, 0.25) !important;
        }

        .light-mode .bg-amber-950/10,
        .light-mode [class*="bg-amber-950/10"],
        .light-mode [class*="bg-amber-950/20"],
        .light-mode [class*="bg-amber-950/40"],
        .light-mode [class*="bg-amber-950"] {
          background-color: rgba(254, 243, 199, 0.5) !important;
          border-color: rgba(245, 158, 11, 0.25) !important;
        }

        /* Text overrides - dark colors on text for extreme readability */
        .light-mode .text-gray-100,
        .light-mode [class*="text-gray-100"],
        .light-mode .text-gray-200,
        .light-mode [class*="text-gray-200"],
        .light-mode .text-gray-250,
        .light-mode [class*="text-gray-250"],
        .light-mode .text-gray-350,
        .light-mode [class*="text-gray-350"],
        .light-mode .text-gray-300,
        .light-mode [class*="text-gray-300"],
        .light-mode .text-white {
          color: #111827 !important;
        }

        .light-mode .text-gray-400,
        .light-mode [class*="text-gray-400"],
        .light-mode .text-gray-500,
        .light-mode [class*="text-gray-500"] {
          color: #4b5563 !important;
        }

        .light-mode .text-gray-705,
        .light-mode .text-gray-700,
        .light-mode [class*="text-gray-700"] {
          color: #9ca3af !important;
        }

        /* Soft inputs */
        .light-mode input[type="text"],
        .light-mode .bg-gray-950 input,
        .light-mode input {
          background-color: #f9fafb !important;
          color: #111827 !important;
          border-color: #d1d5db !important;
        }

        .light-mode input::placeholder {
          color: #9ca3af !important;
        }

        /* Buttons background & hover states inside light mode */
        .light-mode button.bg-gray-800,
        .light-mode button.bg-gray-900,
        .light-mode button.bg-gray-850,
        .light-mode button[class*="bg-gray-"] {
          background-color: #f3f4f6 !important;
          color: #111827 !important;
          border-color: #d1d5db !important;
        }

        .light-mode button.bg-gray-800:hover,
        .light-mode button.bg-gray-900:hover,
        .light-mode button.bg-gray-850:hover,
        .light-mode button[class*="bg-gray-"]:hover {
          background-color: #e5e7eb !important;
        }

        /* Color accent contrasts adjustment */
        .light-mode .text-cyan-400,
        .light-mode [class*="text-cyan-400"],
        .light-mode .text-cyan-500,
        .light-mode [class*="text-cyan-500"],
        .light-mode .text-cyan-200,
        .light-mode .text-cyan-300 {
          color: #0369a1 !important;
        }

        .light-mode .text-amber-400,
        .light-mode [class*="text-amber-400"],
        .light-mode .text-amber-300 {
          color: #b45309 !important;
        }

        .light-mode .text-red-400,
        .light-mode [class*="text-red-400"],
        .light-mode .text-red-350,
        .light-mode .text-red-300,
        .light-mode .text-red-200 {
          color: #b91c1c !important;
        }

        .light-mode .text-emerald-400,
        .light-mode [class*="text-emerald-400"] {
          color: #047857 !important;
        }

        .light-mode .text-pink-400,
        .light-mode [class*="text-pink-400"] {
          color: #be185d !important;
        }

        .light-mode .text-teal-400,
        .light-mode [class*="text-teal-400"] {
          color: #0f766e !important;
        }

        .light-mode .text-orange-400,
        .light-mode [class*="text-orange-400"] {
          color: #c2410c !important;
        }

        .light-mode header {
          background-color: rgba(255, 255, 255, 0.85) !important;
          border-color: #e5e7eb !important;
        }

        .light-mode .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(229, 231, 235, 0.5) !important;
        }

        .light-mode .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.8) !important;
        }

        .light-mode .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 1) !important;
        }

        /* Modern override styles for stats badge overlays and dot indicators in light-mode */
        .light-mode .g-tree-stats {
          background-color: #f3f4f6 !important;
          border-color: #e5e7eb !important;
          color: #374151 !important;
        }

        .light-mode .g-tree-stats span {
          color: #4b5563 !important;
        }

        .light-mode .g-tree-stats .font-extrabold {
          color: inherit !important; /* Let text-teal, text-pink, etc. apply standard light equivalents */
        }

        .light-mode .g-tree-stats .g-dot,
        .light-mode .g-tree-stats-mobile .g-dot {
          background-color: #d1d5db !important;
          color: #9ca3af !important;
        }

        .light-mode .g-tree-stats-mobile {
          background-color: #f3f4f6 !important;
          border-color: #e5e7eb !important;
          color: #374151 !important;
        }

        .light-mode .status-indicator-badge {
          background-color: #ecfeff !important;
          color: #0891b2 !important;
          border-color: #cffafe !important;
          box-shadow: 0 1px 2px rgba(6, 182, 212, 0.05);
        }

        .light-mode .status-indicator-badge .bg-cyan-400 {
          background-color: #06b6d4 !important;
        }

        .light-mode .status-indicator-badge .bg-cyan-500 {
          background-color: #0891b2 !important;
        }
      `}</style>
      <header className="bg-gray-800 bg-opacity-70 backdrop-blur-sm shadow-md px-4 py-3 z-10 border-b border-gray-700/80 flex-shrink-0">
        <div className="container mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <GraphIcon className="w-8 h-8 text-cyan-400" />
            <div className="flex items-baseline gap-2">
              <h1 className="text-2xl font-black bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">GedShield</h1>
              <span className="hidden md:inline h-4 w-[1px] bg-gray-700 mx-1"></span>
              <span className="hidden md:inline text-xs text-gray-400 font-semibold">{t.appSubtitle}</span>
            </div>
            
            {parsedStats && (
              <div className="hidden lg:flex items-center gap-3.5 bg-gray-950/60 px-4 py-1.5 rounded-full border border-gray-700/60 text-xs font-semibold g-tree-stats">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">{t.people}:</span>
                  <span className="font-extrabold text-teal-400 font-mono text-sm">{parsedStats.peopleCount}</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-gray-700 g-dot"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">{t.families}:</span>
                  <span className="font-extrabold text-pink-400 font-mono text-sm">{parsedStats.familyCount}</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-gray-700 g-dot"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-250">{t.connectedComponents}:</span>
                  <span className="font-extrabold text-amber-400 font-mono text-sm">{parsedStats.componentsCount}</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
            <button
              onClick={() => setLang(l => l === 'he' ? 'en' : 'he')}
              className={`p-1.5 px-3 rounded-lg border transition-all duration-200 flex items-center justify-center gap-1.5 text-[11px] font-black active:scale-95 cursor-pointer select-none ${
                isLightMode 
                  ? 'bg-white hover:bg-gray-100 text-gray-800 border-gray-300 shadow-sm' 
                  : 'bg-gray-850 hover:bg-gray-800 text-cyan-400 border-gray-750'
              }`}
              title={lang === 'he' ? "Switch to English" : "עבור לעברית"}
            >
              <span>🌐</span>
              <span>{lang === 'he' ? 'English' : 'עברית'}</span>
            </button>

            <button
              onClick={() => setIsLightMode(!isLightMode)}
              className={`p-1.5 px-3 rounded-lg border transition-all duration-200 flex items-center justify-center gap-2 text-[11px] font-black active:scale-95 cursor-pointer select-none ${
                isLightMode 
                  ? 'bg-white hover:bg-gray-100 text-gray-800 border-gray-300 shadow-sm' 
                  : 'bg-gray-850 hover:bg-gray-800 text-yellow-400 border-gray-750'
              }`}
              title={isLightMode ? t.switchToDark : t.switchToLight}
            >
              {isLightMode ? <MoonIcon /> : <SunIcon />}
              <span>{isLightMode ? t.darkMode : t.lightMode}</span>
            </button>
            {parsedStats && (
              <div className="flex lg:hidden items-center gap-2.5 text-[11px] font-semibold text-gray-300 bg-gray-950/40 px-3 py-1 rounded-md border border-gray-800 g-tree-stats-mobile">
                <span>{t.people}: <b className="text-teal-400 font-mono">{parsedStats.peopleCount}</b></span>
                <span className="text-gray-700 g-dot">•</span>
                <span>{t.families}: <b className="text-pink-400 font-mono">{parsedStats.familyCount}</b></span>
                <span className="text-gray-700 g-dot">•</span>
                <span>{t.components}: <b className="text-amber-400 font-mono">{parsedStats.componentsCount}</b></span>
              </div>
            )}
            {error && (
              <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full border flex items-center gap-2 select-none shadow-sm transition-all duration-200 ${
                isLightMode 
                  ? 'bg-red-50 text-red-600 border-red-200' 
                  : 'bg-red-950/45 text-red-400 border-red-900/30'
              }`}>
                <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                </span>
                <span className={`font-black text-[10px] pl-1.5 border-l ml-1 block flex-shrink-0 ${
                  isLightMode ? 'border-red-200' : 'border-red-900/20'
                }`}>{t.systemError}</span>
                <span className="truncate max-w-[200px] sm:max-w-[320px]" title={error}>{error}</span>
                <button 
                  onClick={() => setError(null)}
                  className="mr-1 hover:opacity-100 opacity-70 cursor-pointer font-black text-xs px-1"
                  title={t.closeMessage}
                >
                  ✕
                </button>
              </span>
            )}
          </div>
        </div>
      </header>
      <main className="flex-grow flex flex-col md:flex-row container mx-auto p-4 gap-4 min-h-0 overflow-hidden md:overflow-visible">
        <div className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0 h-[45vh] md:h-full flex flex-col min-h-0 overflow-hidden">
          <ControlPanel
            onFileSelect={handleFileSelect}
            onSampleSelect={handleSampleSelect}
            analysisResult={analysisResult}
            hasGraphData={!!graphData}
            graphData={graphData}
            selectedNode={selectedNode}
            onNodeSelect={handleNodeClick}
            onClearSelection={() => setSelectedNode(null)}
            isGedcom={isGedcom}
            onGenerateAiInsights={handleGenerateAiInsights}
            aiSummary={aiSummary}
            isGeneratingAi={isGeneratingAi}
            pendingDeletions={pendingDeletions}
            pendingAnonymizations={pendingAnonymizations}
            onStageDeletion={handleStageDeletion}
            onStageAnonymization={handleStageAnonymization}
            onUnstageNodes={handleUnstageNodes}
            onClearStaged={handleClearStaged}
            onApplyPendingChanges={handleApplyPendingChanges}
            onStageDeleteBranch={handleStageDeleteBranch}
            onStageAnonymizeBranch={handleStageAnonymizeBranch}
            canUndo={lastActionsStaged.length > 0}
            onUndo={handleUndoLastStaged}
            onExportGedcom={handleExportGedcom}
            onToggleDeceased={handleToggleDeceased}
            isLightMode={isLightMode}
            lang={lang}
          />
        </div>
        <div className={`flex-grow flex-1 rounded-lg shadow-2xl overflow-hidden relative border h-full min-h-[300px] transition-colors duration-200 ${isLightMode ? 'bg-gray-100 border-gray-200' : 'bg-gray-850 border-gray-700'}`}>
          {graphData ? (
            <>
              <GraphVisualizer
                fgRef={fgRef}
                graphData={visibleGraphData}
                isLightMode={isLightMode}
                onNodeClick={handleNodeClick}
                onBackgroundClick={() => {
                  setSelectedNode(null);
                  setSelectedNodeIds(new Set());
                }}
                hoveredNode={hoveredNode}
                onNodeHover={setHoveredNode}
                selectedNode={selectedNode}
                analysisResult={analysisResult}
                selectedNodeIds={selectedNodeIds}
                setSelectedNodeIds={setSelectedNodeIds}
                pendingDeletions={pendingDeletions}
                pendingAnonymizations={pendingAnonymizations}
                onStageDeletion={handleStageDeletion}
                onStageAnonymization={handleStageAnonymization}
                onUnstageNodes={handleUnstageNodes}
                onStageDeleteBranch={handleStageDeleteBranch}
                onStageAnonymizeBranch={handleStageAnonymizeBranch}
                canUndo={lastActionsStaged.length > 0}
                onUndo={handleUndoLastStaged}
                onAddRelative={handleAddRelative}
                onRenameNode={handleRenameNode}
                lang={lang}
              />
              <GraphLegend isGedcom={isGedcom} isAdvancedMode={isAdvancedMode} hasCommunities={!!analysisResult?.communities} lang={lang} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <UploadIcon className="w-24 h-24 text-gray-600 mb-6" />
              <h2 className="text-2xl font-semibold text-gray-300">{t.readyToDisplay}</h2>
              <p className="mt-2 text-gray-400 max-w-md">{t.uploadPrompt}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
