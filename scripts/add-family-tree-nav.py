#!/usr/bin/env python3
from pathlib import Path

BTN = '''              <a
                href="https://baobabprince.github.io/anafim/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-2.5 py-1.5 rounded-md border border-[#e7e8e0] bg-[#fefefb] text-[#456352] font-semibold hover:bg-[#edf1e9] transition-colors no-underline"
                title={lang === 'he' ? 'פתיחת אותו אילן במבט משפחתי' : 'Open the same tree in family view'}
              >
                {lang === 'he' ? 'אילן המשפחה' : 'Family tree'}
              </a>
'''

def main():
    p = Path('App.tsx')
    t = p.read_text()
    if 'אילן המשפחה' in t:
        print('already')
        return
    # Place before language toggle in header — search for Switch to English title
    needle = 'title={lang === \'he\' ? "Switch to English" : "עבור לעברית"}'
    if needle not in t:
        needle = "Switch to English"
        if needle not in t:
            raise SystemExit('lang button not found')
        idx = t.find(needle)
        start = t.rfind('<button', 0, idx)
        t = t[:start] + BTN + t[start:]
    else:
        idx = t.find(needle)
        start = t.rfind('<button', 0, idx)
        t = t[:start] + BTN + t[start:]
    p.write_text(t)
    print('ok')

if __name__ == '__main__':
    main()
