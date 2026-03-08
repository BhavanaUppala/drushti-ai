import { RefObject } from "react";
import { Camera, CameraOff } from "lucide-react";

interface CameraViewProps {
  videoRef: RefObject<HTMLVideoElement>;
  isActive: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function CameraView({ videoRef, isActive, onStart, onStop }: CameraViewProps) {
  return (
    <div className="relative mx-4 rounded-2xl overflow-hidden bg-muted border-2 border-border aspect-video">
      {/* Always render video so ref is available when stream is assigned */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${isActive ? "block" : "hidden"}`}
      />
      {isActive ? (
        <button
          onClick={onStop}
          className="absolute top-3 right-3 p-3 rounded-xl bg-background/80 text-foreground hover:bg-background transition-colors focus:outline-none focus:ring-4 focus:ring-ring/50"
          aria-label="Stop camera"
        >
          <CameraOff className="w-6 h-6" />
        </button>
      ) : (
        <button
          onClick={onStart}
          className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-4 focus:ring-ring/50"
          aria-label="Start camera"
        >
          <Camera className="w-12 h-12" />
          <span className="text-lg font-semibold">Tap to start camera</span>
        </button>
      )}
    </div>
  );
}
