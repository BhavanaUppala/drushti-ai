

## Plan: Codebase Optimization & Cleanup

### 1. Delete Unused Files
These components/hooks are no longer imported anywhere in the active codebase:

- **`src/components/FeatureButton.tsx`** — removed from UI previously, file still exists
- **`src/components/LanguageSelector.tsx`** — manual language selector, replaced by auto-detection
- **`src/components/MedicineReminders.tsx`** — visual UI component, removed from Index
- **`src/hooks/useMedicineReminders.ts`** — hook for medicine reminders, no longer used
- **`src/App.css`** — Vite boilerplate CSS (logo spin, .card, .read-the-docs), not used anywhere

### 2. Clean Up `src/index.css`
Remove unused CSS artifacts:
- `.btn-feature` utility class (was for `FeatureButton`)
- `.animate-pulse-glow` keyframes (was for `FeatureButton` active state)
- `--feature-scene`, `--feature-text`, `--feature-currency`, `--feature-voice` CSS custom properties (were for feature button colors)

Keep `.animate-listening` (used by `VoiceButton`).

### 3. Fix `vite.config.ts`
Remove `force: true` from `optimizeDeps` — this was a temporary cache-bust fix and forces unnecessary rebuilds on every start. The `dedupe` config is sufficient.

### 4. Fix Logic Issue in `useSpeech.ts`
The `langMap` object is defined but never actually used in the `fallbackBrowserTTS` function's voice matching. It's used correctly on line 109. No bug here — just confirming it's fine.

### 5. Fix `detectedLangRef` in `Index.tsx`
`detectedLangRef` (line 25-26) is created and updated but never read. Remove it.

### 6. Remove Redundant Voice Pre-loading
The `useEffect` on lines 29-34 of `Index.tsx` pre-loads browser voices, but this is already handled inside `fallbackBrowserTTS` in `useSpeech.ts`. Remove the duplicate.

### 7. Stabilize `sendToAssistant` Dependencies
`conversationHistory` is in the dependency array of `sendToAssistant`, causing it to recreate on every conversation turn, which cascades to `handleVoiceCommand` recreation. Use a ref for conversation history to break this chain.

### Summary of Changes

| File | Action |
|------|--------|
| `src/components/FeatureButton.tsx` | Delete |
| `src/components/LanguageSelector.tsx` | Delete |
| `src/components/MedicineReminders.tsx` | Delete |
| `src/hooks/useMedicineReminders.ts` | Delete |
| `src/App.css` | Delete |
| `src/index.css` | Remove unused CSS tokens and `.btn-feature` |
| `src/pages/Index.tsx` | Remove `detectedLangRef`, remove voice pre-load `useEffect`, use ref for `conversationHistory` in `sendToAssistant` |
| `vite.config.ts` | Remove `force: true` |

