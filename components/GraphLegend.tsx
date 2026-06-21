import React from 'react';
import { translations } from '../locales';

interface GraphLegendProps {
    isGedcom: boolean;
    isAdvancedMode: boolean;
    hasCommunities?: boolean;
    lang: 'he' | 'en';
}

const GraphLegend: React.FC<GraphLegendProps> = ({ isGedcom, isAdvancedMode, hasCommunities, lang }) => {
    const t = translations[lang];

    // Tailored legend specific to the Family Tree Editor and Staging statuses:
    const items = [
        { type: 'color', color: '#3b82f6', label: t.legendMale },
        { type: 'color', color: '#f472b6', label: t.legendFemale },
        { type: 'shape-x', color: '#ef4444', label: t.legendPendingDelete },
        { type: 'shape-hollow', color: '#3b82f6', label: t.legendPendingAnon },
        { type: 'color', color: '#ec4899', label: t.legendSelected },
        { type: 'color', color: 'rgba(56, 189, 248, 0.9)', label: t.legendParentChildLink },
        { type: 'color', color: 'rgba(249, 115, 22, 0.9)', label: t.legendMarriageLink },
    ];

    return (
        <div 
            className={`absolute top-4 ${lang === 'he' ? 'right-4 text-right' : 'left-4 text-left'} bg-gray-950/90 backdrop-blur-md p-4 rounded-xl border border-gray-800 shadow-2xl z-10`} 
            dir={lang === 'he' ? 'rtl' : 'ltr'}
        >
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-800 pb-1.5">{t.legendTitle}</h4>
            <div className="flex flex-col gap-2">
                {items.map(item => (
                    <div key={item.label} className="flex items-center gap-2.5">
                        {item.type === 'shape-x' ? (
                            <div className="w-3.5 h-3.5 flex items-center justify-center text-[10px] font-black text-red-500 bg-transparent border border-red-900/30">✕</div>
                        ) : item.type === 'shape-hollow' ? (
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-400 bg-transparent"></div>
                        ) : (
                            <div className="w-3.5 h-3.5 rounded-sm shadow-inner border border-gray-800/40" style={{ background: item.color }}></div>
                        )}
                        <span className="text-[10px] text-gray-300 font-bold">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GraphLegend;
