
export interface NodeObject {
  id: string;
  name?: string;
  type?: 'person' | 'place' | 'date' | 'source' | 'other';
  [key: string]: any;
}

export interface LinkObject {
  source: string;
  target: string;
  type?: 'marriage' | 'parent-child' | 'event_link';
  label?: string; // To describe the link (e.g. "born in", "married on")
  [key: string]: any;
}

export interface GraphData {
  nodes: NodeObject[];
  links: LinkObject[];
}

export interface CentralityResult {
  node: NodeObject;
  value: number;
}

export interface DegreeDistributionResult {
    degree: number;
    count: number;
}

export interface NodeAnalysisResult {
    id: string;
    degree: number;
    clusteringCoefficient: number;
    eccentricity: number;
    averageDistance: number;
    reachableNodes: number;
}

export interface AnalysisResult {
  nodeCount: number;
  edgeCount: number;
  averageDegree: number;
  transitivity: number;
  componentCount: number;
  isConnected: boolean;
  diameter: number | string;
  radius: number | string;
  centerNodes: NodeObject[];
  peripheryNodes: NodeObject[];
  largestComponentSize: number;
  graphDensity: number | string;
  averageShortestPath: number | string;
  articulationPoints: NodeObject[];
  centralityByConnections?: CentralityResult[];
  centralityByDescendants?: CentralityResult[];
  centralityByAncestors?: CentralityResult[];
  betweennessCentrality?: CentralityResult[];
  degreeDistribution?: DegreeDistributionResult[];
  averageGenerationWidth?: number | string;
  averageLeafDepth?: number | string;
  maxGenerationalDepth?: number;
  averageBranchingFactor?: number | string;
  surnameDiversity?: number | string;
  structureRatio?: number | string;
  communities?: NodeObject[][];
  averagePedigreeCollapse?: number | string;
  totalPedigreeCollapseOccurrences?: number;
  isLargeGraph?: boolean;
}
