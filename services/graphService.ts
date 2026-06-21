
import { GraphData, NodeObject, LinkObject } from '../types';

/**
 * Parses a simple edge list file content (e.g., .gdcom, .txt) into graph data format.
 * Expected format: one edge per line, with two node IDs separated by whitespace.
 * e.g., "nodeA nodeB"
 */
export const parseEdgeList = (content: string): GraphData => {
  const links: LinkObject[] = [];
  const nodeSet = new Set<string>();
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;

    const parts = trimmedLine.split(/\s+/);
    if (parts.length >= 2) {
      const [source, target] = parts;
      if (source && target) {
        links.push({ source, target });
        nodeSet.add(source);
        nodeSet.add(target);
      }
    }
  }

  const nodes: NodeObject[] = Array.from(nodeSet).map(id => ({ id, type: 'person' as const }));
  return { nodes, links };
};

/**
 * Parses a .ged (GEDCOM) file content into a graph.
 * If advancedMode is true, it creates nodes for Places, Dates, and Sources.
 */
export const parseGedcom = (content: string, advancedMode: boolean = false): GraphData => {
  const individuals = new Map<string, NodeObject>();
  // We use a general map for extra nodes to avoid duplicates (e.g. multiple people born in 'Jerusalem')
  const extraNodes = new Map<string, NodeObject>(); 
  const links: LinkObject[] = [];
  
  const families: { 
      id: string; 
      type: 'FAM'; 
      husb?: string; 
      wife?: string; 
      children: string[]; 
      facts: { nodeId: string; label: string }[];
  }[] = [];
  
  const lines = content.split('\n');
  
  let currentRecord: any = null;
  let currentEvent: string | null = null; // e.g., 'BIRT', 'DEAT', 'MARR'

  // Helper to add extra nodes and links
  const addFact = (value: string, type: 'place' | 'date' | 'source', label: string) => {
      if (!currentRecord || !currentRecord.id) return;
      
      const cleanValue = value.replace(/@/g, '').trim();
      const nodeId = `${type.toUpperCase()}:${cleanValue}`;
      
      // Add node if not exists
      if (!extraNodes.has(nodeId)) {
          extraNodes.set(nodeId, { id: nodeId, name: cleanValue, type });
      }

      const linkLabel = currentEvent ? `${currentEvent} ${label}` : label;

      if (currentRecord.type === 'FAM') {
          // If the fact belongs to a family (e.g., marriage date), we queue it to link to the spouses later
          // because we might not have parsed HUSB/WIFE yet, or we want to avoid linking to the @Fxxx@ ID directly
          // which doesn't exist as a node in the graph.
          if (!currentRecord.facts) currentRecord.facts = [];
          currentRecord.facts.push({ nodeId, label: linkLabel });
      } else {
          // Individual record: link immediately
          links.push({
              source: currentRecord.id,
              target: nodeId,
              type: 'event_link',
              label: linkLabel
          });
      }
  };

  const eventTags = [
    'BIRT', 'DEAT', 'MARR', 'OCCU', 'RESI', 'EDUC', 'EVEN',
    'BURI', 'CHR', 'BAPM', 'ADOP', 'IMMI', 'EMIG', 'NATU', 
    'CENS', 'PROB', 'WILL', 'GRAD', 'RETI', 'DIV', 'DIVF', 'CREM'
  ];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const match = trimmedLine.match(/^(\d+)\s+(@\S+@|[^@\s]+)\s*(.*)$/);
    if (!match) continue;

    const level = parseInt(match[1], 10);
    const tagOrId = match[2];
    const value = match[3];

    // Preserve raw lines for individuals (excluding FAMS/FAMC which we'll regenerate dynamically)
    if (level > 0 && currentRecord && currentRecord.type === 'INDI') {
      const indi = individuals.get(currentRecord.id);
      if (indi) {
        if (!indi.rawGedcomLines) {
          indi.rawGedcomLines = [];
        }
        if (tagOrId !== 'FAMS' && tagOrId !== 'FAMC') {
          indi.rawGedcomLines.push(trimmedLine);
        }
      }
    }

    // Level 0: New Record
    if (level === 0) {
      const id = tagOrId;
      const type = value;
      currentEvent = null;

      if (type === 'INDI') {
        currentRecord = { id, type: 'INDI' };
        individuals.set(id, { id, name: id.replace(/@/g, ''), type: 'person' }); 
      } else if (type === 'FAM') {
        currentRecord = { id, type: 'FAM', children: [], facts: [] };
        families.push(currentRecord);
      } else {
        currentRecord = null;
      }
    } 
    // Level 1: Attributes or Events
    else if (level === 1 && currentRecord) {
      const tag = tagOrId;
      
      // Handle Names
      if (currentRecord.type === 'INDI' && tag === 'NAME') {
        const name = value.replace(/\//g, '').trim();
        const indi = individuals.get(currentRecord.id);
        if (indi && name) {
          indi.name = name;
        }
      } 
      // Handle SEX
      else if (currentRecord.type === 'INDI' && tag === 'SEX') {
        const indi = individuals.get(currentRecord.id);
        if (indi && value) {
          indi.gender = value.trim() as 'M' | 'F';
        }
      }
      // Handle Family Structure
      else if (currentRecord.type === 'FAM') {
        if (tag === 'HUSB') currentRecord.husb = value;
        if (tag === 'WIFE') currentRecord.wife = value;
        if (tag === 'CHIL') currentRecord.children.push(value);
      }
      
      // Set context for Level 2 (e.g., inside a BIRT tag)
      if (eventTags.includes(tag)) {
          currentEvent = tag;
          if (tag === 'DEAT' && currentRecord.type === 'INDI') {
              const indi = individuals.get(currentRecord.id);
              if (indi) {
                  indi.isDeceased = true;
              }
          }
      } else {
          currentEvent = null;
      }

      // If advanced mode, capture Level 1 facts directly (like OCCU value)
      if (advancedMode && currentRecord.type === 'INDI') {
          if (tag === 'OCCU' && value) addFact(value, 'source', 'Occupation');
          if (tag === 'TITL' && value) addFact(value, 'source', 'Title');
      }
    } 
    // Level 2: Details (Date, Place, Source)
    else if (level === 2 && currentRecord && currentEvent && advancedMode) {
        const tag = tagOrId;
        if (tag === 'PLAC' && value) {
            addFact(value, 'place', 'at');
        } else if (tag === 'DATE' && value) {
            const yearMatch = value.match(/\d{4}/);
            if (yearMatch) {
                addFact(yearMatch[0], 'date', 'in');
            }
        } else if ((tag === 'SOUR' || tag === 'NOTE') && value) {
            addFact(value, 'source', 'source/note');
        }
    }
  }

  // --- Construct Links for Family Relations ---
  const nodeSet = new Set<string>(individuals.keys());

  for (const family of families) {
    // Parent nodes
    if (family.husb) nodeSet.add(family.husb);
    if (family.wife) nodeSet.add(family.wife);

    // Marriage link
    if (family.husb && family.wife) {
      links.push({ source: family.husb, target: family.wife, type: 'marriage' });
    }

    // Parent-Child links
    family.children.forEach(child => {
      nodeSet.add(child);
      if (family.husb) links.push({ source: family.husb, target: child, type: 'parent-child' });
      if (family.wife) links.push({ source: family.wife, target: child, type: 'parent-child' });
    });

    // Family Fact links (from Advanced Mode)
    // Link facts (like marriage date/place) to both husband and wife
    if (family.facts) {
        family.facts.forEach(fact => {
            if (family.husb) {
                links.push({ source: family.husb, target: fact.nodeId, type: 'event_link', label: fact.label });
            }
            if (family.wife) {
                links.push({ source: family.wife, target: fact.nodeId, type: 'event_link', label: fact.label });
            }
        });
    }
  }
  
  // Combine all nodes
  const nodes: NodeObject[] = [
      ...Array.from(nodeSet).map(id => individuals.get(id) || { id, type: 'person' as const }),
      ...Array.from(extraNodes.values())
  ];

  return { nodes, links };
};

interface FamilyGroup {
  id: string;
  husb?: string;
  wife?: string;
  children: string[];
}

/**
 * Exports current GraphData back into a valid, standard-compliant GEDCOM 5.5.5 string.
 */
export const exportToGedcom = (
  graphData: GraphData,
  pendingDeletions?: Set<string>,
  pendingAnonymizations?: Set<string>
): string => {
  const lines: string[] = [];
  
  // Header section
  lines.push('0 HEAD');
  lines.push('1 GEDC');
  lines.push('2 VERS 5.5.5');
  lines.push('2 FORM LINEAGE-LINKED');
  lines.push('1 CHAR UTF-8');
  lines.push('1 SOUR FAMILY_TREE_EDITOR');
  lines.push('2 VERS 1.0.0');
  
  const people = graphData.nodes
    .filter(n => n.type === 'person' || !n.type)
    .filter(n => !pendingDeletions || !pendingDeletions.has(n.id));
  
  // Helper to ensure @ID@ format cleanly for cross-references
  const formatGedcomId = (id: string): string => {
    let clean = id.trim().replace(/@/g, '');
    clean = clean.replace(/[^a-zA-Z0-9_]/g, '_');
    return `@${clean}@`;
  };

  // 1. Classify relationships and construct families (FAM) records first
  const familiesList: FamilyGroup[] = [];
  let famCounter = 1;
  const getNextFamId = () => `@F${famCounter++}@`;

  const isFemaleNode = (id: string) => people.some(p => p.id === id && p.gender === 'F');
  const isMaleNode = (id: string) => people.some(p => p.id === id && p.gender === 'M');

  // A. Find marriages to construct co-husband/wife family hubs
  const processedMarriageKeys = new Set<string>();

  graphData.links.forEach(link => {
    if (link.type === 'marriage') {
      const sId = typeof link.source === 'object' ? (link.source as any).id : link.source;
      const tId = typeof link.target === 'object' ? (link.target as any).id : link.target;
      
      // Ensure both parent nodes exist
      if (!people.some(p => p.id === sId) || !people.some(p => p.id === tId)) return;

      const pairKey = [sId, tId].sort().join('_');
      if (!processedMarriageKeys.has(pairKey)) {
        processedMarriageKeys.add(pairKey);
        
        let husb: string | undefined;
        let wife: string | undefined;
        
        if (isFemaleNode(sId)) {
          wife = sId;
          husb = tId;
        } else if (isFemaleNode(tId)) {
          wife = tId;
          husb = sId;
        } else if (isMaleNode(sId)) {
          husb = sId;
          wife = tId;
        } else {
          husb = sId;
          wife = tId;
        }

        familiesList.push({
          id: getNextFamId(),
          husb,
          wife,
          children: []
        });
      }
    }
  });

  // B. Group parent-child relations
  const childToParentsMap = new Map<string, string[]>();
  
  graphData.links.forEach(link => {
    if (link.type === 'parent-child') {
      const parentId = typeof link.source === 'object' ? (link.source as any).id : link.source;
      const childId = typeof link.target === 'object' ? (link.target as any).id : link.target;

      // Check validity of both individual entities
      if (!people.some(p => p.id === parentId) || !people.some(p => p.id === childId)) return;

      if (!childToParentsMap.has(childId)) {
        childToParentsMap.set(childId, []);
      }
      const parents = childToParentsMap.get(childId)!;
      if (!parents.includes(parentId)) {
        parents.push(parentId);
      }
    }
  });

  // Group children into spouse families or single parent families
  childToParentsMap.forEach((parents, childId) => {
    if (parents.length === 1) {
      const p1 = parents[0];
      let fam = familiesList.find(f => f.husb === p1 || f.wife === p1);
      
      if (fam) {
        if (!fam.children.includes(childId)) fam.children.push(childId);
      } else {
        const isFem = isFemaleNode(p1);
        familiesList.push({
          id: getNextFamId(),
          husb: isFem ? undefined : p1,
          wife: isFem ? p1 : undefined,
          children: [childId]
        });
      }
    } else if (parents.length >= 2) {
      const p1 = parents[0];
      const p2 = parents[1];
      
      let fam = familiesList.find(f => 
        (f.husb === p1 && f.wife === p2) || (f.husb === p2 && f.wife === p1)
      );

      if (!fam) {
        let husb: string | undefined;
        let wife: string | undefined;
        
        if (isFemaleNode(p1)) {
          wife = p1;
          husb = p2;
        } else if (isFemaleNode(p2)) {
          wife = p2;
          husb = p1;
        } else if (isMaleNode(p1)) {
          husb = p1;
          wife = p2;
        } else {
          husb = p1;
          wife = p2;
        }

        fam = {
          id: getNextFamId(),
          husb,
          wife,
          children: []
        };
        familiesList.push(fam);
      }
      
      if (!fam.children.includes(childId)) {
        fam.children.push(childId);
      }
    }
  });

  // Map to store family references for each individual (standard bidirectional GEDCOM format support)
  const individualFamiliesMap = new Map<string, { fams: string[]; famc: string[] }>();
  people.forEach(node => {
    individualFamiliesMap.set(node.id, { fams: [], famc: [] });
  });

  familiesList.forEach(fam => {
    if (fam.husb && individualFamiliesMap.has(fam.husb)) {
      individualFamiliesMap.get(fam.husb)!.fams.push(fam.id);
    }
    if (fam.wife && individualFamiliesMap.has(fam.wife)) {
      individualFamiliesMap.get(fam.wife)!.fams.push(fam.id);
    }
    fam.children.forEach(child => {
      if (individualFamiliesMap.has(child)) {
        individualFamiliesMap.get(child)!.famc.push(fam.id);
      }
    });
  });

  // 2. Write Individuals (INDI) with clean tags and reciprocal links
  people.forEach(node => {
    const refId = formatGedcomId(node.id);
    lines.push(`0 ${refId} INDI`);
    
    const isAnon = node.isAnonymized || (pendingAnonymizations && pendingAnonymizations.has(node.id)) || node.name === 'אנונימי/ת';

    if (isAnon) {
      lines.push('1 NAME אנונימי/ת');
      if (node.isDeceased) {
        lines.push('1 DEAT');
      }
    } else {
      if (node.rawGedcomLines && node.rawGedcomLines.length > 0) {
        let skippingDeathDetails = false;
        let hasDeathTag = false;
        let hasSexTag = false;
        let hasNameTag = false;
        
        node.rawGedcomLines.forEach((line: string) => {
          const parts = line.trim().split(/\s+/);
          const lLevel = parseInt(parts[0], 10);
          const lTag = parts[1];

          // 1. Dynamic replacement for Name tag from UI
          if (lLevel === 1 && lTag === 'NAME') {
            hasNameTag = true;
            const nameStr = node.name || node.id;
            let formattedName = nameStr;
            if (!nameStr.includes('/')) {
              const parts = nameStr.trim().split(/\s+/);
              if (parts.length > 1) {
                const last = parts.pop();
                formattedName = `${parts.join(' ')} /${last}/`;
              } else {
                formattedName = `${nameStr} //`;
              }
            }
            lines.push(`1 NAME ${formattedName}`);
            return;
          }

          // 2. Dynamic replacement for Sex / Gender Tag from UI
          if (lLevel === 1 && lTag === 'SEX') {
            hasSexTag = true;
            if (node.gender === 'F') {
              lines.push('1 SEX F');
            } else if (node.gender === 'M') {
              lines.push('1 SEX M');
            }
            return;
          }

          // 3. Dynamic handle of DEAT Death tag of original lines
          if (lLevel === 1 && lTag === 'DEAT') {
            hasDeathTag = true;
            if (!node.isDeceased) {
              skippingDeathDetails = true;
              return; // skip 1 DEAT if user revived / set alive in UI
            }
          } else if (skippingDeathDetails) {
            if (lLevel > 1) {
              return; // skip child records of DEAT
            } else {
              skippingDeathDetails = false;
            }
          }

          lines.push(line);
        });

        // If gender was set/updated but original lines didn't have a SEX tag
        if (!hasSexTag) {
          if (node.gender === 'F') {
            lines.push('1 SEX F');
          } else if (node.gender === 'M') {
            lines.push('1 SEX M');
          }
        }

        // Add DEAT if now marked deceased but original record lacked DEAT
        if (node.isDeceased && !hasDeathTag) {
          lines.push('1 DEAT');
        }
      } else {
        // Freshly created individuals who don't have original imported lines
        const nameStr = node.name || node.id;
        let formattedName = nameStr;
        if (!nameStr.includes('/')) {
          const parts = nameStr.trim().split(/\s+/);
          if (parts.length > 1) {
            const last = parts.pop();
            formattedName = `${parts.join(' ')} /${last}/`;
          } else {
            formattedName = `${nameStr} //`;
          }
        }
        lines.push(`1 NAME ${formattedName}`);
        
        if (node.gender === 'F') {
          lines.push('1 SEX F');
        } else if (node.gender === 'M') {
          lines.push('1 SEX M');
        }

        if (node.isDeceased) {
          lines.push('1 DEAT');
        }
      }
    }

    // FAMS and FAMC references for valid standard compliance
    const famRefs = individualFamiliesMap.get(node.id);
    if (famRefs) {
      famRefs.fams.forEach(fId => {
        lines.push(`1 FAMS ${fId}`);
      });
      famRefs.famc.forEach(fId => {
        lines.push(`1 FAMC ${fId}`);
      });
    }
  });

  // 3. Output family records to lines
  familiesList.forEach(fam => {
    lines.push(`0 ${fam.id} FAM`);
    if (fam.husb) lines.push(`1 HUSB ${formatGedcomId(fam.husb)}`);
    if (fam.wife) lines.push(`1 WIFE ${formatGedcomId(fam.wife)}`);
    fam.children.forEach(child => {
      lines.push(`1 CHIL ${formatGedcomId(child)}`);
    });
  });

  // Trailer
  lines.push('0 TRLR');

  return lines.join('\n');
};

/**
 * Calculates graph statistics including total individuals, family groups, and connected components.
 */
export const getGraphStats = (graphData: GraphData) => {
  const people = graphData.nodes.filter(n => n.type === 'person' || !n.type);
  const peopleSet = new Set(people.map(p => p.id));
  
  const peopleCount = people.length;

  const isFemaleNode = (id: string) => people.some(p => p.id === id && p.gender === 'F');
  const familiesList: { husb?: string; wife?: string; children: string[] }[] = [];

  const processedMarriageKeys = new Set<string>();
  graphData.links.forEach(link => {
    if (link.type === 'marriage') {
      const sId = typeof link.source === 'object' ? (link.source as any).id : link.source;
      const tId = typeof link.target === 'object' ? (link.target as any).id : link.target;
      
      if (!peopleSet.has(sId) || !peopleSet.has(tId)) return;

      const pairKey = [sId, tId].sort().join('_');
      if (!processedMarriageKeys.has(pairKey)) {
        processedMarriageKeys.add(pairKey);
        
        let husb = isFemaleNode(sId) ? tId : sId;
        let wife = isFemaleNode(sId) ? sId : tId;
        familiesList.push({ husb, wife, children: [] });
      }
    }
  });

  const childToParentsMap = new Map<string, string[]>();
  graphData.links.forEach(link => {
    if (link.type === 'parent-child') {
      const parentId = typeof link.source === 'object' ? (link.source as any).id : link.source;
      const childId = typeof link.target === 'object' ? (link.target as any).id : link.target;

      if (!peopleSet.has(parentId) || !peopleSet.has(childId)) return;

      if (!childToParentsMap.has(childId)) {
        childToParentsMap.set(childId, []);
      }
      const parents = childToParentsMap.get(childId)!;
      if (!parents.includes(parentId)) {
        parents.push(parentId);
      }
    }
  });

  childToParentsMap.forEach((parents, childId) => {
    if (parents.length === 1) {
      const p1 = parents[0];
      let fam = familiesList.find(f => f.husb === p1 || f.wife === p1);
      if (fam) {
        if (!fam.children.includes(childId)) fam.children.push(childId);
      } else {
        const isFem = isFemaleNode(p1);
        familiesList.push({
          husb: isFem ? undefined : p1,
          wife: isFem ? p1 : undefined,
          children: [childId]
        });
      }
    } else if (parents.length >= 2) {
      const p1 = parents[0];
      const p2 = parents[1];
      let fam = familiesList.find(f => 
        (f.husb === p1 && f.wife === p2) || (f.husb === p2 && f.wife === p1)
      );
      if (!fam) {
        fam = {
          husb: isFemaleNode(p1) ? p2 : p1,
          wife: isFemaleNode(p1) ? p1 : p2,
          children: []
        };
        familiesList.push(fam);
      }
      if (!fam.children.includes(childId)) fam.children.push(childId);
    }
  });

  const familyCount = familiesList.length;

  const adj = new Map<string, string[]>();
  graphData.nodes.forEach(n => {
    adj.set(n.id, []);
  });

  graphData.links.forEach(l => {
    const sId = typeof l.source === 'object' ? (l.source as any).id : l.source;
    const tId = typeof l.target === 'object' ? (l.target as any).id : l.target;
    
    if (adj.has(sId) && adj.has(tId)) {
      adj.get(sId)!.push(tId);
      adj.get(tId)!.push(sId);
    }
  });

  const visited = new Set<string>();
  let componentsCount = 0;

  graphData.nodes.forEach(n => {
    if (!visited.has(n.id)) {
      componentsCount++;
      const queue = [n.id];
      visited.add(n.id);
      
      let head = 0;
      while (head < queue.length) {
        const current = queue[head++];
        const neighbors = adj.get(current) || [];
        neighbors.forEach(neighbor => {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        });
      }
    }
  });

  return {
    peopleCount,
    familyCount,
    componentsCount
  };
};

/**
 * Identifies all nodes that belong to small connected components
 * (i.e. all components except the single largest by node count).
 */
export const getSmallComponentNodeIds = (graphData: GraphData): Set<string> => {
  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) return new Set();

  const adj = new Map<string, string[]>();
  graphData.nodes.forEach(n => {
    adj.set(n.id, []);
  });

  graphData.links.forEach(l => {
    const sId = typeof l.source === 'object' ? (l.source as any).id : l.source;
    const tId = typeof l.target === 'object' ? (l.target as any).id : l.target;
    
    if (adj.has(sId) && adj.has(tId)) {
      adj.get(sId)!.push(tId);
      adj.get(tId)!.push(sId);
    }
  });

  const visited = new Set<string>();
  const components: string[][] = [];

  graphData.nodes.forEach(n => {
    if (!visited.has(n.id)) {
      const currentComp: string[] = [];
      const queue = [n.id];
      visited.add(n.id);
      
      let head = 0;
      while (head < queue.length) {
        const current = queue[head++];
        currentComp.push(current);
        const neighbors = adj.get(current) || [];
        neighbors.forEach(neighbor => {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        });
      }
      components.push(currentComp);
    }
  });

  if (components.length <= 1) return new Set();

  // Find the largest component
  let maxIndex = 0;
  let maxSize = 0;
  components.forEach((comp, idx) => {
    if (comp.length > maxSize) {
      maxSize = comp.length;
      maxIndex = idx;
    }
  });

  // Collect all nodes from all other components
  const smallComponentNodeIds = new Set<string>();
  components.forEach((comp, idx) => {
    if (idx !== maxIndex) {
      comp.forEach(id => smallComponentNodeIds.add(id));
    }
  });

  return smallComponentNodeIds;
};
