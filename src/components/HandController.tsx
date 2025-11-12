import React, { useEffect, useRef } from "react";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import "@tensorflow/tfjs";
import "@mediapipe/hands";

interface HandControllerProps {
  onRaise: () => void; // wird aufgerufen, wenn Hand gehoben erkannt wird
  // optional: Empfindlichkeit anpassen (0 = ganz oben, 1 = ganz unten)
  threshold?: number; // default 0.45
  cooldownMs?: number; // default 600ms
}

const HandController: React.FC<HandControllerProps> = ({
  onRaise,
  threshold = 0.45,
  cooldownMs = 600,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let detector: handPoseDetection.HandDetector | null = null;
    let running = true;
    let lastTrigger = 0;
    let wasRaised = false;
    let mediaStream: MediaStream | null = null;

    async function init() {
      const video = videoRef.current!;
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      video.srcObject = mediaStream;
      await video.play();

      // MediaPipe Hands über CDN laden
      detector = await handPoseDetection.createDetector(
        handPoseDetection.SupportedModels.MediaPipeHands,
        {
          runtime: "mediapipe",
          solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands",
          modelType: "lite",
          maxHands: 2,
        } as handPoseDetection.MediaPipeHandsMediaPipeModelConfig
      );

      loop();
    }

    async function loop() {
      if (!running) return;
      const video = videoRef.current!;
      const det = detector;
      if (!det) {
        requestAnimationFrame(loop);
        return;
      }

      const hands = await det.estimateHands(video, {
        flipHorizontal: true,
      });

      // Hand als "gehoben", wenn der Zeigefinger-Tip im oberen Bildbereich ist
      let raised = false;
      if (hands && hands.length > 0 && video.videoHeight) {
        for (const h of hands) {
          // Keypoint-Namen: 'index_finger_tip', 'wrist', etc.
          const tip = h.keypoints.find((k) => k.name === "index_finger_tip");
          if (tip) {
            const yNorm = tip.y / video.videoHeight; // 0 = oben
            if (yNorm < threshold) {
              raised = true;
              break;
            }
          }
        }
      }

      // Rising Edge + Cooldown -> Trigger
      const now = performance.now();
      if (raised && !wasRaised && now - lastTrigger > cooldownMs) {
        lastTrigger = now;
        onRaise();
      }
      wasRaised = raised;

      requestAnimationFrame(loop);
    }

    init().catch(console.error);

    return () => {
      running = false;
      detector?.dispose();
      detector = null;
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [onRaise, threshold, cooldownMs]);

  // Video versteckt; zum Debuggen style={{ display: "block", width: 200 }}
  return <video ref={videoRef} muted playsInline style={{ display: "none" }} />;
};

export default HandController;