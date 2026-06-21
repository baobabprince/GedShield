import React, { useRef, useState, useMemo } from 'react';
import { AnalysisResult, NodeObject, GraphData } from '../types';
import { getSmallComponentNodeIds } from '../services/graphService';
import Button from './ui/Button';
import Card from './ui/Card';
import Spinner from './ui/Spinner';
import SampleDataSelector from './SampleDataSelector';
import { 
  UploadIcon, 
  SearchIcon, 
  SparklesIcon, 
  UsersIcon, 
  XCircleIcon, 
  TrashIcon, 
  EyeOffIcon, 
  RefreshIcon
} from './ui/Icons';
import { Trash2, EyeOff, X, Check, Users, ShieldAlert, Award, FileText, Download, Layers } from 'lucide-react';
import { translations } from '../locales';

interface ControlPanelProps {
  onFileSelect: (file: File) => void;
  onSampleSelect: (content: string, type: 'ged' | 'txt', name: string) => void;
  analysisResult: AnalysisResult | null;
  hasGraphData: boolean;
  graphData: GraphData | null;
  selectedNode: NodeObject | null;
  onNodeSelect: (node: NodeObject) => void;
  onClearSelection: () => void;
  isGedcom: boolean;
  onGenerateAiInsights: () => void;
  aiSummary: string | null;
  isGeneratingAi: boolean;
  isLightMode?: boolean;
  lang: 'he' | 'en';

  // Staging Props
  pendingDeletions: Set<string>;
  pendingAnonymizations: Set<string>;
  onStageDeletion: (ids: Set<string> | string) => void;
  onStageAnonymization: (ids: Set<string> | string) => void;
  onUnstageNodes: (ids: Set<string> | string) => void;
  onClearStaged: () => void;
  onApplyPendingChanges: () => void;
  onStageDeleteBranch: (nodeId: string, direction: 'descendants' | 'ancestors') => void;
  onStageAnonymizeBranch: (nodeId: string, direction: 'descendants' | 'ancestors') => void;

  // Undo support
  canUndo: boolean;
  onUndo: () => void;
  onExportGedcom?: () => void;
  onToggleDeceased?: (nodeId: string) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  onFileSelect, 
  onSampleSelect, 
  analysisResult, 
  hasGraphData, 
  graphData,
  selectedNode, 
  onNodeSelect, 
  onClearSelection,
  isGedcom, 
  onGenerateAiInsights, 
  aiSummary, 
  isGeneratingAi,
  pendingDeletions,
  pendingAnonymizations,
  onStageDeletion,
  onStageAnonymization,
  onUnstageNodes,
  onClearStaged,
  onApplyPendingChanges,
  onStageDeleteBranch,
  onStageAnonymizeBranch,
  canUndo,
  onUndo,
  onExportGedcom,
  onToggleDeceased,
  isLightMode = false,
  lang
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const t = translations[lang];

  // Node Search helper
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim() || !graphData) return [];
    const query = searchQuery.toLowerCase();
    return graphData.nodes
      .filter(node => 
        (node.name && node.name.toLowerCase().includes(query)) || 
        node.id.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [searchQuery, graphData]);

  // Find family connections of the currently selected member for nice sidebar navigation!
  const connections = useMemo(() => {
    if (!selectedNode || !graphData) return { parents: [], spouses: [], children: [] };
    
    const nodeMap = new Map<string, NodeObject>(graphData.nodes.map(n => [n.id, n]));
    const parents: NodeObject[] = [];
    const spouses: NodeObject[] = [];
    const children: NodeObject[] = [];

    graphData.links.forEach(link => {
      const sId = typeof link.source === 'object' ? (link.source as any).id : link.source;
      const tId = typeof link.target === 'object' ? (link.target as any).id : link.target;

      if (link.type === 'parent-child') {
        // Child is target, parent is source
        if (tId === selectedNode.id) {
          const parent = nodeMap.get(sId);
          if (parent) parents.push(parent);
        } else if (sId === selectedNode.id) {
          const child = nodeMap.get(tId);
          if (child) children.push(child);
        }
      } else if (link.type === 'marriage') {
        if (sId === selectedNode.id) {
          const spouse = nodeMap.get(tId);
          if (spouse) spouses.push(spouse);
        } else if (tId === selectedNode.id) {
          const spouse = nodeMap.get(sId);
          if (spouse) spouses.push(spouse);
        }
      }
    });

    return { parents, spouses, children };
  }, [selectedNode, graphData]);

  const hasPendingChanges = pendingDeletions.size > 0 || pendingAnonymizations.size > 0;

  return (
    <Card 
      className={`flex flex-col h-full max-h-full overflow-hidden shadow-2xl transition-colors duration-200 border-gray-800 ${
        isLightMode ? 'bg-white border-gray-200 text-gray-800' : 'bg-gray-900 border-gray-800 text-gray-200'
      }`} 
      dir={lang === 'he' ? 'rtl' : 'ltr'}
    >
      {/* File Action Controls */}
      <div className={`p-4 border-b flex-shrink-0 ${isLightMode ? 'border-gray-200 bg-gray-50' : 'border-gray-800 bg-gray-950/60'}`}>
        <div className="flex flex-col gap-2.5">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])} 
            className="hidden" 
            accept=".ged,.txt" 
          />
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            icon={<UploadIcon className="w-4 h-4" />}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold w-full rounded-xl transition-all shadow-md active:scale-98"
          >
            {t.loadGedcomFile}
          </Button>

          {hasGraphData && onExportGedcom && (
            <Button 
              onClick={onExportGedcom} 
              icon={<Download className="w-4 h-4 text-emerald-400" />}
              className={`font-black w-full rounded-xl transition-all shadow-md active:scale-98 border ${
                isLightMode 
                  ? 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-emerald-500' 
                  : 'bg-gray-850 hover:bg-gray-800 border-gray-800 hover:border-emerald-500/50 text-gray-250 hover:text-white'
              }`}
            >
              {t.exportGedcomFile}
            </Button>
          )}

          {hasGraphData && (
            <div className="relative mt-1">
              <div className={`absolute inset-y-0 ${lang === 'he' ? 'right-3' : 'left-3'} flex items-center pointer-events-none`}>
                <SearchIcon className="h-4 w-4 text-gray-500" />
              </div>
              <input
                type="text"
                className={`block w-full py-2 border rounded-xl focus:ring-1 focus:ring-cyan-500 text-xs font-bold transition-all ${
                  lang === 'he' ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
                } ${
                  isLightMode 
                    ? 'border-gray-350 bg-gray-50 text-gray-800 placeholder-gray-500' 
                    : 'border-gray-800 bg-gray-950 text-gray-200 placeholder-gray-600'
                }`}
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && filteredNodes.length > 0 && (
                <div className={`absolute mt-1.5 w-full border rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.4)] z-50 overflow-hidden divide-y ${
                  isLightMode 
                    ? 'bg-white border-gray-200 divide-gray-100' 
                    : 'bg-gray-950 border-gray-800 divide-gray-900'
                }`}>
                  {filteredNodes.map(node => (
                    <button 
                      key={node.id} 
                      className={`w-full px-4 py-2 text-xs font-semibold hover:bg-cyan-950/20 hover:text-cyan-400 truncate block transition-all ${
                        lang === 'he' ? 'text-right' : 'text-left'
                      } ${
                        isLightMode ? 'text-gray-700' : 'text-gray-400'
                      }`}
                      onClick={() => { onNodeSelect(node); setSearchQuery(''); }}
                    >
                      {node.name || node.id}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!hasGraphData && <SampleDataSelector onSelect={onSampleSelect} lang={lang} />}
        </div>
      </div>

      {/* Main Stats and Pending Staging lists */}
      <div className={`flex-grow flex flex-col min-h-0 overflow-y-auto p-4 space-y-5 custom-scrollbar touch-pan-y ${
        lang === 'he' ? 'text-right' : 'text-left'
      }`}>

        {/* 1. SELECTED FAMILY MEMBER DETAILS PANEL */}
        {selectedNode && selectedNode.type === 'person' && (
          <div className="animate-in slide-in-from-top-3 duration-200">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <span>{t.memberDetailsTitle}</span>
              </span>
              <button 
                onClick={onClearSelection} 
                className="text-gray-500 hover:text-gray-400 transition-colors p-1"
                title={t.closeMemberDetails}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className={`p-3.5 rounded-2xl border shadow-inner ${
              isLightMode ? 'bg-cyan-50/20 border-cyan-100' : 'bg-cyan-950/20 border-cyan-900/40'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-extrabold text-cyan-500 truncate text-sm">
                  {selectedNode.name || selectedNode.id}
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${selectedNode.gender === 'F' ? 'bg-pink-900/30 text-pink-400 border border-pink-900/50' : 'bg-blue-900/30 text-blue-400 border border-blue-900/50'}`}>
                  {selectedNode.gender === 'F' ? t.genderFemale : t.genderMale}
                </span>
              </div>

              <div className={`flex items-center justify-between mb-3 text-xs p-2 rounded-xl border ${
                isLightMode ? 'bg-cyan-50/40 border-cyan-100/50' : 'bg-cyan-950/45 border-cyan-900/20'
              }`}>
                <span className="text-[10px] font-bold text-cyan-500">{t.lifeStatus}:</span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-black ${selectedNode.isDeceased ? 'text-red-400' : 'text-emerald-400'}`}>
                    {selectedNode.isDeceased ? t.statusDeceased : t.statusAlive}
                  </span>
                  {onToggleDeceased && (
                    <button 
                      onClick={() => onToggleDeceased(selectedNode.id)}
                      className="bg-cyan-900/50 hover:bg-cyan-800/70 border border-cyan-800 text-[9px] px-2 py-0.5 rounded-lg font-black text-cyan-200 transition-all active:scale-95 shadow-sm cursor-pointer"
                    >
                      {t.changeStatus}
                    </button>
                  )}
                </div>
              </div>

              {/* STAGING TOGGLES FOR INDIVIDUAL SELECTED NODE */}
              <div className="mt-3.5 grid grid-cols-2 gap-2 border-t pt-3 border-cyan-950/20">
                {pendingDeletions.has(selectedNode.id) ? (
                  <button
                    onClick={() => onUnstageNodes(selectedNode.id)}
                    className="flex justify-center items-center gap-1.5 bg-gray-800 hover:bg-gray-750 text-gray-300 p-2 rounded-xl text-[10px] font-bold border border-gray-700 transition-all cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>{t.cancelDelete}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onStageDeletion(selectedNode.id)}
                    className="flex justify-center items-center gap-1.5 bg-red-950/40 hover:bg-red-950/60 text-red-400 p-2 rounded-xl text-[10px] font-bold border border-red-900/40 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                    <span>{t.markForDelete}</span>
                  </button>
                )}

                {pendingAnonymizations.has(selectedNode.id) ? (
                  <button
                    onClick={() => onUnstageNodes(selectedNode.id)}
                    className="flex justify-center items-center gap-1.5 bg-gray-800 hover:bg-gray-750 text-gray-300 p-2 rounded-xl text-[10px] font-bold border border-gray-700 transition-all cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>{t.cancelAnonymization}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onStageAnonymization(selectedNode.id)}
                    className="flex justify-center items-center gap-1.5 bg-amber-950/40 hover:bg-amber-950/60 text-amber-400 p-2 rounded-xl text-[10px] font-bold border border-amber-900/40 transition-all cursor-pointer"
                  >
                    <EyeOff className="w-3 h-3 text-amber-500" />
                    <span>{t.markForAnonymization}</span>
                  </button>
                )}

                {/* Advanced group staging selection */}
                <div className="col-span-2 mt-2.5 pt-2.5 border-t border-cyan-950/25 grid grid-cols-2 gap-1.5">
                  <span className={`col-span-2 text-[9px] font-black text-gray-500`}>
                    {t.groupStagingTitle}:
                  </span>
                  
                  <button
                    onClick={() => onStageDeleteBranch(selectedNode.id, 'descendants')}
                    className="flex justify-center items-center gap-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400/90 text-[9px] font-bold p-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <span>{t.descendantsGroup}</span>
                  </button>
                  <button
                    onClick={() => onStageDeleteBranch(selectedNode.id, 'ancestors')}
                    className="flex justify-center items-center gap-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400/90 text-[9px] font-bold p-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <span>{t.ancestorsGroup}</span>
                  </button>

                  <button
                    onClick={() => onStageAnonymizeBranch(selectedNode.id, 'descendants')}
                    className="flex justify-center items-center gap-1.5 bg-amber-950/20 hover:bg-amber-950/40 border border-amber-900/30 text-amber-400/90 text-[9px] font-bold p-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <span>{t.descendantsAnonymizeGroup}</span>
                  </button>
                  <button
                    onClick={() => onStageAnonymizeBranch(selectedNode.id, 'ancestors')}
                    className="flex justify-center items-center gap-1.5 bg-amber-950/20 hover:bg-amber-950/40 border border-amber-900/30 text-amber-400/90 text-[9px] font-bold p-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <span>{t.ancestorsAnonymizeGroup}</span>
                  </button>
                </div>
              </div>

              {/* FAMILY LINKS NAVIGATION */}
              <div className="mt-3.5 space-y-2 border-t pt-3 border-cyan-950/25">
                {connections.parents.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-gray-500 font-bold">{t.parents}:</span>
                    <div className="flex flex-wrap gap-1">
                      {connections.parents.map(parent => (
                        <button
                          key={parent.id}
                          onClick={() => onNodeSelect(parent)}
                          className={`text-[9px] px-2 py-0.5 rounded-lg hover:underline text-cyan-400 border cursor-pointer ${
                            isLightMode ? 'bg-gray-50 border-gray-200' : 'bg-gray-900 border-gray-800'
                          }`}
                        >
                          {parent.name || parent.id}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {connections.spouses.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-gray-500 font-bold">{t.spouse}:</span>
                    <div className="flex flex-wrap gap-1">
                      {connections.spouses.map(spouse => (
                        <button
                          key={spouse.id}
                          onClick={() => onNodeSelect(spouse)}
                          className={`text-[9px] px-2 py-0.5 rounded-lg hover:underline text-orange-400 border cursor-pointer ${
                            isLightMode ? 'bg-gray-50 border-gray-200' : 'bg-gray-900 border-gray-800'
                          }`}
                        >
                          {spouse.name || spouse.id}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {connections.children.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-gray-500 font-bold">{t.children}:</span>
                    <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto custom-scrollbar">
                      {connections.children.map(child => (
                        <button
                          key={child.id}
                          onClick={() => onNodeSelect(child)}
                          className={`text-[9px] px-2 py-0.5 rounded-lg hover:underline text-cyan-400 border cursor-pointer ${
                            isLightMode ? 'bg-gray-50 border-gray-200' : 'bg-gray-900 border-gray-800'
                          }`}
                        >
                          {child.name || child.id}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BULK PRIVACY & CLEANUP CARD */}
        {hasGraphData && graphData && (
          <div className={`border rounded-2xl p-4 space-y-4 transition-colors ${
            isLightMode ? 'bg-gray-50/50 border-gray-200' : 'bg-gray-950/40 border-gray-800/80 hover:border-gray-750'
          }`}>
            <span className="text-xs font-black flex items-center gap-1.5 border-b pb-2 border-gray-800/30">
              <Layers className="w-4 h-4 text-cyan-500" />
              <span>{t.bulkActionsTitle}</span>
            </span>

            {/* 1. DISCONNECTED COMPONENTS (MINOR ORPHANS) CLEANUP */}
            <div className="space-y-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-black">{t.splitComponentsTitle}:</span>
                <span className={`text-[10px] leading-relaxed ${isLightMode ? 'text-gray-600' : 'text-gray-550'}`}>
                  {t.splitComponentsDesc}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const smallCompIds = getSmallComponentNodeIds(graphData);
                    if (smallCompIds.size > 0) {
                      onStageDeletion(smallCompIds);
                    }
                  }}
                  className="bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 text-[10px] py-1.5 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm text-center cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{t.cleanupSplit}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const smallCompIds = getSmallComponentNodeIds(graphData);
                    if (smallCompIds.size > 0) {
                      onStageAnonymization(smallCompIds);
                    }
                  }}
                  className="bg-amber-950/20 hover:bg-amber-950/40 border border-amber-900/30 text-amber-400 text-[10px] py-1.5 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm text-center cursor-pointer"
                >
                  <EyeOff className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{t.anonymizeSplit}</span>
                </button>
              </div>
            </div>

            {/* 2. LIVING PEOPLE BULK OPTIONS */}
            <div className={`space-y-2 pt-2.5 border-t ${isLightMode ? 'border-gray-200' : 'border-gray-800/50'}`}>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-black">{t.livingPeopleTitle}:</span>
                <span className={`text-[10px] leading-relaxed ${isLightMode ? 'text-gray-600' : 'text-gray-550'}`}>
                  {t.livingPeopleDesc}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const livingIds = graphData.nodes
                      .filter(n => (n.type === 'person' || !n.type) && !n.isDeceased)
                      .map(n => n.id);
                    if (livingIds.length > 0) {
                      onStageDeletion(new Set(livingIds));
                    }
                  }}
                  className="bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 text-[10px] py-1.5 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm text-center cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{t.markLivingDelete}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const livingIds = graphData.nodes
                      .filter(n => (n.type === 'person' || !n.type) && !n.isDeceased)
                      .map(n => n.id);
                    if (livingIds.length > 0) {
                      onStageAnonymization(new Set(livingIds));
                    }
                  }}
                  className="bg-amber-950/20 hover:bg-amber-950/40 border border-amber-900/30 text-amber-400 text-[10px] py-1.5 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm text-center cursor-pointer"
                >
                  <EyeOff className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{t.markLivingAnonymize}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. PLANNED ACTIONS / STAGING CONTROL PANEL SECTION */}
        <div className={`border rounded-2xl p-4 ${isLightMode ? 'bg-gray-50 border-gray-200' : 'bg-gray-950/60 border-gray-800'}`}>
          <div className="flex justify-between items-center mb-3 flex-wrap gap-1.5">
            <span className="text-xs font-black flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-cyan-500" />
              <span>{t.plannedChangesTitle}</span>
            </span>
            <div className="flex items-center gap-2">
              {canUndo && (
                <button 
                  onClick={onUndo}
                  className="text-[10px] bg-red-900/40 hover:bg-red-800/60 text-red-350 font-extrabold px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                >
                  {t.restoreUndo}
                </button>
              )}
              {hasPendingChanges && (
                <button 
                  onClick={onClearStaged}
                  className={`text-[10px] px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    isLightMode ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
                  }`}
                >
                  {t.clearAll}
                </button>
              )}
            </div>
          </div>

          {hasPendingChanges ? (
            <div className="space-y-4">
              {/* DELETIONS STAGE VIEW */}
              {pendingDeletions.size > 0 && (
                <div className="space-y-1.5">
                  <div className={`flex items-center gap-1 text-[10px] font-bold text-red-400 border-s-2 ps-1.5`}>
                    <span>{t.pendingDeletions} ({pendingDeletions.size})</span>
                  </div>
                  <div className="max-h-28 overflow-y-auto custom-scrollbar flex flex-col gap-1 px-1">
                    {Array.from(pendingDeletions).map(id => {
                      const node = graphData?.nodes.find(n => n.id === id);
                      const displayName = node?.name || id;
                      return (
                        <div key={id} className={`flex justify-between items-center px-2 py-1.5 rounded-lg text-[10px] font-semibold text-gray-300 border ${
                          isLightMode ? 'bg-red-50/50 border-red-100Text text-gray-700' : 'bg-red-950/10 border-red-900/20 text-gray-300'
                        }`}>
                          <span className="truncate max-w-[140px] text-red-400 font-bold">{displayName}</span>
                          <button 
                            onClick={() => onUnstageNodes(id)}
                            className="text-gray-500 hover:text-gray-400 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ANONYMIZATIONS STAGE VIEW */}
              {pendingAnonymizations.size > 0 && (
                <div className="space-y-1.5">
                  <div className={`flex items-center gap-1 text-[10px] font-bold text-amber-500 border-s-2 ps-1.5`}>
                    <span>{t.pendingAnonymizations} ({pendingAnonymizations.size})</span>
                  </div>
                  <div className="max-h-28 overflow-y-auto custom-scrollbar flex flex-col gap-1 px-1">
                    {Array.from(pendingAnonymizations).map(id => {
                      const node = graphData?.nodes.find(n => n.id === id);
                      const displayName = node?.name || id;
                      return (
                        <div key={id} className={`flex justify-between items-center px-2 py-1.5 rounded-lg text-[10px] font-semibold border ${
                          isLightMode ? 'bg-amber-50/50 border-amber-100 text-gray-700' : 'bg-amber-950/10 border-amber-900/20 text-gray-300'
                        }`}>
                          <span className="truncate max-w-[140px] text-amber-500 font-bold">{displayName}</span>
                          <button 
                            onClick={() => onUnstageNodes(id)}
                            className="text-gray-500 hover:text-gray-400 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STAGING COMMIT CONTROLLER BUTTON */}
              <div className={`pt-2 border-t ${isLightMode ? 'border-gray-200' : 'border-gray-800'}`}>
                <button
                  onClick={onApplyPendingChanges}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-[0_4px_15px_rgba(16,185,129,0.25)] transition-all hover:scale-[1.01] active:scale-95 duration-100 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{t.applyChanges}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className={`py-5 text-center flex flex-col items-center justify-center border rounded-xl ${
              isLightMode ? 'border-gray-200 bg-white' : 'border-gray-800/40 bg-gray-900/40'
            }`}>
              <ShieldAlert className="w-6 h-6 text-gray-500 mb-1.5" />
              <p className="text-[10px] font-bold text-gray-500 max-w-[200px] leading-relaxed px-2">
                {t.noPendingChanges}
              </p>
            </div>
          )}
        </div>

        {/* 3. HUMAN FAMILY STRUCTURE & SUMMARY STATS ONLY */}
        {analysisResult && (
          <div className="space-y-3.5">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-s-2 ps-2 border-gray-700">
              {t.pedigreeSummaryTitle}
            </h4>
            <div className={`rounded-2xl p-3.5 border divide-y text-xs ${
              isLightMode 
                ? 'bg-gray-50 border-gray-200 divide-gray-150 text-gray-700' 
                : 'bg-gray-950/40 border-gray-800/60 divide-gray-800/40 text-gray-300'
            }`}>
              
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500 font-bold">{t.totalMembers}:</span>
                <span className="font-extrabold">{analysisResult.nodeCount}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500 font-bold">{t.relationships}:</span>
                <span className="font-extrabold">{analysisResult.edgeCount}</span>
              </div>

              {analysisResult.maxGenerationalDepth && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-500 font-bold">{t.maxGenerations}:</span>
                  <span className="font-extrabold">{analysisResult.maxGenerationalDepth} {t.generations}</span>
                </div>
              )}

              {analysisResult.averageBranchingFactor && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-500 font-bold">{t.avgChildren}:</span>
                  <span className="text-cyan-500 font-bold">{analysisResult.averageBranchingFactor} {t.avgChildrenSuffix}</span>
                </div>
              )}

              {analysisResult.surnameDiversity && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-500 font-bold">{t.surnameDiversity}:</span>
                  <span className="text-cyan-500 font-bold">{analysisResult.surnameDiversity}</span>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </Card>
  );
};

export default ControlPanel;
