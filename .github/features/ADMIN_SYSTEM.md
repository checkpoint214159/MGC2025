Prompt 1: Backend – User-Admin Access Tier System

## Implement User-Admin Role-Based Access Control (RBAC)

### Goal
Add a two-tier access system to MGC2025: **User** tier (patients) and **Admin** tier (doctors). 
Admins manage multiple patients; users see only their own data. Both should be enforced at the 
database schema, authentication token, and server-action level.

### Requirements

**1. Schema & Relationships**
- Add an `admin_profile` enum or separate `AdminProfile` model to `prisma/schema.prisma`
- Modify `User` model to include a `role` field (enum: 'patient' | 'admin') and optional `adminManagedPatients` relation
- Create `AdminPatientRelation` or similar join table linking doctors to patients (one doctor → many patients)
- Ensure existing `Account` login still works; add logic to determine role on signup

**2. Authentication & JWT**
- Extend `next-auth.d.ts` to include `role` and `adminManagedPatientIds` in session/JWT
- Update `auth.ts` JWT callback to:
  - Read role from User record on login
  - If role is 'admin', fetch managed patient IDs and include in token
  - Refresh these on session update trigger
- Ensure signOut still works for both tiers

**3. Server Actions & Permission Checks**
- Add a new utility `lib/auth-utils.ts` with:
  - `async requireRole(role: 'patient' | 'admin')` – throws if session doesn't match
  - `async requirePatientAccess(userId, targetPatientId)` – throws unless user is patient OR admin managing that patient
- Update all existing server actions in `lib/actions.ts` to call `requirePatientAccess()` before reading/modifying patient data (e.g., `fetchStateAction`, `updateProgressAction`, etc.)
- Add new admin-only actions:
  - `getAdminManagedPatients()` – return list of patient IDs for logged-in admin
  - `getPatientDetailsForAdmin(patientId)` – return full patient record, threads, states, progress (checks permission)
  - `getPatientThreadsForAdmin(patientId)` – retrieve onboarding/conversation history

**4. Signup & Role Assignment**
- Modify signup flow (`app/(auth)/signup/page.tsx` or `app/(auth)/signup/route.ts`) to:
  - Accept an optional "invitation code" or check email domain (e.g., @hospital.com = admin)
  - OR: seed a list of admin emails in `.env.local` that auto-promote on signup
  - On successful account creation, store role in User record and link to any pre-assigned patients (if applicable)
  - Document how to assign admins (e.g., "create a patient record, then manually set its adminId in DB")

### Deliverables
- [ ] Prisma schema changes with migrations
- [ ] Updated auth.ts with role-based JWT
- [ ] Enhanced next-auth.d.ts types
- [ ] New `lib/auth-utils.ts` with permission helpers
- [ ] Updated `lib/actions.ts` to call permission checks
- [ ] New admin-specific actions in `lib/actions.ts`
- [ ] Updated signup logic to assign role and link patients
- [ ] Brief comment in `.github/copilot-instructions.md` noting the new permission pattern

### Notes
- Keep permission checks **server-side only**; never trust client to send "user role."
- Use `authenticatedAction()` wrapper already in place; the new `requirePatientAccess()` sits inside it.
- All existing patient-data queries must go through `requirePatientAccess()` to prevent admins from seeing unmanaged patients.


Prompt 2: Frontend – Admin Dashboard & Patient Views

## Implement Admin Dashboard & Patient Management UI

### Goal
Build a doctor-facing admin dashboard where logged-in admins can:
1. View a list of all patients they manage
2. Click into a patient to see detailed recovery progress, conversation history, and LLM-generated plans
3. (Optional) Export or annotate patient data

Regular patients see the existing recovery dashboard unchanged.

### Requirements

**1. Admin Dashboard Page (`app/(app)/admin/page.tsx`)**
- Server-side check: redirect non-admins to `/` or show 403
- Display:
  - **Patient List** with columns: Name, Surgery Type, Days Since Surgery, Last Plan Generated, Status
  - Search/filter by patient name or surgery type
  - Click row to navigate to `/admin/patients/[patientId]`
- Use `useQuery` to fetch admin's patient list via `getAdminManagedPatients` action
- Styling: reuse `components/ui/` and `components/layout/` patterns from main dashboard

**2. Patient Detail View (`app/(app)/admin/patients/[patientId]/page.tsx`)**
- Server-side check: verify admin manages this patient (use middleware or `getAdminManagedPatients` in layout)
- Tabs or sections:
  - **Overview**: biometrics (age, surgery, date), profile summary from LLM
  - **Progress**: render the patient's current `State` using `DashboardRenderer` (reuse existing component)
  - **Conversation History**: show onboarding thread messages (questions/answers)
  - **LLM History**: list all generated States by date, allow viewing diff between consecutive generations
  - **Baseline**: show the patient's ICF baseline assessment (Axis A, B, C)
- Use `getPatientDetailsForAdmin` action to fetch full patient context

**3. Conversation/Thread View (`app/(app)/admin/patients/[patientId]/threads/[threadId]/page.tsx`)**
- Display thread messages in chronological order (assistant question → user answer → assistant question…)
- Show the original LLM prompt or reasoning if available (from `Message.reasoning` column)
- Optionally allow doctor to add notes or flag a message for review

**4. Permissions & Client‑Side Guards**
- Update `AuthGuard` or create `AdminGuard` component to:
  - Check `session.user.role === 'admin'`
  - Redirect non-admins away from `/admin/*` routes
- Create a small "Admin Switch" button in the main header (dev-only) that shows which patients you manage (optional; helps with testing)

**5. Existing Patient Dashboard (`app/(app)/page.tsx`)**
- No changes needed; patients continue to see their own recovery dashboard
- (Optionally) add a "View as Doctor" button if a user is also an admin, to switch context

### Deliverables
- [ ] Admin layout and dashboard page (`app/(app)/admin/`)
- [ ] Patient detail view page with tabs
- [ ] Conversation/thread detail pages
- [ ] `AdminGuard` component or route guard logic
- [ ] Reuse existing `DashboardRenderer` and `components/ui/*` for consistency
- [ ] Populate sample admin/patient relationships in dev DB (e.g., doctor1 manages patient1, patient2)
- [ ] Update `.github/copilot-instructions.md` with admin dashboard patterns

### Notes
- **Reuse existing components** where possible (`Card`, `Button`, `DashboardRenderer`, etc.)
- All patient data fetches must call `getPatientDetailsForAdmin` (enforces permission check server-side)
- Consider using React Query's `useQuery` with keys like `['admin', 'patients']` and `['admin', 'patient', patientId]`
- Thread history can be rendered as a collapsible list or modal; mirror the style of existing chat/onboarding UI
- **No patient data should be fetched directly on the client**; always use server actions