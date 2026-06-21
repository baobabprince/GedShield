# GedShield 🛡️ — Privacy Shield & Interactive Topology Analyzer for Family Trees (GEDCOM)
### עורך, מנתח טופולוגי מקיף ומגן פרטיות מתקדם לעצי משפחה (GEDCOM)

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Web_Workers-000000?style=for-the-badge&logo=javascript&logoColor=yellow" alt="Web Workers" />
  <img src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white" alt="GitHub Actions" />
</p>

---

## 📖 Overview | סקירה כללית
**GedShield** is a premium, privacy-oriented, interactive genealogy management platform designed to parse, edit, anonymize, and analyze standard **GEDCOM (`.ged`)** files entirely in the browser. 

Genealogical datasets often contain sensitive, identifiable data of living relatives. GedShield provides an intuitive interface to visualize your family tree as an interactive, hardware-accelerated graph, select and edit specific members, perform bulk privacy classifications (like GDPR-compliant anonymization or deletion of living members and disconnected branches), and export correct, valid GEDCOM files. It also runs intensive graph-theoretical algorithms inside a background **Web Worker** to extract deep structural and generational metrics.

---

## 🌟 Core Features | תכונות מרכזיות

### 1. 📂 File Import & Robust Export | טעינה ויצוא של GEDCOM
* **Seamless Parsing**: Instant client-side parsing of large-scale `.ged` files and relationship indexes.
* **Standard-Compliant Export**: Export modified trees directly to the standard, cross-platform **GEDCOM 5.5.1 / 5.5** format preserving tags, sources, marriages, and events.
* **Sample Datasets**: Built-in genealogical samples showcasing standard pedigrees, split trees, and complex generational loops.

### 2. 🛡️ Advanced Privacy & Anonymization Engine | מנגנוני פרטיות מתקדמים
* **Individual Flags**: Target specific entities for permanent deletion or secure anonymization (replacing identifying fields with safe tokens).
* **Generation-Aware Group Staging**: Instantly mark entire sub-ancestries, descendants, lineage groups, or generational branches with a single click.
* **Bulk Cleanup & GDPR Protection**:
  * **Living People Auto-Redaction**: Identify all alive family members using birth-death tags and bulk-redact or delete them.
  * **Disconnected Component Cleaner**: Find detached branches (split graphs cut off from the main family lineage) and clean them out to maintain focus.
* **Live Preview Staging**: Review a breakdown of pending deletions and anonymizations before rendering changes permanent.

### 3. 📊 Deep Topological Analysis | ניתוח מדדים וקשרים מתקדמים
Runs complex algorithms asynchronously inside a dedicated background **Web Worker (`graphWorker`)** without blocking the main UI thread:
* **Micro-Metrics**: Degree Centrality, ancestral distance, transitivity, average shortest paths, eccentricity, and graph density.
* **Pedigree Anomalies**: Automatically detects **Pedigree Collapse (אובדן אילן יוחסין)**—loops where a member shares identical maternal and paternal ancestors—and calculates branching factors.
* **Generational Stratification**: Displays average generation widths, maximum pedigree depth, and community/family group clustering.

### 4. 🔗 Immersive Force-directed Visualizer | תצוגה חזותית מרהיבה
* **Custom Interactive Layout**: Easily inspect node classifications (person, source, event, location) with custom icon overlays.
* **Intuitive Controls**: Drag and drop nodes, zoom, pan, search for ancestors, and utilize rectangular/marquee box tools for selecting bulk structures.
* **Aesthetic Aesthetics**: Seamless support for a beautiful **Light ☀️** & **Dark 🌙** theme designed to facilitate long inspection sessions without eye strain.

---

## 🛠️ Tech Stack & Architecture | טכנולוגיות וארכיטקטורה

* **Framework**: React 18+ with Vite (configured for rapid deployment pipelines).
* **Language**: Strictly typed, type-safe TypeScript.
* **Styling**: Modern, responsive utility classes built entirely with Google's Inter font, custom sub-themes, and tailwind.
* **Icons**: Crisp SVG visuals structured inside a consolidated UI icons system.
* **High Performance**: Background asynchronous CPU calculations handled with an encapsulated Web Worker script (`graphWorker`).
* **Deployment**: Continuous Integration automatically deploying production static assets through custom GitHub Actions workflows.

---

## 📁 Directory Structure | מבנה התיקיות

```text
├── .github/          # GitHub Workflows (CI/CD Deployments to GitHub Pages)
├── components/       # Component Library
│   ├── ui/           # Shared high-contrast icons and buttons
│   ├── ControlPanel  # Dashboard layout managing filters, bulk changes, and exports
│   ├── GraphLegend   # Legend describing node categories
│   └── GraphVisualizer # High-performance interactive graph layer
├── docs/             # Optimized standalone static build distribution outputs
├── services/         # Logical parsers and workers
│   ├── graphService  # Core GEDCOM logic, tag parser, and export compilation
│   ├── graphWorker   # Web worker executing path computations asynchronously
│   └── sampleData    # Default family tree datasets for fast demonstration
├── App.tsx           # Global view coordinator and state manager
├── locales.ts        # Dynamic translations context (Hebrew & English)
├── types.ts          # Typings, boundaries, and central interfaces
├── vite.config.ts    # Optimized Vite packing parameters
└── package.json      # Dependencies and execution commands
```

---

## 🚀 Local Development | הרצה מקומית

To start exploring the codebase or customizing the visualizer locally, run the following commands:

1. **Install Dependencies | התקנת תלויות**:
   ```bash
   npm ci
   # or
   npm install
   ```

2. **Launch Dev Server | הרצת שרת הפיתוח**:
   ```bash
   npm run dev
   ```
   *The server maps to port `3000` with instant Hot Code Updates.*

3. **Build Target | קימפול עבור ייצור**:
   Generates a fully optimized, compiled, and standardized static single-page application directory ready for fast CDN serving:
   ```bash
   npm run build
   ```

---

## 🌐 Dynamic Deployment | פריסה חצי-אוטומטית ל-GitHub Pages

This project features a secure, optimized GitHub Actions pipeline (`.github/workflows/github-pages.yml`) that automatically compiles and deploys the application when pushing commits to `main` or `master` branches:

1. Under your **repository settings on GitHub**, go to **Pages**.
2. Under **Build and deployment -> Source**, select **GitHub Actions**.
3. Now, whenever you push any layout changes, GitHub Actions compiles the complete client-only SPA bundle and hosts it securely.

*Enjoy completely static, fast, and secure genealogy shielding!*
