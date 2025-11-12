import React, { useRef } from "react";
import "./index.css";
import GameCanvas, { GameHandle } from "./components/GameCanvas";
import HandController from "./components/HandController";

function App() {
  const gameRef = useRef<GameHandle>(null);
  const onHandRaise = () => gameRef.current?.jump();

  return (
    <div className="app">
      <h1>🦖 Dino Jump – Hand hoch = Sprung</h1>
      <div className="container">
        <GameCanvas ref={gameRef} />
        <HandController onRaise={onHandRaise} threshold={0.45} cooldownMs={600} />
      </div>
      <p className="hint">Hand deutlich anheben (Zeigefingerspitze sichtbar) – Space zum Testen.</p>
    </div>
  );
}

export default App;