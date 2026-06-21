
// This file is plain JavaScript to be run in a Web Worker.
// Type annotations have been removed from the original TypeScript file.

// --- START of graphService.ts analysis functions ---
const bfs = (startNodeId, adjacencyList) => {
  const distances = new Map([[startNodeId, 0]]);
  const queue = [startNodeId];
  let maxDistance = 0;
  
  let head = 0;
  while(head < queue.length) {
    const currentNodeId = queue[head++];
    const currentDistance = distances.get(currentNodeId);

    if (currentDistance > maxDistance) {
        maxDistance = currentDistance;
    }

    const neighbors = adjacencyList.get(currentNodeId) || [];
    for (const neighborId of neighbors) {
      if (!distances.has(neighborId)) {
        distances.set(neighborId, currentDistance + 1);
        queue.push(neighborId);
      }
    }
  }

  return { distances, maxDistance };
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
}

const calculateGraphDensity = (nodeCount, edgeCount) => {
    if (nodeCount < 2) return 0;
    // For an undirected graph
    return (2 * edgeCount) / (nodeCount * (nodeCount - 1));
};

const calculateAverageShortestPath = (
    componentNodeIds, 
    adjacencyList
) => {
    let totalDistanceSum = 0;
    const n = componentNodeIds.length;
    let reachablePairs = 0;
    
    if (n < 2) return 0;

    for (const startNodeId of componentNodeIds) {
        const { distances } = bfs(startNodeId, adjacencyList);
        for (const [endNodeId, d] of distances.entries()) {
            if (startNodeId !== endNodeId) {
                totalDistanceSum += d;
                reachablePairs++;
            }
        }
    }
    
    return reachablePairs > 0 ? totalDistanceSum / reachablePairs : 0;
};

const findArticulationPoints = (
    componentNodeIds, 
    adjacencyList
) => {
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
                
                if (parent.get(u) === null && children > 1) {
                    points.add(u);
                }
                if (parent.get(u) !== null && lowLinkValues.get(v) >= discoveryTimes.get(u)) {
                    points.add(u);
                }
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

// Implements Brandes' algorithm for betweenness centrality.
const calculateBetweennessCentrality = (
    componentNodeIds,
    adjacencyList
) => {
    const centrality = new Map();
    for (const id of componentNodeIds) {
        centrality.set(id, 0);
    }

    for (const s of componentNodeIds) {
        const stack = [];
        const predecessors = new Map();
        const shortestPathCounts = new Map();
        const distances = new Map();

        for (const id of componentNodeIds) {
            predecessors.set(id, []);
            shortestPathCounts.set(id, 0);
            distances.set(id, -1);
        }
        
        shortestPathCounts.set(s, 1);
        distances.set(s, 0);
        const queue = [s];
        
        let head = 0;
        while (head < queue.length) {
            const v = queue[head++];
            stack.push(v);
            const neighbors = adjacencyList.get(v) || [];

            for (const w of neighbors) {
                // Path discovery
                if (distances.get(w) < 0) {
                    queue.push(w);
                    distances.set(w, distances.get(v) + 1);
                }
                // Path counting
                if (distances.get(w) === distances.get(v) + 1) {
                    shortestPathCounts.set(w, shortestPathCounts.get(w) + shortestPathCounts.get(v));
                    predecessors.get(w).push(v);
                }
            }
        }

        const dependencies = new Map();
        for(const id of componentNodeIds) {
            dependencies.set(id, 0);
        }

        // Accumulation phase
        while (stack.length > 0) {
            const w = stack.pop();
            for (const v of predecessors.get(w)) {
                const dependency = shortestPathCounts.get(v) / shortestPathCounts.get(w) * (1 + dependencies.get(w));
                dependencies.set(v, dependencies.get(v) + dependency);
            }
            if (w !== s) {
                centrality.set(w, centrality.get(w) + dependencies.get(w));
            }
        }
    }

    // Normalize for undirected graphs and prepare result
    return componentNodeIds
        .map(id => ({ node: {id}, value: centrality.get(id) / 2 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
};


const calculateDegreeCentrality = (
    graphData,
    adjacencyList
) => {
    return graphData.nodes
        .map(node => ({
            node,
            value: (adjacencyList.get(node.id) || []).length,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
};

const calculateDegreeDistribution = (
    adjacencyList
) => {
    const distribution = new Map();
    for (const neighbors of adjacencyList.values()) {
        const degree = neighbors.length;
        distribution.set(degree, (distribution.get(degree) || 0) + 1);
    }
    return Array.from(distribution.entries())
        .map(([degree, count]) => ({ degree, count }))
        .sort((a, b) => a.degree - b.degree);
};

// Robust recursive implementation with memoization
const createMemoizedCounter = (map) => {
    const memo = new Map();

    const count = (nodeId) => {
        if (memo.has(nodeId)) {
            return memo.get(nodeId);
        }

        const relatedNodes = new Set();
        const directConnections = map.get(nodeId) || [];

        for (const connectedId of directConnections) {
            relatedNodes.add(connectedId);
            const indirect = count(connectedId);
            indirect.forEach(node => relatedNodes.add(node));
        }

        memo.set(nodeId, relatedNodes);
        return relatedNodes;
    };

    return count;
};

const calculateDescendantCentrality = (graphData) => {
    const childMap = new Map();
    graphData.links.forEach(link => {
        if (link.type === 'parent-child') {
            const parentId = typeof link.source === 'object' ? link.source.id : link.source;
            const childId = typeof link.target === 'object' ? link.target.id : link.target;
            if (!childMap.has(parentId)) childMap.set(parentId, []);
            childMap.get(parentId).push(childId);
        }
    });

    const countAllDescendants = createMemoizedCounter(childMap);
    return graphData.nodes
        .map(node => ({ node, value: countAllDescendants(node.id).size }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
};

const calculateAncestorCentrality = (graphData) => {
    const parentMap = new Map();
    graphData.links.forEach(link => {
        if (link.type === 'parent-child') {
            const parentId = typeof link.source === 'object' ? link.source.id : link.source;
            const childId = typeof link.target === 'object' ? link.target.id : link.target;
            if (!parentMap.has(childId)) parentMap.set(childId, []);
            parentMap.get(childId).push(parentId);
        }
    });

    const countAllAncestors = createMemoizedCounter(parentMap);
    return graphData.nodes
        .map(node => ({ node, value: countAllAncestors(node.id).size }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
};

const calculateGenealogicalStructure = (componentNodeIds, graphData) => {
    if (componentNodeIds.length === 0) {
        return { averageGenerationWidth: 'N/A', averageLeafDepth: 'N/A', structureRatio: 'N/A' };
    }

    const componentNodeSet = new Set(componentNodeIds);
    const parentToChildMap = new Map();
    const childToParentMap = new Map();

    graphData.links.forEach(link => {
        if (link.type === 'parent-child') {
            const parentId = typeof link.source === 'object' ? link.source.id : link.source;
            const childId = typeof link.target === 'object' ? link.target.id : link.target;

            if (componentNodeSet.has(parentId) && componentNodeSet.has(childId)) {
                if (!parentToChildMap.has(parentId)) parentToChildMap.set(parentId, []);
                parentToChildMap.get(parentId).push(childId);

                if (!childToParentMap.has(childId)) childToParentMap.set(childId, []);
                childToParentMap.get(childId).push(parentId);
            }
        }
    });

    // Find roots (nodes with no parents within the component)
    const roots = componentNodeIds.filter(id => !(childToParentMap.has(id) && childToParentMap.get(id).length > 0));

    if (roots.length === 0) { // Cycle or no clear root
        if(componentNodeIds.length > 0) roots.push(componentNodeIds[0]); // Pick an arbitrary root
        else return { averageGenerationWidth: 'N/A', averageLeafDepth: 'N/A', structureRatio: 'N/A' };
    }

    // --- BFS for Average Width ---
    const generationCounts = new Map();
    const visitedBfs = new Set();
    const queue = roots.map(root => ({ nodeId: root, depth: 0 }));
    roots.forEach(r => visitedBfs.add(r));

    let head = 0;
    while(head < queue.length) {
        const { nodeId, depth } = queue[head++];
        generationCounts.set(depth, (generationCounts.get(depth) || 0) + 1);
        
        const children = parentToChildMap.get(nodeId) || [];
        for (const childId of children) {
            if (!visitedBfs.has(childId)) {
                visitedBfs.add(childId);
                queue.push({ nodeId: childId, depth: depth + 1 });
            }
        }
    }

    let avgWidth = 0;
    if (generationCounts.size > 0) {
        let totalNodesInGenerations = 0;
        for (const count of generationCounts.values()) {
            totalNodesInGenerations += count;
        }
        avgWidth = totalNodesInGenerations / generationCounts.size;
    }

    // --- DFS for Average Depth ---
    const leafDepths = [];
    const visitedDfs = new Set();
    const dfs = (nodeId, currentDepth) => {
        visitedDfs.add(nodeId);
        const children = parentToChildMap.get(nodeId) || [];
        const unvisitedChildren = children.filter(c => !visitedDfs.has(c));

        if (unvisitedChildren.length === 0) { // It's a leaf in this traversal
            leafDepths.push(currentDepth);
            return;
        }

        for (const childId of unvisitedChildren) {
            dfs(childId, currentDepth + 1);
        }
    };
    
    roots.forEach(root => dfs(root, 0));

    let avgDepth = 0;
    if (leafDepths.length > 0) {
        const sumOfDepths = leafDepths.reduce((sum, d) => sum + d, 0);
        avgDepth = sumOfDepths / leafDepths.length;
    }
    
    const ratio = avgWidth > 0 ? avgDepth / avgWidth : 0;

    return {
        averageGenerationWidth: avgWidth > 0 ? avgWidth.toFixed(2) : 'N/A',
        averageLeafDepth: avgDepth > 0 ? avgDepth.toFixed(2) : 'N/A',
        structureRatio: ratio > 0 ? ratio.toFixed(2) : 'N/A',
    };
};

const detectCommunities = (graphData, adjacencyList) => {
    const nodes = graphData.nodes.map(n => n.id);
    if (nodes.length === 0) return [];

    let communities = new Map();
    nodes.forEach(nodeId => communities.set(nodeId, nodeId)); // Each node starts in its own community
    
    let changed = true;
    let iterations = 0;
    const maxIterations = 20; // Prevent infinite loops in oscillating cases

    while (changed && iterations < maxIterations) {
        changed = false;
        iterations++;
        
        // Shuffle for random update order
        const shuffledNodes = nodes.slice().sort(() => Math.random() - 0.5);

        shuffledNodes.forEach(nodeId => {
            const neighbors = adjacencyList.get(nodeId) || [];
            if (neighbors.length === 0) return;

            const labelCounts = new Map();
            neighbors.forEach(neighborId => {
                const label = communities.get(neighborId);
                labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
            });

            let maxCount = 0;
            let bestLabels = [];
            
            for (const [label, count] of labelCounts.entries()) {
                if (count > maxCount) {
                    maxCount = count;
                    bestLabels = [label];
                } else if (count === maxCount) {
                    bestLabels.push(label);
                }
            }

            // If there's a tie, pick one randomly
            const bestLabel = bestLabels[Math.floor(Math.random() * bestLabels.length)];
            
            if (communities.get(nodeId) !== bestLabel) {
                communities.set(nodeId, bestLabel);
                changed = true;
            }
        });
    }

    const finalCommunitiesMap = new Map();
    communities.forEach((communityId, nodeId) => {
        if (!finalCommunitiesMap.has(communityId)) {
            finalCommunitiesMap.set(communityId, []);
        }
        finalCommunitiesMap.get(communityId).push(nodeId);
    });

    const communitiesArray = Array.from(finalCommunitiesMap.values());
    communitiesArray.sort((a, b) => b.length - a.length);

    const nodeMap = new Map(graphData.nodes.map(n => [n.id, n]));
    return communitiesArray.map(community => 
        community.map(nodeId => nodeMap.get(nodeId)).filter(Boolean)
    );
};

const calculateLocalClusteringCoefficient = (nodeId, adjacencyList) => {
    const neighbors = adjacencyList.get(nodeId) || [];
    const k = neighbors.length;
    if (k < 2) return 0;

    const neighborSet = new Set(neighbors);
    let links = 0;

    // Calculate number of links between neighbors
    for (const neighbor of neighbors) {
        const neighborNeighbors = adjacencyList.get(neighbor) || [];
        for (const n of neighborNeighbors) {
            if (neighborSet.has(n)) {
                links++;
            }
        }
    }
    // links counts each edge twice (u-v and v-u), which effectively gives us 2 * E_neighbors
    // The formula is C = (2 * E_neighbors) / (k * (k - 1))
    // So we can use `links` directly as the numerator.

    return links / (k * (k - 1));
};

const analyzeGraph = (graphData, adjacencyList) => {
  const nodeCount = graphData.nodes.length;
  const edgeCount = graphData.links.length;
  const isGedcomGraph = graphData.links.some(l => l.type === 'parent-child' || l.type === 'marriage');
  const nodeMap = new Map(graphData.nodes.map(n => [n.id, n]));
  
  const components = findConnectedComponents(graphData, adjacencyList);
  const componentCount = components.length;
  
  const largestComponent = components.reduce((largest, current) => current.length > largest.length ? current : largest, []);
  const largestComponentSize = largestComponent.length;
  
  let diameter = 'N/A';
  let averageShortestPath = 'N/A';
  let articulationPoints = [];
  let betweennessCentrality = [];
  
  if (largestComponentSize > 1) {
    let maxEccentricity = 0;
    const componentAdjacencyList = new Map();
    largestComponent.forEach(nodeId => {
        componentAdjacencyList.set(nodeId, adjacencyList.get(nodeId) || []);
    });

    for (const nodeId of largestComponent) {
      const { maxDistance } = bfs(nodeId, componentAdjacencyList);
      if (maxDistance > maxEccentricity) {
        maxEccentricity = maxDistance;
      }
    }
    diameter = String(maxEccentricity);
    averageShortestPath = calculateAverageShortestPath(largestComponent, componentAdjacencyList).toFixed(2);
    
    const allArticulationPoints = findArticulationPoints(largestComponent, componentAdjacencyList);
    articulationPoints = allArticulationPoints
                            .slice(0, 5)
                            .map(id => nodeMap.get(id))
                            .filter(Boolean);
    
    betweennessCentrality = calculateBetweennessCentrality(largestComponent, componentAdjacencyList);
    betweennessCentrality.forEach(item => {
        item.node = nodeMap.get(item.node.id) || item.node;
    });
  }
  
  const centralityByConnections = calculateDegreeCentrality(graphData, adjacencyList);
  const degreeDistribution = calculateDegreeDistribution(adjacencyList);

  const baseResult = {
    nodeCount,
    edgeCount,
    componentCount,
    isConnected: componentCount === 1,
    graphDensity: calculateGraphDensity(nodeCount, edgeCount).toFixed(4),
    largestComponentSize,
    diameter,
    averageShortestPath,
    articulationPoints,
    centralityByConnections,
    betweennessCentrality,
    degreeDistribution,
  };
  
  if (isGedcomGraph) {
    return {
      ...baseResult,
      centralityByDescendants: calculateDescendantCentrality(graphData),
      centralityByAncestors: calculateAncestorCentrality(graphData),
      ...calculateGenealogicalStructure(largestComponent, graphData),
    };
  }

  return baseResult;
};
// --- END of graphService.ts analysis functions ---

self.onmessage = (event) => {
  try {
    const { type, graphData, nodeId } = event.data;

    // Create adjacency list once for the requested operation
    const adjacencyList = new Map();
    graphData.nodes.forEach(node => adjacencyList.set(node.id, []));
    graphData.links.forEach(({ source, target }) => {
        const sourceId = typeof source === 'object' && source !== null ? source.id : source;
        const targetId = typeof target === 'object' && target !== null ? target.id : target;
        if (!adjacencyList.has(sourceId)) adjacencyList.set(sourceId, []);
        if (!adjacencyList.has(targetId)) adjacencyList.set(targetId, []);
        adjacencyList.get(sourceId).push(targetId);
        adjacencyList.get(targetId).push(sourceId);
    });

    if (type === 'analyze') {
        const result = analyzeGraph(graphData, adjacencyList);
        self.postMessage({ type: 'analysis_success', result });
    } else if (type === 'detectCommunities') {
        const result = detectCommunities(graphData, adjacencyList);
        self.postMessage({ type: 'communities_success', result });
    } else if (type === 'analyzeNode' && nodeId) {
        const neighbors = adjacencyList.get(nodeId) || [];
        const degree = neighbors.length;
        const clustering = calculateLocalClusteringCoefficient(nodeId, adjacencyList);
        
        const { distances, maxDistance } = bfs(nodeId, adjacencyList);
        
        let totalDist = 0;
        let count = 0;
        distances.forEach((dist, id) => {
            if (id !== nodeId) {
                totalDist += dist;
                count++;
            }
        });
        
        const avgDist = count > 0 ? totalDist / count : 0;
        
        const result = {
            id: nodeId,
            degree,
            clusteringCoefficient: clustering,
            eccentricity: maxDistance,
            averageDistance: avgDist,
            reachableNodes: count + 1 // +1 for self
        };
        self.postMessage({ type: 'node_analysis_success', result });
    }
  } catch (error) {
    self.postMessage({ type: 'error', error: error.message || 'An unknown worker error occurred.' });
  }
};
