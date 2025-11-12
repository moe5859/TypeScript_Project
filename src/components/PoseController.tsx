import React, { useEffect, useRef } from "react";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs";
import "@mediapipe/pose";

interface PoseControllerProps {
  onNod: () => void;
}

const PoseController: React.FC<PoseControllerProps> = ({ onNod }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let detector: poseDetection.PoseDetector | null = null;
    let running = true;
    let history: { t: number; y: number }[] = [];
    const MAX_HISTORY = 30;
    const DOWN_VEL = 0.015;
    const UP_VEL = -0.020;
    const NOD_WINDOW_MS = 600;
    let state: "idle" | "down" = "idle";
    let stateTime = 0;
    let lastJumpAt = 0;
    let mediaStream: MediaStream | null = null;

    const pushHistory = (y: number) => {
      const t = performance.now();
      history.push({ t, y });
      if (history.length > MAX_HISTORY) history.shift();

      if (history.length >= 2) {
        const a = history[history.length - 2];
        const b = history[history.length - 1];
        const vel = (b.y - a.y) / (b.t - a.t || 1);
        const now = b.t;

        if (state === "idle" && vel > DOWN_VEL) {
          state = "down";
          stateTime = now;
        } else if (state === "down" && vel < UP_VEL && now - stateTime <= NOD_WINDOW_MS) {
          state = "idle";
          if (now - lastJumpAt > 700) {
            lastJumpAt = now;
            onNod();
          }
        } else if (state === "down" && now - stateTime > NOD_WINDOW_MS) {
          state = "idle";
        }
      }
    };

    async function runPose() {
      const video = videoRef.current!;
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      video.srcObject = mediaStream;
      await video.play();

      detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
      );

      const loop = async () => {
        if (!running) return;

        // --- Null-Guard: nur weiter, wenn Detector bereit ist
        const det = detector;
        if (!det) {
          requestAnimationFrame(loop);
          return;
        }

        const poses = await det.estimatePoses(video, { flipHorizontal: true });

        if (poses[0]?.keypoints) {
          const nose = poses[0].keypoints.find((k) => k.name === "nose");
          if (nose && (nose.score ?? 0) > 0.5 && video.videoHeight) {
            const yNorm = nose.y / video.videoHeight;
            pushHistory(yNorm);
          }
        }
        requestAnimationFrame(loop);
      };

      loop();
    }

    runPose().catch(console.error);

    return () => {
      running = false;
      detector?.dispose();
      detector = null;
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
        mediaStream = null;
      }
    };
  }, [onNod]);

  return <video ref={videoRef} muted playsInline style={{ display: "none" }} />;
};

export default PoseController;