import React from "react";
import { AbsoluteFill, Interpolate } from "remotion";
import { fadeIn, slideUp, slideRight, springScale } from "../utils/animation";

interface SceneProps {
  scene: any;
  index: number;
  progress: number;
}

export const ProcessScene: React.FC<SceneProps> = ({ scene, progress }) => {
  const durationFrames = scene.duration_seconds * 30;
  const frame = progress * durationFrames;

  // Parse steps from body_text
  const steps = scene.body_text
    .split("\n")
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0)
    .map((l: string, idx: number) => ({
      number: idx + 1,
      text: l.replace(/^\d+[.)]\s*/, ""),
    }));

  const nodeRadius = 60;
  const spacing = 200;
  const totalWidth = (steps.length - 1) * spacing;

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
          maxWidth: "1400px",
          width: "100%",
          opacity: Interpolate(frame, [0, durationFrames * 0.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        <h2
          style={{
            fontSize: "42px",
            fontWeight: "700",
            marginBottom: "40px",
            textAlign: "center",
            background: "linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {scene.title}
        </h2>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, position: "relative" }}>
          {/* Connecting lines */}
          {steps.slice(0, -1).map((_, idx) => (
            <div
              key={`line-${idx}`}
              style={{
                position: "absolute",
                top: "50%",
                left: `calc(50% + ${(idx - (steps.length - 1) / 2) * spacing + nodeRadius}px)`,
                width: `${spacing - 2 * nodeRadius}px`,
                height: "4px",
                background: "linear-gradient(90deg, #38bdf8 0%, #818cf8 100%)",
                transform: `translateX(-50%) translateY(-50%)`,
                opacity: Interpolate(frame - idx * 8, [0, durationFrames * 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              }}
            />
          ))}

          {steps.map((step, idx) => {
            const stepFrame = frame - idx * 10;
            const stepOpacity = Interpolate(stepFrame, [0, durationFrames * 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const stepScale = Interpolate(stepFrame, [0, durationFrames * 0.4], [0.5, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  transform: `scale(${stepScale})`,
                  opacity: stepOpacity,
                  transition: "all 0.3s ease",
                  zIndex: 10,
                }}
              >
                <div
                  style={{
                    width: `${nodeRadius * 2}px`,
                    height: `${nodeRadius * 2}px`,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    fontWeight: "700",
                    color: "#0f172a",
                    boxShadow: "0 0 30px rgba(56, 189, 248, 0.4)",
                    border: "3px solid rgba(255,255,255,0.2)",
                  }}
                >
                  {step.number}
                </div>
                <p
                  style={{
                    marginTop: "16px",
                    fontSize: "20px",
                    fontWeight: "500",
                    textAlign: "center",
                    maxWidth: "180px",
                    color: "#e2e8f0",
                    lineHeight: 1.4,
                  }}
                >
                  {step.text}
                </p>
              </div>
            );
          })}
        </div>

        {scene.narration && (
          <p
            style={{
              marginTop: "48px",
              fontSize: "20px",
              color: "#94a3b8",
              textAlign: "center",
              lineHeight: 1.6,
              maxWidth: "800px",
              opacity: Interpolate(frame, [durationFrames * 0.5, durationFrames * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}
          >
            {scene.narration}
          </p>
        )}
      </div>
    </AbsoluteFill>
  );
};