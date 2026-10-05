# Implementation Plan: Dev Branch Comparison and Feature Work

Compare current feature branch (`feature/memberqrcode`) against `dev` / `origin/dev`, ensure zero merge conflicts, and clean up temporary backup files before committing and pushing.

---

## 1. Branch & Conflict Analysis Results

| Audit Item | Status | Verification & Details |
| :--- | :--- | :--- |
| **Branch Divergence** | ✅ **Clean Fast-Forward** | `feature/memberqrcode` is 0 commits behind `origin/dev`. No merge conflicts exist. |
| **Git Conflicts** | ✅ **Zero Conflicts** | All changes build on top of latest `origin/dev` cleanly. |
| **TypeScript Build** | ✅ **0 Errors** | `npx tsc --noEmit` verified with zero compilation errors in frontend and backend. |
| **Test Data Isolation** | ✅ **Isolated** | Local test data stays separate from production data. |

---

## 2. Database Schema Notes

> [!IMPORTANT]
> ### Planned Schema Additions
> - **Schema Additions**:
>   - New models: `Competition`, `CompetitionSubmission`, `EquipmentComplaint`, `AffiliatePartner`, `FranchiseApplication`, `SystemSetting`.
>   - New column: `businessCode` on `Tenant` model.
> - **Schema review**:
>   - Review schema changes before applying them.
>   - Review schema changes for data-loss risks.
>   - Keep local test data separate from production data.
>   - Review schema changes for data-loss risks.
>   - Keep test data separate from production data.
The planned schema additions are listed above.


## 3. Pre-Push Cleanup Steps

1. **Clean Temporary Backup Clutter Files**:
    Remove temporary backup files created during previous iterations (`*.backup-*`, `*.bck`).
2. **Exclude Debug Scripts**:
   - Ignore or clean up temporary latency debug scripts (`backend/check_device_ping.ts`, `backend/check`, `backend/check_latency.ts`).
3. **Commit & Push to `dev` Branch**:
   - Stage all feature files (Competition engine, Vitals display, Equipment complaint portal, Franchise popup, Printable QR sticker generator).
   - Create a clean git commit: `feat: competition engine, vitals display, franchise investment popup & printable QR stickers`.
   - Push to `origin/dev` (or create a Merge Request into `dev`).


# Implementation Plan: Vitals Score Value & Metric Type Visibility + Post-Registration Franchise Investment Opportunity Popup

1. **Vitals Score & Metric Type Visibility**:
   - Added missing **Vitals Score** table column cell to the Admin Center Leaderboard (`frontend/src/app/competitions/page.tsx`).
   - Clearly displays the numeric vital score (e.g. `45`), metric unit (e.g. `reps`, `seconds`, `points`), and metric type tag (e.g. `REPS`, `DURATION`, `COUNT`).
   - Enhanced public member competition result card (`frontend/src/app/competition/page.tsx`) to show `Recorded Vitals Score` with metric value, unit, and type badge.

2. **Post-Registration Franchise Investment Opportunity Popup & Pre-fill Flow**:
   - Show interactive **Franchise Investment Opportunity Modal** after form submission across all public QR registration channels except `/franchise`.
   - Pre-fill user details (`Name`, `Phone`, `Email`, `Facility Code`) when user accepts CTA.

---

## User Review Required

> [!IMPORTANT]
> ### 1. Excluded Forms
> - **Franchise Partner Registration (`/franchise`)**: Excluded from showing the popup to prevent circular prompts.
> 
> ### 2. Triggered Registration Channels
> Immediately after successful form submission on:
> 1. **Member Self-Registration** (`/register`)
> 2. **Member Enquiry** (`/enquire`)
> 3. **Day Pass / Free Trial** (`/day-pass`)
> 4. **Member Competition Entry** (`/competition`)
>
> ### 3. Modal Design & User Flow
> - **Popup Title**: *"Interested in Owning & Investing in a MarutFit.com Software Franchise?"*
> - **Subtext**: *"Join AiVONIC Technology & MarutFit.com family! Build a high-yield fitness business with automated gym operating systems, biometrics & AI features."*
> - **Highlights**:
>   - 💎 Complete Technology & Technical Support by AiVONIC Tech
>   - ⚡ Automated Gym Operating Systems & Biometrics
>   - 📈 High ROI Potential
> - **Action Buttons**:
>   - **"Yes, Show Franchise Details"** (Primary CTA): Pre-fills submitted `Name`, `Phone`, `Email`, and `Facility Code` into `/franchise?name=...&phone=...&email=...&code=...` and redirects instantly.
>   - **"No Thanks / Continue"**: Closes modal popup and displays standard success / rank confirmation screen.

---

## Proposed Changes

### Shared Public Components

#### [CREATE] [FranchiseInvestmentModal.tsx](file:///Users/apple/Documents/Businesses/AiVONIC/Projects/Marut%20Fitness%20Software/MarutGymSoftwareCodeBase/frontend/src/components/public/FranchiseInvestmentModal.tsx)
- Reusable glassmorphism popup modal component for public registration success screens.
- Accepts `isOpen`, `onClose`, and `participantData` (`{ name?: string; phone?: string; email?: string; code?: string }`).
- Renders "Yes, Show Franchise Details" button which triggers `router.push('/franchise?...')`.

---

### Public Registration Form Modifications

#### [MODIFY] [franchise/page.tsx](file:///Users/apple/Documents/Businesses/AiVONIC/Projects/Marut%20Fitness%20Software/MarutGymSoftwareCodeBase/frontend/src/app/franchise/page.tsx)
- Update `FranchiseFormContent` state initialization to pull `name`, `phone`, `email`, and `code`/`referredByCode` from `searchParams` on component load.

#### [MODIFY] [register/page.tsx](file:///Users/apple/Documents/Businesses/AiVONIC/Projects/Marut%20Fitness%20Software/MarutGymSoftwareCodeBase/frontend/src/app/register/page.tsx)
- Trigger `FranchiseInvestmentModal` upon successful member self-registration submission.

#### [MODIFY] [enquire/page.tsx](file:///Users/apple/Documents/Businesses/AiVONIC/Projects/Marut%20Fitness%20Software/MarutGymSoftwareCodeBase/frontend/src/app/enquire/page.tsx)
- Trigger `FranchiseInvestmentModal` upon successful member enquiry submission.

#### [MODIFY] [day-pass/page.tsx](file:///Users/apple/Documents/Businesses/AiVONIC/Projects/Marut%20Fitness%20Software/MarutGymSoftwareCodeBase/frontend/src/app/day-pass/page.tsx)
- Trigger `FranchiseInvestmentModal` upon successful day pass / free trial submission.

#### [MODIFY] [competition/page.tsx](file:///Users/apple/Documents/Businesses/AiVONIC/Projects/Marut%20Fitness%20Software/MarutGymSoftwareCodeBase/frontend/src/app/competition/page.tsx)
- Trigger `FranchiseInvestmentModal` upon successful competition entry submission.

---

## Verification Plan

### Automated Verification
- Run `npx tsc --noEmit` in `frontend` directory to verify zero TypeScript errors.

### Manual Verification
1. Submit a **Member Competition Entry** on `/competition?code=1001`.
   - Verify modal popup appears asking about franchise investment interest.
   - Click "Yes, Show Franchise Details".
   - Verify redirection to `/franchise` with `Name`, `Phone`, `Email`, and `Referral Code (1001)` pre-filled.
2. Submit a **Member Self-Registration** on `/register?code=1001`.
   - Verify modal popup appears.
   - Click "No Thanks / Continue" -> verify modal closes cleanly.
3. Submit a **Member Enquiry** on `/enquire` and **Day Pass** on `/day-pass`.
   - Verify modal popup flow on both.
4. Navigate directly to `/franchise`.
   - Verify no investment prompt appears.

---

# Implementation Plan: Bulk QR System (4-Digit Numeric Business Codes) & Franchise Affiliate Program

Implement a unified 4-Digit Numeric Business Code architecture enabling bulk-printed generic QR stickers for **Member Registration**, **Inquiry Registration**, **Equipment Complaint**, and a global **Franchise Registration** portal (`https://marutfit.com/franchise`) with an **Affiliate Marketing & Tracking System**.

---

## User Review Required & Design Architecture

> [!IMPORTANT]
> ### 1. Custom Branded QR Codes vs. Common Bulk Stickers
> - **Custom Branded QR Codes (Like Crossroad Fitness)**:
>   - Gym owners can still generate & print custom branded QR codes with pre-embedded `tenantId` parameters (`https://marutfit.com/register?tenantId=...`) directly from **Gym Admin Panel -> QR & Marketing Tab**.
>   - Scanning these will **bypass** the business code prompt and open the gym's registration form instantly.
> - **Common Bulk Generic QR Stickers**:
>   - Printable bulk stickers (`/register`, `/inquiry`, `/complaint`, `/franchise`) can be downloaded from **Super Admin Panel** or **Gym Admin Panel**.
>   - Staff write the 4-digit Business Code under the sticker. Scanning opens the 4-digit numeric keypad modal.
>
> ### 2. Business Code Visibility
> - **Gym Admin Panel**: Displayed in the top navigation bar header (`Business Code: 1001`) and in **White-Label & Settings**.
> - **Super Admin Control Panel**: Listed in the Tenant/Facility Management table.
>
> ### 3. Printable QR Code Layout Specification (Clean Professional Design)
> - **Card Theme**: Minimalist, high-contrast print layout on pure white card background.
> - **Top Header Banner**: Solid Dark Blue rectangular banner with crisp white text highlighting purpose (e.g. `MEMBER REGISTRATION / QUICK SELF SIGN-UP`, `VISITOR FREE TRIAL INQUIRY`, `EQUIPMENT RE-RACK & COMPLAINT`, `FRANCHISE APPLICATION`).
> - **Center Section**: High-contrast black QR Code with **Wide Full-Width Facility Code box** underneath:
>   - **Bulk Printable Stickers**: Wide box with spacious empty brackets: `FACILITY CODE : [                              ]` (utilizing maximum available width to comfortably hand-write up to 8 digits with a permanent marker).
>   - **Custom Gym Posters**: Pre-filled with gym code: `FACILITY CODE : [  1001  ]`.
> - **Separator Line**: Horizontal divider line separating form from footer.
> - **Bottom Footer (Dual Layout with Franchise QR Code)**:
>   - **Left Side**:
>     - Compact Marut Fitness Software circular emblem logo.
>     - **Dedicated Franchise QR Code**: Pointing dynamically to `https://marutfit.com/franchise/details` (or configured `aivonic.com` listing URL).
>     - Text under second QR code: `FRANCHISE DETAILS`.
>   - **Right Side**: Right-aligned 5-line clean typography format:
>     - **OWN A FITNESS TECHNOLOGY BUSINESS**
>     - No Technical Background Required
>     - Invest in a MarutFit.com Franchise
>     - AiVONIC Technology PVT LTD provides Technology & Technical Support
>     - Contact Now IN-7671801206 / email : franchise@marutfit.com
>
> ### 4. Dynamic Franchise Listing & Affiliation QR System (`https://marutfit.com/franchise`)
> - **Dynamic URL Redirection**: Printed Franchise QR codes point to a dynamic system endpoint (`https://marutfit.com/franchise/details`).
> - **Super Admin Configurable Listing URL**:
>   - In **Super Admin Control Panel (`/platform-admin`) -> Platform Settings**: Super Admin can set/update the **Franchise Target URL**.
>   - **Phase 1 (Current)**: Directs to `https://marutfit.com/franchise` (our built-in application form).
>   - **Phase 2 (When ready)**: Update Super Admin setting to point to your new `aivonic.com` franchise listings (`https://aivonic.com/franchise/...`).
>   - **Benefit**: You can print bulk Franchise QR stickers **today** without waiting, and seamlessly switch the target URL in Super Admin panel **later** without re-printing any stickers!
> - **Affiliate Marketing & QR Generator**:
>   - Create Affiliates in Super Admin with `Affiliate Code`, `Name`, `Phone`, `Profession`, `Location`.
>   - Generate downloadable Franchise Referral QR Code posters pre-linked with `?ref=CODE`.

---

# Implementation Plan: Separate "Take Photo" and "Choose Photo" Options on Public Member Self-Registration Form

Fix the photo capture section on the public member self-registration page (`/register?tenantId=...`) accessed via QR code, by separating **"Take Photo"** (live camera snap) and **"Choose Photo"** (mobile photo gallery/file picker), ensuring full compatibility with existing printed front desk QR codes.

---

# Implementation Plan: Staff & Workout Management System with Monthly Payroll, Advance & Dues Tracking

Build a full-featured **Staff & Workout Management System** under `/staff` with an integrated **Monthly Payroll & Advance Tracker**.

---

# Implementation Plan: Batch Import of 69 Existing Cross Road Fitness Members

Import all 69 unique member records extracted from the user's previous gym app screenshots into Supabase PostgreSQL for Cross Road Fitness (`df702917-b1c4-4160-8672-85fe981d03f8`).

---

# Implementation Plan: Comprehensive Fixes for Database Pooler & Mutation Responses

Prevent `PostgresError 42P05` by appending `?pgbouncer=true&connection_limit=1` to `DATABASE_URL` in `backend/.env` and `backend/src/lib/prisma.ts`.

---

# Implementation Plan: Auto-Expired Member Status & Enabled Renew Option

Check membership end dates against current date and auto-assign `EXPIRED` status with one-click `Renew` actions.

---

# Implementation Plan: Admin Batch Management System

Provide full Admin control to create, view, edit, and delete custom Gym Batches.

---

# Implementation Plan: Super Admin QR Code Sticker Generator & Editable Franchise Target Link

Provide high-resolution downloadable/printable QR code stickers for all registration channels in the Super Admin dashboard.
