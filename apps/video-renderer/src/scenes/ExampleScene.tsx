import React from "react";
import { AbsoluteFill, Interpolate } from "remotion";
import { fadeIn, slideUp, typewriter } from "../utils/animation";

interface SceneProps {
  scene: any;
  index: number;
  progress: number;
}

export const ExampleScene: React.FC<SceneProps> = ({ scene, progress }) => {
  const durationFrames = scene.duration_seconds * 30;
  const frame = progress * durationFrames;

  // Parse example from body_text
  const lines = scene.body_text.split("\n").filter((l: string) => l.trim());
  const exampleTitle = lines[0] || "Example";
  const exampleContent = lines.slice(1).join("\n") || scene.narration;

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "80px 120px",
        background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        color: "#ffffff",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          width: "100%",
          opacity: Interpolate(frame, [0, durationFrames * 0.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${Interpolate(frame, [0, durationFrames * 0.3], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
        }}
      >
        <h2
          style={{
            fontSize: "36px",
            fontWeight: "600",
            color: "#22d3ee",
            marginBottom: "32px",
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Example
        </h2>

        <div
          style={{
            background: "rgba(34, 211, 238, 0.08)",
            border: "1px solid rgba(34, 211, 238, 0.3)",
            borderRadius: "16px",
            padding: "40px",
            marginBottom: "32px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "0",
              left: "0",
              right: "0",
              height: "4px",
              background: "linear-gradient(90deg, #22d3ee 0%, #818cf8 100%)",
            }}
          />
          <h3
            style={{
              fontSize: "28px",
              fontWeight: "600",
              marginBottom: "24px",
              color: "#22d3ee",
              textAlign: "center",
            }}
          >
            {exampleTitle}
          </h3>

          <div
            style={{
              background: "#020617",
              borderRadius: "12px",
              padding: "32px",
              fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
              fontSize: "20px",
              lineHeight: 1.7,
              color: "#e2e8f0",
              overflow: "hidden",
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
            }}
          >
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
              <code>{exampleContent}</code>
            </pre>
          </div>
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