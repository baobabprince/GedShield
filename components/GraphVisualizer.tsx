import React, { useMemo, useRef, useState, useLayoutEffect, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { GraphData, NodeObject, LinkObject, AnalysisResult } from '../types';
import { 
  MousePointer, 
  BoxSelect, 
  Trash2, 
  EyeOff, 
  UserPlus, 
  X, 
  Check, 
  Edit3,
  Users
} from 'lucide-react';
import { translations } from '../locales';

interface GraphVisualizerProps {
  fgRef: React.MutableRefObject<any>;
  graphData: GraphData;
  isLightMode?: boolean;
  onNodeClick: (node: NodeObject) => void;
  onBackgroundClick: () => void;
  hoveredNode: NodeObject | null;
  onNodeHover: (node: NodeObject | null) => void;
  selectedNode: NodeObject | null;
  analysisResult: AnalysisResult | null;
  
  selectedNodeIds: Set<string>;
  setSelectedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  
  // Staging Props
  pendingDeletions: Set<string>;
  pendingAnonymizations: Set<string>;
  onStageDeletion: (ids: Set<string> | string) => void;
  onStageAnonymization: (ids: Set<string> | string) => void;
  onUnstageNodes: (ids: Set<string> | string) => void;
  onStageDeleteBranch: (nodeId: string, direction: 'descendants' | 'ancestors') => void;
  onStageAnonymizeBranch: (nodeId: string, direction: 'descendants' | 'ancestors') => void;
  
  // Undo actions
  onUndo?: () => void;
  canUndo?: boolean;
  
  onAddRelative: (relationshipType: 'parent' | 'spouse' | 'child', targetNodeId: string, name: string, gender: 'M' | 'F') => void;
  onRenameNode: (nodeId: string, name: string) => void;
  lang: 'he' | 'en';
}

const GraphVisualizer: React.FC<GraphVisualizerProps> = ({ 
  fgRef,
  graphData, 
  isLightMode = false,
  onNodeClick, 
  onBackgroundClick,
  hoveredNode,
  onNodeHover,
  selectedNode,
  analysisResult,
  selectedNodeIds,
  setSelectedNodeIds,
  pendingDeletions,
  pendingAnonymizations,
  onStageDeletion,
  onStageAnonymization,
  onUnstageNodes,
  onStageDeleteBranch,
  onStageAnonymizeBranch,
  onUndo,
  canUndo,
  onAddRelative,
  onRenameNode,
  lang
}) => {
  const t = translations[lang];
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Mode state: Navigation vs. Box Selection
  const [boxSelectMode, setBoxSelectMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });

  // Rename individual node states
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');

  // Add family relative states
  const [addingRelativeType, setAddingRelativeType] = useState<'parent' | 'spouse' | 'child' | null>(null);
  const [relativeName, setRelativeName] = useState('');
  const [relativeGender, setRelativeGender] = useState<'M' | 'F'>('M');

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const {highlightNodes, highlightLinks} = useMemo(() => {
    const highlightNodes = new Set();
    const highlightLinks = new Set();
    
    // Auto-highlight active node IDs in box select/multi selection
    selectedNodeIds.forEach(id => highlightNodes.add(id));

    const nodeToInspect = hoveredNode || selectedNode;

    if (nodeToInspect) {
      highlightNodes.add(nodeToInspect.id);
      graphData.links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? (link.source as NodeObject).id : link.source;
        const targetId = typeof link.target === 'object' ? (link.target as NodeObject).id : link.target;
        if (sourceId === nodeToInspect.id || targetId === nodeToInspect.id) {
          highlightLinks.add(link);
          highlightNodes.add(sourceId);
          highlightNodes.add(targetId);
        }
      });
    }

    return { highlightNodes, highlightLinks };

  }, [graphData, hoveredNode, selectedNode, selectedNodeIds]);

  const getLinkColor = (link: LinkObject) => {
    const isHighlighted = highlightLinks.has(link);
    
    let baseColor = isLightMode ? '75, 85, 99' : '107, 114, 128'; // Default Gray
    if (link.type === 'marriage') baseColor = '249, 115, 22'; // Sleek Orange (#f97316)
    else if (link.type === 'parent-child') baseColor = isLightMode ? '2, 132, 199' : '56, 189, 248'; // Dreamy Blue (#38bdf8)
    else if (link.type === 'event_link') baseColor = isLightMode ? '22, 163, 74' : '74, 222, 128'; // Vibrant Green

    const hasSelection = !!hoveredNode || !!selectedNode || selectedNodeIds.size > 0;
    
    if (hasSelection) {
      if (isHighlighted) {
        return `rgba(${baseColor}, 0.95)`;
      }
      // Keep other family connection lines visible with a slightly softer opacity
      const softOpacity = link.type === 'marriage' ? '0.4' : '0.3';
      return `rgba(${baseColor}, ${isLightMode ? '0.2' : softOpacity})`;
    }
    
    return `rgba(${baseColor}, ${link.type === 'marriage' ? '0.85' : '0.65'})`;
  };

  // Handle Box dragging mouse down
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!boxSelectMode) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDragging(true);
    setStartPos({ x, y });
    setCurrentPos({ x, y });
  };

  // Handle Box dragging mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!boxSelectMode || !isDragging) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentPos({ x, y });
  };

  // Handle Box dragging mouse up: calculate final rectangle and query matches
  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const x1 = Math.min(startPos.x, currentPos.x);
    const x2 = Math.max(startPos.x, currentPos.x);
    const y1 = Math.min(startPos.y, currentPos.y);
    const y2 = Math.max(startPos.y, currentPos.y);

    const width = x2 - x1;
    const height = y2 - y1;

    if (width > 2 && height > 2 && fgRef.current) {
      const foundNodeIds: string[] = [];
      graphData.nodes.forEach(node => {
        if (node.x !== undefined && node.y !== undefined) {
          const screenCoords = fgRef.current.graph2ScreenCoords(node.x, node.y);
          if (screenCoords) {
            if (
              screenCoords.x >= x1 &&
              screenCoords.x <= x2 &&
              screenCoords.y >= y1 &&
              screenCoords.y <= y2
            ) {
              foundNodeIds.push(node.id);
            }
          }
        }
      });

      setSelectedNodeIds(prev => {
        const next = new Set<string>();
        foundNodeIds.forEach(id => next.add(id));
        return next;
      });

      if (foundNodeIds.length > 0) {
        const exactNode = graphData.nodes.find(n => n.id === foundNodeIds[0]);
        if (exactNode) onNodeClick(exactNode);
      }
    }
  };

  const activeNode = selectedNode || (selectedNodeIds.size === 1 ? graphData.nodes.find(n => selectedNodeIds.has(n.id)) : null);

  useEffect(() => {
    setAddingRelativeType(null);
    setIsEditingName(false);
  }, [activeNode]);

  return (
    <div 
      ref={containerRef} 
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`w-full h-full relative select-none overflow-hidden ${isLightMode ? 'bg-white' : 'bg-gray-950'} ${boxSelectMode ? 'cursor-crosshair' : 'cursor-pointer'}`}
      dir={lang === 'he' ? 'rtl' : 'ltr'}
    >
      {/* 2D Physics Simulation Network Graph */}
      <ForceGraph2D
        ref={fgRef}
        width={size.width}
        height={size.height}
        graphData={graphData}
        nodeLabel={(node: NodeObject) => {
          const state = pendingDeletions.has(node.id) 
            ? (lang === 'he' ? ' (מיועד למחיקה ❌)' : ' (Pending Deletion ❌)') 
            : pendingAnonymizations.has(node.id) 
              ? (lang === 'he' ? ' (מיועד לאנונימיזציה 👁️)' : ' (Pending Anonymization 👁️)') 
              : '';
          return (node.name || node.id) + state;
        }}
        nodeVal={(node: NodeObject) => {
          if (node.type === 'person' || !node.type) return 8.5;
          return 4.5;
        }}
        linkColor={getLinkColor}
        linkWidth={(link: LinkObject) => highlightLinks.has(link) ? (link.type === 'marriage' ? 2.5 : 2) : 1}
        linkDirectionalParticles={(link: LinkObject) => (highlightLinks.has(link) && link.type !== 'event_link') ? 1.5 : 0}
        linkDirectionalParticleWidth={2.8}
        linkDirectionalParticleColor={(link: LinkObject) => getLinkColor(link)}
        backgroundColor="transparent"
        enableZoomInteraction={!boxSelectMode}
        enablePanInteraction={!boxSelectMode}
        onNodeClick={(node) => {
          if (boxSelectMode) {
            setSelectedNodeIds(prev => {
              const next = new Set(prev);
              if (next.has(node.id)) {
                next.delete(node.id);
              } else {
                next.add(node.id);
              }
              return next;
            });
            onNodeClick(node);
          } else {
            setSelectedNodeIds(new Set([node.id]));
            onNodeClick(node);
          }
        }}
        onNodeHover={onNodeHover}
        onBackgroundClick={() => {
          if (!boxSelectMode) {
            setSelectedNodeIds(new Set());
            onBackgroundClick();
          }
        }}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const isSelected = selectedNodeIds.has(node.id) || (selectedNode && selectedNode.id === node.id);
          const isStagedDel = pendingDeletions.has(node.id);
          const isStagedAnon = pendingAnonymizations.has(node.id);
          
          let label = node.name || node.id;
          if (isStagedDel) label += ' [❌]';
          else if (isStagedAnon) label += ' [👁️]';

          let nodeColor = '#3b82f6'; // default male blue
          if (isSelected) {
            nodeColor = '#ec4899'; // Pink-500
          } else if (node.gender === 'F') {
            nodeColor = '#f472b6'; // Female light pink
          }

          const radius = (node.type === 'person' || !node.type) ? 6 : 4;

          // Drawing circles, hollow circles, or X shape for staging statuses
          if (isStagedDel) {
            // Render as an X Instead of a circle (אנשים מיועדים למחיקה ממתין לסמן ב-X במקום בעיגול)
            const size = radius + 1;
            ctx.beginPath();
            ctx.moveTo((node.x || 0) - size, (node.y || 0) - size);
            ctx.lineTo((node.x || 0) + size, (node.y || 0) + size);
            ctx.moveTo((node.x || 0) + size, (node.y || 0) - size);
            ctx.lineTo((node.x || 0) - size, (node.y || 0) + size);
            ctx.strokeStyle = '#ef4444'; // Red-500
            ctx.lineWidth = 3;
            ctx.stroke();
          } else if (isStagedAnon) {
            // Render as an empty circle with original gender color (סימון אנשים לאנונימיזציה לא בצבע שונה אלא בעיגול ריק)
            ctx.beginPath();
            ctx.arc(node.x || 0, node.y || 0, radius, 0, 2 * Math.PI, false);
            ctx.strokeStyle = nodeColor;
            ctx.lineWidth = 2.5;
            ctx.stroke();
            
            // Fill with a very dark slate color to make it appear empty/hollow
            ctx.fillStyle = isLightMode ? '#ffffff' : '#030712'; // gray-950 dark background color
            ctx.fill();
          } else {
            // Normal solid circle
            ctx.beginPath();
            ctx.arc(node.x || 0, node.y || 0, radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = nodeColor;
            ctx.fill();
          }

          if (isSelected || isStagedDel || isStagedAnon) {
            ctx.beginPath();
            ctx.arc(node.x || 0, node.y || 0, radius + 3, 0, 2 * Math.PI, false);
            ctx.strokeStyle = isStagedDel ? '#ef4444' : (isStagedAnon ? nodeColor : '#ec4899');
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }

          // Drawing Hebrew text names safely on the canvas
          if (globalScale > 0.8) {
            ctx.save();
            const fontSize = 11 / globalScale;
            ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            
            // Text color according to state
            ctx.fillStyle = isStagedDel 
              ? (isLightMode ? '#dc2626' : '#fca5a5') 
              : (isStagedAnon 
                ? (isLightMode ? '#ea580c' : '#fde047') 
                : (isLightMode ? '#111827' : '#e5e7eb'));
            
            // Text shadow background for crisp legibility
            if (isLightMode) {
              ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
              ctx.shadowBlur = 3.5;
            } else {
              ctx.shadowColor = 'rgba(0,0,0,0.85)';
              ctx.shadowBlur = 4;
            }
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 1;

            ctx.fillText(label, node.x || 0, (node.y || 0) + radius + 3.5);
            ctx.restore();
          }
        }}
      />

      {/* Box Selection Overlay dragging frame */}
      {isDragging && (
        <div 
          className="absolute border-2 border-dashed border-pink-500 bg-pink-500/10 pointer-events-none z-30 rounded shadow-[0_0_15px_rgba(236,72,153,0.3)] animate-pulse"
          style={{
            left: Math.min(startPos.x, currentPos.x),
            top: Math.min(startPos.y, currentPos.y),
            width: Math.abs(currentPos.x - startPos.x),
            height: Math.abs(currentPos.y - startPos.y)
          }}
        />
      )}

      {/* Navigation & Selection Toggle control bar */}
      <div 
        className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center bg-gray-900/90 border border-gray-800 backdrop-blur-md px-3 py-2 rounded-full shadow-[0_10px_35px_rgba(0,0,0,0.5)] z-20 gap-2.5"
        dir={lang === 'he' ? 'rtl' : 'ltr'}
      >
        <button
          onClick={() => setBoxSelectMode(false)}
          className={`flex items-center gap-1.5 px-3.5 py-1.3 rounded-full text-xs font-bold tracking-wide transition-all ${!boxSelectMode ? 'bg-cyan-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
          title={t.mapNavigationTooltip}
        >
          <MousePointer className="w-3.5 h-3.5" />
          <span>{t.mapNavigation}</span>
        </button>
        <button
          onClick={() => setBoxSelectMode(true)}
          className={`flex items-center gap-1.5 px-3.5 py-1.3 rounded-full text-xs font-bold tracking-wide transition-all ${boxSelectMode ? 'bg-pink-600 text-white shadow-[0_0_12px_rgba(236,72,153,0.5)]' : 'text-gray-400 hover:text-white'}`}
          title={t.boxSelectTooltip}
        >
          <BoxSelect className="w-3.5 h-3.5" />
          <span>{t.boxSelect}</span>
        </button>

        {(selectedNodeIds.size > 0 || selectedNode) && (
          <>
            <div className="h-4 w-[1px] bg-gray-850" />
            <button
              onClick={() => {
                setSelectedNodeIds(new Set());
                onBackgroundClick();
              }}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-all"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t.clearSelection}</span>
            </button>
          </>
        )}
      </div>

      {/* Bottom sliding dashboard of selected items */}
      {(selectedNodeIds.size > 0 || selectedNode) && (
        <div 
          className="absolute bottom-4 left-4 right-4 bg-gray-950/95 border border-gray-800/80 backdrop-blur-md rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.9)] z-20 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 animate-in slide-in-from-bottom-6 duration-300"
          dir={lang === 'he' ? 'rtl' : 'ltr'}
        >
          {/* MULTI STAGING AREA FOR MULTIPLE SELECTED ITEMS */}
          {selectedNodeIds.size > 1 ? (
            <>
              <div className="flex flex-col gap-0.5 text-start">
                <div className="flex items-center gap-2">
                  <div className="bg-pink-500 animate-pulse w-2 h-2 rounded-full" />
                  <span className="text-white font-black text-xs md:text-sm">{t.multiSelectTitle.replace('{count}', String(selectedNodeIds.size))}</span>
                </div>
                <span className="text-[11px] text-gray-500">{t.multiSelectDesc}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => onStageDeletion(selectedNodeIds)}
                  className="flex items-center gap-1.5 bg-red-900/60 hover:bg-red-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold border border-red-700/50 transition-all active:scale-95 duration-700"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>{t.stageGroupDelete}</span>
                </button>
                <button
                  onClick={() => onStageAnonymization(selectedNodeIds)}
                  className="flex items-center gap-1.5 bg-amber-900/60 hover:bg-amber-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold border border-amber-700/50 transition-all active:scale-95 duration-700"
                >
                  <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t.stageGroupAnon}</span>
                </button>
                <button
                  onClick={() => onUnstageNodes(selectedNodeIds)}
                  className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-xl text-xs font-bold border border-gray-700 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{t.unstageGroup}</span>
                </button>
              </div>
            </>
          ) : (
            /* SINGLE STAGING ENGINE */
            activeNode && (
              <>
                {/* 1. Rename block */}
                <div className="flex flex-col gap-1 text-start border-s-0 xl:border-s border-gray-850 ps-0 xl:ps-5 flex-shrink-0 min-w-[180px]">
                  <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{t.editMemberNameTitle}</span>
                  </span>

                  {isEditingName ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            onRenameNode(activeNode.id, editingName);
                            setIsEditingName(false);
                          } else if (e.key === 'Escape') {
                            setIsEditingName(false);
                          }
                        }}
                        className="bg-gray-900 border border-cyan-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 text-start font-medium max-w-[130px]"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          onRenameNode(activeNode.id, editingName);
                          setIsEditingName(false);
                        }}
                        className="p-1 px-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-all text-xs"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-white font-extrabold text-sm truncate max-w-[130px]">{activeNode.name || activeNode.id}</span>
                      <button
                        onClick={() => {
                          setEditingName(activeNode.name || activeNode.id);
                          setIsEditingName(true);
                        }}
                        className="p-1 text-gray-500 hover:text-cyan-400 transition-all"
                        title={t.renameButton}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Relative Adding Form */}
                {activeNode.type === 'person' && (
                  <div className="flex-grow flex flex-col md:flex-row items-center gap-3 justify-center">
                    {addingRelativeType ? (
                      <div className="flex flex-col sm:flex-row items-center gap-2 bg-gray-900 border border-gray-800 p-2 px-3.5 rounded-xl text-start animate-in zoom-in-95 duration-150">
                        <span className="text-xs text-cyan-400 font-bold me-1 flex items-center gap-1">
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>{addingRelativeType === 'parent' ? t.addParent : addingRelativeType === 'spouse' ? t.addSpouse : t.addChild}:</span>
                        </span>
                        <input
                          type="text"
                          placeholder={t.relationNamePlaceholder}
                          value={relativeName}
                          onChange={(e) => setRelativeName(e.target.value)}
                          className="bg-gray-950 border border-gray-800 text-xs px-2.5 py-1.5 rounded-lg text-white focus:outline-none focus:border-cyan-500 text-start w-[110px]"
                          autoFocus
                        />
                        <div className="flex border border-gray-800 rounded-lg overflow-hidden bg-gray-950">
                          <button
                            type="button"
                            onClick={() => setRelativeGender('M')}
                            className={`px-2 py-1 text-[10px] font-bold ${relativeGender === 'M' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
                          >
                            {t.genderMale}
                          </button>
                          <button
                            type="button"
                            onClick={() => setRelativeGender('F')}
                            className={`px-2 py-1 text-[10px] font-bold ${relativeGender === 'F' ? 'bg-pink-600 text-white' : 'text-gray-500 hover:text-white'}`}
                          >
                            {t.genderFemale}
                          </button>
                        </div>
                        <div className="flex gap-1.5 me-1.5">
                          <button
                            onClick={() => {
                              if (!relativeName.trim()) return;
                              onAddRelative(addingRelativeType, activeNode.id, relativeName, relativeGender);
                              setAddingRelativeType(null);
                              setRelativeName('');
                            }}
                            className="bg-cyan-650 hover:bg-cyan-550 text-white text-[11px] px-3.5 py-1.5 rounded-lg font-bold transition-all"
                          >
                            {t.addRelationButton}
                          </button>
                          <button
                            onClick={() => setAddingRelativeType(null)}
                            className="bg-gray-800 text-gray-400 text-[11px] px-2.5 py-1.5 rounded-lg hover:text-white"
                          >
                            {t.cancelButton}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2" dir={lang === 'he' ? 'rtl' : 'ltr'}>
                        <span className="text-[10px] font-black text-gray-500 flex items-center gap-1">
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>{t.addRelationTitle}:</span>
                        </span>
                        <button
                          onClick={() => {
                            setAddingRelativeType('child');
                            setRelativeGender('M');
                            setRelativeName('');
                          }}
                          className="flex items-center gap-1 bg-cyan-950/40 hover:bg-cyan-900 border border-cyan-800/40 text-cyan-300 px-3 py-1.5 rounded-lg text-xs font-semibold hover:border-cyan-500"
                        >
                          <span>{t.addChild}</span>
                        </button>
                        <button
                          onClick={() => {
                            setAddingRelativeType('spouse');
                            setRelativeGender(activeNode.gender === 'M' ? 'F' : 'M');
                            setRelativeName('');
                          }}
                          className="flex items-center gap-1 bg-cyan-950/40 hover:bg-cyan-900 border border-cyan-800/40 text-cyan-300 px-3 py-1.5 rounded-lg text-xs font-semibold hover:border-cyan-500"
                        >
                          <span>{t.addSpouse}</span>
                        </button>
                        <button
                          onClick={() => {
                            setAddingRelativeType('parent');
                            setRelativeGender('M');
                            setRelativeName('');
                          }}
                          className="flex items-center gap-1 bg-cyan-950/40 hover:bg-cyan-900 border border-cyan-800/40 text-cyan-300 px-3 py-1.5 rounded-lg text-xs font-semibold hover:border-cyan-500"
                        >
                          <span>{t.addParent}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Staging and Branch specific quick actions */}
                <div className="flex flex-wrap items-center gap-2 justify-end">
                  {pendingDeletions.has(activeNode.id) ? (
                    <button
                      onClick={() => onUnstageNodes(activeNode.id)}
                      className="flex items-center gap-1 bg-gray-850 hover:bg-gray-805 text-gray-300 border border-gray-700 font-bold text-xs px-3.5 py-2 rounded-xl"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{t.cancelDelete}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onStageDeletion(activeNode.id)}
                      className="flex items-center gap-1 bg-red-950/45 hover:bg-red-950/70 text-red-400 border border-red-900/40 font-bold text-xs px-3.5 py-2 rounded-xl"
                      title={t.markForDelete}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      <span>{t.markForDelete}</span>
                    </button>
                  )}

                  {pendingAnonymizations.has(activeNode.id) ? (
                    <button
                      onClick={() => onUnstageNodes(activeNode.id)}
                      className="flex items-center gap-1 bg-gray-850 hover:bg-gray-805 text-gray-300 border border-gray-700 font-bold text-xs px-3.5 py-2 rounded-xl"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{t.cancelAnonymization}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onStageAnonymization(activeNode.id)}
                      className="flex items-center gap-1 bg-amber-950/45 hover:bg-amber-950/70 text-amber-400 border border-amber-900/40 font-bold text-xs px-3.5 py-2 rounded-xl"
                      title={t.markForAnonymization}
                    >
                      <EyeOff className="w-3.5 h-3.5 text-amber-500" />
                      <span>{t.markForAnonymization}</span>
                    </button>
                  )}

                  {/* Branch Level Staging shortcut buttons inside active options bar */}
                  <div className="flex flex-col gap-1 pe-2 border-e border-gray-850">
                    <span className="text-[9px] font-black text-gray-500 mb-0.5 text-start">{t.quickBranchStagingDeleteLabel}</span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => onStageDeleteBranch(activeNode.id, 'descendants')}
                        className="flex items-center gap-1 bg-gradient-to-r from-red-950/60 to-red-900/40 text-red-300 border border-red-900/40 font-bold text-[10px] px-2.5 py-1.5 rounded-xl hover:from-red-900/30"
                        title={t.quickStageDescendantsDelete}
                      >
                        <span>{t.quickStageDescendantsDelete}</span>
                      </button>
                      <button
                        onClick={() => onStageDeleteBranch(activeNode.id, 'ancestors')}
                        className="flex items-center gap-1 bg-gradient-to-r from-red-950/60 to-red-900/40 text-red-300 border border-red-900/40 font-bold text-[10px] px-2.5 py-1.5 rounded-xl hover:from-red-900/30"
                        title={t.quickStageAncestorsDelete}
                      >
                        <span>{t.quickStageAncestorsDelete}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 pe-2 border-e border-gray-850">
                    <span className="text-[9px] font-black text-gray-500 mb-0.5 text-start">{t.quickBranchStagingAnonLabel}</span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => onStageAnonymizeBranch(activeNode.id, 'descendants')}
                        className="flex items-center gap-1 bg-gradient-to-r from-amber-950/60 to-amber-900/40 text-amber-300 border border-amber-900/40 font-bold text-[10px] px-2.5 py-1.5 rounded-xl hover:from-amber-900/30"
                        title={t.quickStageDescendantsAnon}
                      >
                        <span>{t.quickStageDescendantsAnon}</span>
                      </button>
                      <button
                        onClick={() => onStageAnonymizeBranch(activeNode.id, 'ancestors')}
                        className="flex items-center gap-1 bg-gradient-to-r from-amber-950/60 to-amber-900/40 text-amber-300 border border-amber-900/40 font-bold text-[10px] px-2.5 py-1.5 rounded-xl hover:from-amber-900/30"
                        title={t.quickStageAncestorsAnon}
                      >
                        <span>{t.quickStageAncestorsAnon}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )
          )}
        </div>
      )}

      {/* Floating Undo notification for immediate screen deletions */}
      {pendingDeletions.size > 0 && onUndo && (
        <div 
          className={`absolute bottom-24 bg-gray-950/95 border border-red-900/40 backdrop-blur-md text-xs text-gray-200 px-4 py-3 rounded-2xl shadow-[0_15px_40px_rgba(239,68,68,0.25)] flex items-center gap-4 z-25 max-w-sm animate-in slide-in-from-bottom-2 duration-300 pointer-events-auto ${lang === 'he' ? 'right-4' : 'left-4'}`}
          dir={lang === 'he' ? 'rtl' : 'ltr'}
        >
          <div className="flex flex-col text-start">
            <span className="font-extrabold text-red-400">{t.floatingUndoTitle.replace('{count}', String(pendingDeletions.size))}</span>
            <span className="text-[10px] text-gray-400">{t.floatingUndoDesc}</span>
          </div>
          <button 
            onClick={onUndo}
            className="flex items-center gap-1.5 bg-red-650 hover:bg-red-550 text-white font-extrabold text-xs px-3 py-1.8 rounded-xl transition-all active:scale-95 shadow-md"
            title={t.floatingUndoButton}
          >
            <span>{t.floatingUndoButton}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default GraphVisualizer;
