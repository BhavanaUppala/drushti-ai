

## Plan: Gate assistant responses on camera state

**Problem:** When the camera is off, `handleVoiceCommand` (line 282) calls `sendToAssistant(text, cameraActive && isReady)` which passes `includeImage: false`, allowing the assistant to process the request without an image. The `sendToAssistant` function only checks camera state when `includeImage` is true.

**Fix:** Two changes in `src/pages/Index.tsx`:

1. **In `handleVoiceCommand`** (line ~282): Before calling `sendToAssistant`, check if the camera is active. If not, speak the "camera not active" feedback message and resume listening. Allow only control commands (start/stop camera, stop listening, resume) to pass through without camera.

2. **Add a new feedback message** `cameraNotActive` to the `feedback` object with translations:
   - EN: "Camera is not active. Please enable the camera."
   - HI: "कैमरा चालू नहीं है। कृपया कैमरा चालू करें।"
   - TE: "కెమెరా యాక్టివ్‌గా లేదు. దయచేసి కెమెరాను ఆన్ చేయండి."

3. **In `sendToAssistant`**: Add a guard at the top (before the `includeImage` check) that rejects all calls when camera is not active, using the same feedback message.

This ensures both voice commands and button taps are blocked when the camera is off, while still allowing camera-start and safety voice commands to work.

