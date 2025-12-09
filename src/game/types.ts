export type Difficulty = "easy" | "hard";

export type Rect = {
    x: number;
    y: number;
    w: number;
    h: number;
};

export interface DinoState {
    x: number;
    y: number;
    w: number;
    h: number;
    vy: number;
    onGround: boolean;
    legLeft: boolean;
}