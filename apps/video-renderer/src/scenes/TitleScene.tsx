import React from "react";
import { AbsoluteFill, Interpolate } from "remotion";
import { fadeIn, slideUp, slideDown, typewriter, springScale } from "../utils/animation";

interface SceneProps {
  scene: any;
  index: number;
  progress: number;
}

export const TitleScene: React.FC<SceneProps> = ({ scene, progress }) => {
  const durationFrames = scene.duration_seconds * 30;
  const frame = progress * durationFrames;

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "100px",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "#ffffff",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: "1200px",
          opacity: Interpolate(frame, [0, durationFrames * 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${Interpolate(frame, [0, durationFrames * 0.5], [50, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
        }}
      >
        <h1
          style={{
            fontSize: "84px",
            fontWeight: "800",
            margin: "0 0 24px",
            lineHeight: 1.1,
            background: "linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {scene.body_text || scene.title}
        </h1>
        {scene.narration && (
          <p
            style={{
              fontSize: "28px",
              fontWeight: "300",
              opacity: 0.9,
              maxWidth: "900px",
              margin: "0 auto",
              lineHeight: 1.5,
            }}
          >
            {scene.narration}
          </p>
        )}
      </div>

      <div
        style={{
          marginTop: "60px",
          padding: "16px 48px",
          border: "2px solid rgba(255,255,255,0.2)",
          borderRadius: "50px",
          opacity: Interpolate(frame, [durationFrames * 0.5, durationFrames * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        <span style={{ fontSize: "18px", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: "500" }}>
          EduMotion AI
        </span>
      </div>
    </AbsoluteFill>
  );
};