#!/usr/bin/env python3
from pathlib import Path

def main():
    p = Path('App.tsx')
    t = p.read_text()

    if 'baobabSharedStorage' not in t:
        needle = "from './services/graphService';"
        if needle not in t:
            raise SystemExit('graphService import not found')
        t = t.replace(
            needle,
            needle + "\nimport { saveSharedExport, loadSharedExport, hasSharedExport, formatSharedSummary } from './services/baobabSharedStorage';",
            1,
        )

    # auto-save on gedcom file select
    old = '''        const data = isGedcomFile ? parseGedcom(content, false) : parseEdgeList(content);
        setGraphData(data);
        const stats = getGraphStats(data);
        setStatusMessage(`נטען בהצלחה: ${file.name} (${stats.peopleCount} אנשים, ${stats.familyCount} משפחות, ${stats.componentsCount} רכיבי קשירות)`);'''
    new = '''        const data = isGedcomFile ? parseGedcom(content, false) : parseEdgeList(content);
        setGraphData(data);
        const stats = getGraphStats(data);
        setStatusMessage(`נטען בהצלחה: ${file.name} (${stats.peopleCount} אנשים, ${stats.familyCount} משפחות, ${stats.componentsCount} רכיבי קשירות`);
        if (isGedcomFile) {
          try {
            saveSharedExport({
              source: 'GedShield',
              filename: file.name,
              gedcom: content,
              meta: { personCount: stats.peopleCount, familyCount: stats.familyCount, title: file.name },
            });
          } catch (_) {}
        }'''
    if old in t and "source: 'GedShield'" not in t:
        t = t.replace(old, new, 1)

    if 'handleLoadShared' not in t:
        marker = '  const handleAnalyze = useCallback(() => {'
        if marker not in t:
            raise SystemExit('handleAnalyze not found')
        handlers = '''  const handleLoadShared = useCallback(() => {
    const shared = loadSharedExport();
    if (!shared?.gedcom) {
      setError('אין נתונים משותפים לטעינה.');
      return;
    }
    setError(null); setAnalysisResult(null); setSelectedNode(null); setAiSummary(null);
    try {
      const content = shared.gedcom;
      setRawFileContent(content);
      setIsGedcom(true);
      const data = parseGedcom(content, false);
      setGraphData(data);
      const stats = getGraphStats(data);
      setStatusMessage(`נטען מהשיתוף: ${shared.filename || 'shared.ged'} (${stats.peopleCount} אנשים)`);
    } catch (err) {
      setError('שגיאה בטעינת הנתונים המשותפים.');
    }
  }, []);

'''
        t = t.replace(marker, handlers + marker, 1)

    if "params.get('baobab')" not in t:
        # insert after handleLoadShared block - before handleAnalyze is ok if handleLoadShared exists
        # place after handleLoadShared definition ends
        effect = '''
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('baobab') === 'shared') {
        handleLoadShared();
        params.delete('baobab');
        const next = params.toString();
        window.history.replaceState({}, '', window.location.pathname + (next ? '?' + next : '') + window.location.hash);
      }
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

'''
        marker2 = '  const handleAnalyze = useCallback(() => {'
        if 'handleLoadShared' in t and marker2 in t:
            t = t.replace(marker2, effect + marker2, 1)

    p.write_text(t)
    print('size', p.stat().st_size)
    print('import', 'baobabSharedStorage' in t)
    print('load', 'handleLoadShared' in t)
    print('autoload', "params.get('baobab')" in t)

if __name__ == '__main__':
    main()
