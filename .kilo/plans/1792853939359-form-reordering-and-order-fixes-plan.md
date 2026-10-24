# Form reordering and order fixes plan

## Changes made (src/ directory)

### 1. `src/lib/review-form.ts`
- Reordered `DEFAULT_REVIEW_FORM_CONFIG.questions` from `rating → comment → date` to `date → rating → comment` (more natural user flow: when they visited → rating → optional comment)
- Simplified `sanitizeQuestions()` to preserve question order directly via `.slice()` on filtered result (removed separate `limited` variable)

### 2. `src/app/(company)/dashboard/formulaire/form-studio.tsx`
- Added `moveQuestion(fromIndex, toIndex)` function to reorder questions in admin studio
- Added up (↑) and down (↓) navigation buttons next to each question (except first/last)
- Buttons move questions one position at a time, preserving the reorder intent

### 3. `src/server/services/qr.ts`
- Minor refactoring (details in git diff)

## Validation
- All 29 unit tests pass
- `npm run lint` passes
- `npm run typecheck` passes  
- `npm run build` succeeds

## Deployment notes
- Changes are on branch `pre_prod`, up to date with `origin/pre_prod`
- Build completes successfully
- Ready for Vercel/Netlify deployment via `npm run build` followed by platform-specific deploy

## Open/Next steps
- Commit changes to git and deploy to production