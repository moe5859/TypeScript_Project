import React, { useRef, useMemo, useCallback } from "react";
import "./index.css";
import GameCanvas, { GameHandle } from "./components/GameCanvas";
import HandController from "./components/HandController";
import { GestureArea } from "./gesture/types";

function App() {
  const gameRef = useRef<GameHandle>(null);

  const handleJump = useCallback(() => {
    gameRef.current?.jump();
  }, []);

  const handleOpenPause = useCallback(() => {
    gameRef.current?.openPause();
  }, []);

  const handleSetEasy = useCallback(() => {
    gameRef.current?.setDifficulty("easy");
  }, []);

  const handleSetHard = useCallback(() => {
    gameRef.current?.setDifficulty("hard");
  }, []);

  const handleClosePause = useCallback(() => {
    gameRef.current?.closePause();
  }, []);

  const gestureAreas: GestureArea[] = useMemo(
    () => [
      {
        id: "jump",
        x: 0.3,
        y: 0.0,
        w: 0.4,
        h: 0.3,
      },
      {
        id: "pause",
        x: 0.0,
        y: 0.0,
        w: 0.25,
        h: 0.25,
      },
      {
        id: "easier",
        x: 0.0,
        y: 0.3,
        w: 0.3,
        h: 0.4,
      },
      {
        id: "harder",
        x: 0.7,
        y: 0.3,
        w: 0.3,
        h: 0.4,
      },
      {
        id: "resume",
        x: 0.3,
        y: 0.7,
        w: 0.4,
        h: 0.3,
      },
    ],
    []
  );

  const handleAreaCovered = useCallback(
    (id: string) => {
      switch (id) {
        case "jump":
          handleJump();
          break;
        case "pause":
          handleOpenPause();
          break;
        case "easier":
          handleSetEasy();
          break;
        case "harder":
          handleSetHard();
          break;
        case "resume":
          handleClosePause();
          break;
      }
    },
    [handleJump, handleOpenPause, handleSetEasy, handleSetHard, handleClosePause]
  );

  return (
    <div className="app">
      <h1>🦖 Dino Jump – Gesture Controlled</h1>

      <div className="container">
        <GameCanvas ref={gameRef} />
        <HandController
          areas={gestureAreas}
          onAreaCovered={handleAreaCovered}
          cooldownMs={600}
        />
      </div>

      <p className="hint">
          Gestures:
        <br /> <br />
          • Top middle ⇒ jump<br />
          • Top left ⇒ open pause menu<br />
          • In pause: left/right ⇒ change difficulty, bottom ⇒ resume
        <br /> <br />
          Space/Click key still works as fallback for testing.
      </p>
    </div>
  );
}

export default App;
