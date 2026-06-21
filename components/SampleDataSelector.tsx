import React from 'react';
import { sampleData, Sample } from '../services/sampleData';
import { PlayCircleIcon } from './ui/Icons';
import { translations } from '../locales';

interface SampleDataSelectorProps {
    onSelect: (content: string, type: 'ged' | 'txt', name: string) => void;
    lang: 'he' | 'en';
}

const SampleDataSelector: React.FC<SampleDataSelectorProps> = ({ onSelect, lang }) => {
    const t = translations[lang];

    const getSampleName = (originalName: string) => {
        if (originalName.includes('המלוכה') || originalName.includes('Royal')) {
            return t.sampleRoyal;
        }
        if (originalName.includes('הקראטה') || originalName.includes('Karate')) {
            return lang === 'he' ? 'מועדון הקראטה (TXT - זיהוי קהילות)' : "Karate Club Network (TXT - Communities)";
        }
        if (originalName.includes('פלורנטיניות') || originalName.includes('Florentine')) {
            return lang === 'he' ? 'משפחות פלורנטיניות (TXT - מרכזיות)' : "Florentine Families Network (TXT - Centrality)";
        }
        return originalName;
    };

    return (
        <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black text-gray-500 mb-1">
                {t.chooseSampleTitle}
            </span>
            {sampleData.map((sample: Sample) => (
                <button
                    key={sample.name}
                    onClick={() => onSelect(sample.content, sample.type, getSampleName(sample.name))}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-cyan-200 bg-gray-700 bg-opacity-30 rounded-md hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 transition-colors duration-200 ${
                        lang === 'he' ? 'justify-start text-right' : 'justify-start text-left'
                    }`}
                >
                    <PlayCircleIcon className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate">{getSampleName(sample.name)}</span>
                </button>
            ))}
        </div>
    );
};

export default SampleDataSelector;