
import { GraphData, NodeObject, LinkObject } from '../types';

const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const exportToJson = (graphData: GraphData, fileName: string = 'graph-export.json') => {
    const content = JSON.stringify(graphData, null, 2);
    downloadFile(content, fileName, 'application/json');
};

export const exportToEdgeListCsv = (graphData: GraphData, fileName: string = 'edges-export.csv') => {
    let csv = 'Source,Target,Type,Label\n';
    graphData.links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? (link.source as NodeObject).id : link.source;
        const targetId = typeof link.target === 'object' ? (link.target as NodeObject).id : link.target;
        csv += `"${sourceId}","${targetId}","${link.type || ''}","${link.label || ''}"\n`;
    });
    downloadFile(csv, fileName, 'text/csv');
};

export const exportToNodeListCsv = (graphData: GraphData, fileName: string = 'nodes-export.csv') => {
    let csv = 'Id,Name,Type\n';
    graphData.nodes.forEach(node => {
        csv += `"${node.id}","${node.name || ''}","${node.type || ''}"\n`;
    });
    downloadFile(csv, fileName, 'text/csv');
};
