# Fragrance Inventory GUI Streamlining & Feature Refinement

Streamline the boutique perfume inventory and POS application by removing clutter text, thinning metric boxes for mobile ergonomics, enhancing search to recognize bottle sizes in mL, introducing gender categorization and filtering (Men, Women, Unisex), adding brand and bottle size sorting, and removing the camera switcher and personnel creation triggers.

## User Review & Critical Decisions

> [!IMPORTANT]
> Key design and configuration decisions confirmed through user clarification:
> - **Gender Categories**: Standardized to `Men`, `Women`, and `Unisex` across fragrance item records, edit modals, and filter controls.
> - **Sort Options**: Added `Brand (A-Z)` and `Bottle Size (Small to Large)` (with reverse orders available) to the sort menu.
> - **Box Thickness**: Applied ultra-thin padding and compact horizontal layouts to Dashboard metric cards and Sales transaction containers to eliminate mobile bulkiness.

- **Confirmed Decision 1**: Fragrance gender classifications will use `Men`, `Women`, and `Unisex`.
- **Confirmed Decision 2**: Inventory sorting adds `Brand (A-Z)` and `Bottle Size (Small to Large)`.
- **Confirmed Decision 3**: Camera in barcode scanner locks to environment (rear) camera with no switch toggle.

---

## 1. Overview & Core Concept

- **What It Does**: Refines the mobile-first fragrance management suite with an ultra-compact visual density, fast bottle size search in mL, gender-based filtering, streamlined sorting, and clutter-free dashboard and sales cards.
- **Target Audience / Persona**: Boutique managers and sales associates handling fragrance inventory on mobile smartphones.
- **Key Value**: Maximum screen real estate on mobile devices with zero unneeded text or bulky padding, allowing staff to scan, search, and audit stock faster.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. *Dashboard View*: Staff view high-level metrics without redundant uppercase category labels ("OVERVIEW & METRICS") or subtitle fluff ("Across all boutique shelves", "Calculated at current retail"). The cards are slim and horizontal.
  2. *Inventory Search & Filtering*: Staff can type "100" or "100ml" to instantly find all 100 mL fragrances. Tapping filters presents Brand and Gender (`All`, `Men`, `Women`, `Unisex`), without old concentration options.
  3. *Inventory Sorting*: Staff can sort by `Brand (A-Z)`, `Brand (Z-A)`, `Bottle Size (Small to Large)`, and `Bottle Size (Large to Small)`.
  4. *Item Editing*: Staff can review or edit fragrance details including Gender via a segmented or select control.
  5. *Barcode Scanner*: A dedicated, distraction-free camera viewfinder locks to the rear lens without camera-switching confusion.
  6. *Sales Menu*: Ultra-thin metric bars and compact transaction ledger entries display all vital sale info without excessive vertical scrolling.
  7. *Accounts View*: Clean staff roster display with no "+ Add Personnel" button.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Warm minimalist luxury editorial (ivory `#faf8f4`, beige `#e7e2d4`, deep charcoal `#1b1915`, muted olive-gold `#8c826e`).
  - *Typography*: Serif display titles (`font-serif font-bold`) paired with crisp sans-serif text and tabular numbers (`font-mono tabular-nums`) for currency and stock.
  - *Box Density*: Slim, non-bulky rounded rectangles (`rounded-xl` / `rounded-2xl`) with tight padding (`p-2.5` to `p-3.5`) and subtle hairline borders.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Bottle Size mL Search Matching**:
  - *Chosen Approach*: Enhanced regex/matcher that checks if the numeric query equals `size`, or matches `${size}ml` / `${size} ml` (e.g. typing `50`, `50ml`, `100ml` immediately isolates matching bottle capacities).
  - *Why*: Allows associates to quickly find perfumes by customer bottle size preference without needing complex filters.
- **Decision 2: Gender Filtering and Editing**:
  - *Chosen Approach*: Standardize `gender` on `InventoryItem` as `Men`, `Women`, or `Unisex`. Add to `ItemEditModal`, `AddItemModal`, and the filter drawer.
  - *Why*: Direct alignment with customer shopping behavior in fragrance retail.
- **Decision 3: Thinner Metric Boxes**:
  - *Chosen Approach*: Reduced vertical padding from `p-4` / `p-5` to `p-2.5` / `p-3`, tightened icon box sizes, and placed values inline with labels where appropriate.
  - *Why*: Avoids pushing inventory lists or transaction records below the mobile viewport fold.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                     InventoryContext                        │
│   items: InventoryItem[]  |  sales: Sale[]  |  personnel    │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
       ┌───────▼────────┐             ┌───────▼────────┐
       │ DashboardView  │             │ InventoryView  │
       │ - Thinner cards│             │ - mL search    │
       │ - No label text│             │ - Gender filter│
       └────────────────┘             │ - Brand/mL sort│
                                      └───────┬────────┘
                                              │
                                      ┌───────▼────────┐
                                      │ ItemEditModal  │
                                      │ - Gender field │
                                      └────────────────┘
```

- **Files Targeted for Execution**:
  1. `src/components/DashboardView.tsx`: Remove "OVERVIEW & METRICS", "Across all boutique shelves", and "Calculated at current retail". Reduce padding on cards to make them sleek and thin.
  2. `src/components/InventoryView.tsx`: Support mL search terms, remove concentration filter, add gender filter (`Men`, `Women`, `Unisex`), add sort options for `Brand (A-Z)` and `Bottle Size (Small to Large)`.
  3. `src/components/ItemEditModal.tsx` & `src/components/AddItemModal.tsx`: Verify/add gender selection with options `Men`, `Women`, `Unisex`.
  4. `src/components/ScanView.tsx`: Remove `SwitchCamera` import and camera switcher button, locking stream to rear environment camera.
  5. `src/components/PurchaseHistoryView.tsx`: Thin out metric cards and transaction list rows for compact mobile view.
  6. `src/components/AccountsView.tsx`: Remove any "+ Add Personnel" button and modal trigger.
