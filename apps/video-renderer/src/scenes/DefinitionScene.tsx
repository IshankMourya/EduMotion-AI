import React from "react";
import { AbsoluteFill, Interpolate } from "remotion";
import { fadeIn, slideUp, slideDown } from "../utils/animation";

interface SceneProps {
  scene: any;
  index: number;
  progress: number;
}

export const DefinitionScene: React.FC<SceneProps> = ({ scene, progress }) => {
  const durationFrames = scene.duration_seconds * 30;
  const frame = progress * durationFrames;

  // Parse term and definition from body_text
  const lines = scene.body_text.split("\n").filter((l: string) => l.trim());
  const term = lines[0] || scene.title;
  const definition = lines.slice(1).join(" ") || scene.narration;

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "80px 120px",
        background: "#0f172a",
        color: "#ffffff",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          width: "100%",
          opacity: Interpolate(frame, [0, durationFrames * 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${Interpolate(frame, [0, durationFrames * 0.4], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
        }}
      >
        <h2
          style={{
            fontSize: "36px",
            fontWeight: "600",
            color: "#38bdf8",
            marginBottom: "32px",
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Definition
        </h2>

        <div
          style={{
            background: "rgba(56, 189, 248, 0.1)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            borderRadius: "16px",
            padding: "48px",
            marginBottom: "32px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "42px",
              fontWeight: "700",
              margin: "0 0 16px",
              color: "#38bdf8",
              lineHeight: 1.2,
            }}
          >
            {term}
          </p>
          <p
            style={{
              fontSize: "22px",
              color: "#cbd5e1",
              lineHeight: 1.6,
              maxWidth: "800px",
              margin: "0 auto",
            }}
          >
            {definition}
          </p>
        </div>

        {scene.narration && (
          <p
            style={{
              fontSize: "20px",
              color: "#94a3b8",
              textAlign: "center",
              lineHeight: 1.6,
              opacity: Interpolate(frame, [durationFrames * 0.4, durationFrames * 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}
          >
            {scene.narration}
          </p>
        )}
      </div>
    </AbsoluteFill>
  );
};