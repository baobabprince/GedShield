#!/usr/bin/env python3
from pathlib import Path
import re

def main():
    p = Path('App.tsx')
    t = p.read_text()

    # Replace weak auto-load effect with delayed + status feedback
    pattern = re.compile(
        r"useEffect\(\(\) => \{\s*try \{\s*const params = new URLSearchParams\(window\.location\.search\);\s*if \(params\.get\('baobab'\) === 'shared'\) \{\s*handleLoadShared\(\);.*?}, \[\]\);",
        re.S,
    )
    better = '''useEffect(() => {
    let cancelled = false;
    const run = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('baobab') !== 'shared') return;
        const shared = loadSharedExport();
        if (!shared?.gedcom) {
          setStatusMessage('אין נתונים משותפים לטעינה. שמרו מתוך ענפים ואז פתחו שוב.');
          return;
        }
        if (cancelled) return;
        handleLoadShared();
        params.delete('baobab');
        const next = params.toString();
        window.history.replaceState({}, '', window.location.pathname + (next ? '?' + next : '') + window.location.hash);
      } catch (e) {
        console.error(e);
        setStatusMessage('טעינה מהשיתוף נכשלה');
      }
    };
    // Defer so state hooks and parse are ready
    const id = window.setTimeout(run, 50);
    return () => { cancelled = true; window.clearTimeout(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);'''

    if pattern.search(t):
        t = pattern.sub(better, t, count=1)
        print('replaced effect')
    elif "params.get('baobab')" not in t:
        raise SystemExit('no baobab effect found')
    else:
        print('effect present, trying soft improve')
        if 'window.setTimeout(run, 50)' not in t:
            # insert after handleLoadShared definition
            if better not in t and "params.get('baobab')" in t:
                # remove existing simple effect blocks
                t2 = re.sub(
                    r"\n  useEffect\(\(\) => \{\n    try \{\n      const params = new URLSearchParams\(window\.location\.search\);\n      if \(params\.get\('baobab'\) === 'shared'\) \{.*?}, \[\]\);\n",
                    '\n',
                    t,
                    flags=re.S,
                )
                marker = '  const handleAnalyze = useCallback(() => {'
                if marker in t2:
                    t = t2.replace(marker, better + '\n\n' + marker, 1)
                    print('reinserted hardened effect')
                else:
                    t = t2

    p.write_text(t)
    print('ok', p.stat().st_size)

if __name__ == '__main__':
    main()
