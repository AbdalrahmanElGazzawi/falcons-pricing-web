# Archive — historical artifacts

This folder is **not** part of the running web application. Vercel ignores it. It exists as a permanent record of how Team Falcons Pricing OS evolved from a spreadsheet into a Next.js web app, so future contributors can see the lineage.

**Do not edit these files.** They are frozen snapshots. If anything in here ever needs to change, the change belongs in `src/` (the live app), not here.

---

## Contents

### Spreadsheet history (root of `archive/`)

| File | What it is |
|---|---|
| `01_v1.0.xlsx` | First full pricing engine after initial scoping. |
| `02_v1.1.xlsx` | Recalc fix + KFC-style preview tab. |
| `03_v1.2.xlsx` | Apps Script bundle integrated, theme deepened. |
| `04_v1.3.xlsx` | PDF export added via Apps Script. |
| `05_v1.4.xlsx` | Adjustment matrix vs preview tab differentiated. |
| `06_v1.5.xlsx` | Roster import (180 talents from SOT) + tier format fix. |
| `07_v2.0_FINAL.xlsx` | The final spreadsheet. Used as the data source for the seed migration that created the live web database. |
| `Quotation_Template.xlsx` | Original PDF template style; shaped the layout of the live PDF generator. |
| `Original_Design_Doc.docx` | Initial themed pricing-engine design doc. |

### Original uploads (`archive/original_uploads/`)

Files Koge originally uploaded at project kickoff, before any rebuild work. Useful as a reference if questions ever come up about original intent or pre-existing data.

---

## Where the live app lives

This `archive/` folder is purely retrospective. The active codebase is in `/src`, the database is on Supabase, and the live deploy is at https://falcons-pricing-web.vercel.app.

Built by Abdalrahman elGazzawi · Architected by Claude
