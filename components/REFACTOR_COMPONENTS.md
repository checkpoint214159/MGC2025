# Component Organization Refactor Guide

## Overview

This document provides instructions for reorganizing scattered components into a centralized, well-structured `components/` directory. The goal is to separate concerns clearly: server routing logic stays in `app/`, while all client-side UI and presentation logic lives in `components/`.

## Problem Statement

Currently, the codebase has:
- Page-level logic (queries, state, rendering) mixed into `page.tsx` files
- Components scattered across `app/` and `components/` directories
- Unclear separation between server-side routing and client-side presentation
- Admin/user dashboards as raw `page.tsx` files instead of reusable components

## Target Architecture

```
components/
├── ui/                    # Atomic/primitive UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── Slider.tsx
│   ├── Checkbox.tsx
│   ├── progress.tsx
│   └── DashboardUtils.tsx (utils, not a component)
│
├── guards/                # Authentication/authorization guards
│   ├── AuthGuard.tsx
│   ├── OnboardingGuard.tsx
│   └── AdminGuard.tsx
│
├── layout/                # Site-wide layout components
│   ├── Sidebar.tsx
│   ├── SidebarSection.tsx
│   └── Header.tsx (if created)
│
├── recovery/              # Domain: recovery/patient features
│   ├── DashboardRenderer.tsx
│   ├── UserDashboard.tsx        ← NEW: extracted from app/(app)/user/page.tsx
│   ├── widgets/
│   │   ├── ExercisePreviewCard.tsx
│   │   ├── ExerciseWidget.tsx
│   │   ├── NutritionPreviewCard.tsx
│   │   ├── SleepPreviewCard.tsx
│   │   └── SymptomsPreviewCard.tsx
│   └── registry.ts
│
├── admin/                 # Domain: admin/doctor features
│   ├── AdminDashboard.tsx       ← NEW: extracted from app/(app)/admin/page.tsx
│   ├── PatientDetailView.tsx    ← NEW: extracted from app/(app)/admin/patients/[id]/page.tsx
│   └── tabs/
│       ├── OverviewTab.tsx      (optional: if tabs become complex)
│       ├── ProgressTab.tsx
│       ├── ThreadsTab.tsx
│       └── BaselineTab.tsx
│
├── development/           # Dev-only components (NODE_ENV === 'development')
│   ├── DevDateSwitcher.tsx
│   ├── ForceStateGeneration.tsx
│   └── ForceOnboarding.tsx
│
├── providers/             # Context/provider wrappers
│   └── Providers.tsx      ← MOVE from root
│
└── README.md             # (optional) Component usage guide
```

## Refactoring Steps

### Step 1: Create Guard Folder
- Create `components/guards/` directory
- Move `AuthGuard.tsx`, `OnboardingGuard.tsx`, `AdminGuard.tsx` into it
- Update all imports across the codebase

### Step 2: Reorganize Development Components
- Create `components/development/` directory
- Move `DevDateSwitcher.tsx`, `admin/ForceStateGeneration.tsx`, `admin/ForceOnboarding.tsx` into it
- Rename to clarify they are dev-only tools
- Update imports in `page.tsx` files and `app/layout.tsx`

### Step 3: Extract User Dashboard Component
- Create `components/recovery/UserDashboard.tsx`
- Extract all JSX and logic from `app/(app)/user/page.tsx` into this new component
- Make `app/(app)/user/page.tsx` a thin wrapper:
  ```tsx
  import { UserDashboard } from "@/components/recovery/UserDashboard";
  export default function Page() {
    return <UserDashboard />;
  }
  ```

### Step 4: Extract Admin Dashboard Component
- Create `components/admin/AdminDashboard.tsx`
- Extract all JSX and logic from `app/(app)/admin/page.tsx` into this new component
- Make `app/(app)/admin/page.tsx` a thin wrapper (same pattern as Step 3)

### Step 5: Extract Patient Detail Component
- Create `components/admin/PatientDetailView.tsx`
- Extract all JSX and logic from `app/(app)/admin/patients/[patientId]/page.tsx` into this new component
- Make the page file a thin wrapper

### Step 6: (Optional) Extract Tabs into Sub-Components
- If the PatientDetailView becomes large (300+ lines), split tabs into:
  - `components/admin/tabs/OverviewTab.tsx`
  - `components/admin/tabs/ProgressTab.tsx`
  - `components/admin/tabs/ThreadsTab.tsx`
  - `components/admin/tabs/BaselineTab.tsx`
- Import these in PatientDetailView

### Step 7: Move Providers
- Create `components/providers/` directory
- Move `Providers.tsx` into it
- Update imports in `app/layout.tsx`

### Step 8: Update app/ Page Files
- ALL `page.tsx` files should be thin wrappers (5-10 lines max)
- They import components from `components/` and render them
- No business logic, no JSX beyond a single component render

### Step 9: Move Recovery Widgets
- Move `ExercisePreviewCard.tsx`, `NutritionPreviewCard.tsx`, `SleepPreviewCard.tsx`, `SymptomsPreviewCard.tsx` into `components/recovery/widgets/`
- Update imports in `DashboardRenderer.tsx` and `registry.ts`

### Step 10: Update Import Paths
- Replace all relative imports (`../../components/...`) with baseUrl imports (`@/components/...`)
- Use `tsconfig.json` path aliases (`@/` maps to root ``)

## Design Principles

### Server vs Client Boundary Clarity

**Server-side (stays in `app/`):**
- Layouts with `await auth()` checks
- Server-side redirects via `redirect()`
- Route guards that read session before rendering anything
- Async data that must happen before page render

**Client-side (goes in `components/`):**
- Interactive components (buttons, forms, tabs)
- `useQuery`, `useSession`, other React hooks
- Client-side error handling and loading states
- Conditional rendering based on user state

### "Dumb" Pages

Pages should follow this pattern:
```tsx
// app/(app)/user/page.tsx
import { UserDashboard } from "@/components/recovery/UserDashboard";

export default function Page() {
  return <UserDashboard />;
}
```

Never:
```tsx
// ❌ DON'T: mix routing + presentation in page.tsx
export default function Page() {
  const router = useRouter();
  useEffect(() => { router.push(...) }, []); // Redirect logic in page!
  return <ComplexJSX />; // 200 lines of nested JSX
}
```

## Naming Conventions

- **Components**: PascalCase, descriptive (e.g., `AdminDashboard.tsx`, `PatientDetailView.tsx`)
- **Hooks**: camelCase, prefixed with `use` (e.g., `useAdminPatients.ts`)
- **Utilities**: camelCase (e.g., `dashboardUtils.ts`)
- **Types**: PascalCase in `.ts` files (e.g., `types/admin.ts`)

## Expected Outcomes

After refactoring:
- ✅ All client UI code lives in `components/`
- ✅ All routing logic lives in `app/`
- ✅ Page files are thin wrappers (5-10 lines each)
- ✅ Clear visual hierarchy: `components/guards/`, `components/admin/`, `components/recovery/`
- ✅ Easy to find code: "Where's the AdminDashboard?" → `components/admin/AdminDashboard.tsx`
- ✅ Easy to reuse: components can be imported and used elsewhere
- ✅ New AI agents can quickly understand the structure

## Implementation Notes

- **No breaking changes**: Refactor incrementally; test after each step
- **Use IDE rename**: Use VS Code "Rename Symbol" to update all references at once
- **Commit frequently**: Commit after each major folder reorganization
- **Run tests**: After refactoring each page, verify routing still works
- **Update copilot-instructions.md**: Add new component structure to project guidance docs

## When to Stop Extracting

- ✅ Extract if component is used in 2+ places
- ✅ Extract if a page file exceeds 100 lines
- ❌ Don't extract single-use, simple components (unless for clarity)
- ❌ Don't over-engineer with extra folders unless there's real nesting

## References

- Next.js App Router best practices: https://nextjs.org/docs/app
- React component composition: https://react.dev/learn/thinking-in-react
- Feature-based vs flat folder structure: depends on team; recommend domain-based (recovery/, admin/)
