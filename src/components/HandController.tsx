import React, { useEffect, useRef } from "react";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import "@tensorflow/tfjs";
import "@mediapipe/hands";
import { GestureArea } from "../gesture/types";

interface HandControllerProps {
  areas: GestureArea[];
  onAreaCovered: (areaId: string) => void;
  cooldownMs?: number;
  onFist?: () => void;
}

const HandController: React.FC<HandControllerProps> = ({
  areas,
  onAreaCovered,
  cooldownMs = 600,
  onFist,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let detector: handPoseDetection.HandDetector | null = null;
    let running = true;
    let mediaStream: MediaStream | null = null;
    const lastTrigger: Record<string, number> = {};
    let lastFistTime = 0;
    const FIST_COOLDOWN = 800;

    const nowMs = () => performance.now();

    async function init() {
      const video = videoRef.current;
      if (!video) return;

      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      video.srcObject = mediaStream;
      await video.play();

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

      const video = videoRef.current;
      const det = detector;
      if (!video || !det || !video.videoWidth || !video.videoHeight) {
        requestAnimationFrame(loop);
        return;
      }

      const hands = await det.estimateHands(video, { flipHorizontal: true });

      if (hands && hands.length > 0) {
        for (const h of hands) {
          const tip = h.keypoints.find((k) => k.name === "index_finger_tip");

          if (onFist) {
            const wrist = h.keypoints.find((k) => k.name === "wrist");
            const indexTip = h.keypoints.find((k) => k.name === "index_finger_tip");
            const middleTip = h.keypoints.find((k) => k.name === "middle_finger_tip");
            const ringTip = h.keypoints.find((k) => k.name === "ring_finger_tip");
            const pinkyTip = h.keypoints.find((k) => k.name === "pinky_tip");

            if (
              wrist &&
              indexTip &&
              middleTip &&
              ringTip &&
              pinkyTip &&
              video.videoWidth
            ) {
              const tips = [indexTip, middleTip, ringTip, pinkyTip];

              const distances = tips.map((t) => {
                const dx = t.x - wrist.x;
                const dy = t.y - wrist.y;
                return Math.sqrt(dx * dx + dy * dy);
              });

              const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
              const avgNorm = avgDist / video.videoWidth;

              const now = nowMs();
              if (avgNorm < 0.13 && now - lastFistTime >= FIST_COOLDOWN) {
                lastFistTime = now;
                onFist();
              }
            }
          }


          if (!tip || !video.videoWidth || !video.videoHeight) continue;

          const xNorm = tip.x / video.videoWidth;
          const yNorm = tip.y / video.videoHeight;

          for (const area of areas) {
            const inside =
              xNorm >= area.x &&
              xNorm <= area.x + area.w &&
              yNorm >= area.y &&
              yNorm <= area.y + area.h;

            if (!inside) continue;

            const now = nowMs();
            const last = lastTrigger[area.id] ?? 0;

            if (now - last >= cooldownMs) {
              lastTrigger[area.id] = now;
              onAreaCovered(area.id);
            }
          }
        }
      }

      requestAnimationFrame(loop);
    }

    init().catch(console.error);

    return () => {
      running = false;
      detector?.dispose();
      detector = null;
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
        mediaStream = null;
      }
    };
  }, [areas, onAreaCovered, cooldownMs, onFist]);


  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: 16,
        width: 400,
        height: 200,
        border: "2px solid #fff",
        borderRadius: 8,
        overflow: "hidden",
        background: "#000",
        zIndex: 9999,
      }}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: "scaleX(-1)"
        }}
      />
    </div>
  );
};

export default HandController;
