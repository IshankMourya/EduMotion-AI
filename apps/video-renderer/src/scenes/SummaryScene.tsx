import React from "react";
import { AbsoluteFill, Interpolate } from "remotion";
import { fadeIn, slideUp, springScale } from "../utils/animation";

interface SceneProps {
  scene: any;
  index: number;
  progress: number;
}

export const SummaryScene: React.FC<SceneProps> = ({ scene, progress }) => {
  const durationFrames = scene.duration_seconds * 30;
  const frame = progress * durationFrames;

  // Parse key points from body_text
  const points = scene.body_text
    .split("\n")
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0)
    .map((l: string) => l.replace(/^[-•*]\s*/, ""));

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "80px 120px",
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
        color: "#ffffff",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          width: "100%",
          textAlign: "center",
          opacity: Interpolate(frame, [0, durationFrames * 0.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${Interpolate(frame, [0, durationFrames * 0.3], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
        }}
      >
        <h2
          style={{
            fontSize: "48px",
            fontWeight: "800",
            marginBottom: "48px",
            background: "linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Key Takeaways
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px", textAlign: "left" }}>
          {points.map((point: string, idx: number) => {
            const pointFrame = frame - idx * 10;
            const pointOpacity = Interpolate(pointFrame, [0, durationFrames * 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const pointScale = Interpolate(pointFrame, [0, durationFrames * 0.4], [0.8, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

            return (
              <div
                key={idx}
                style={{
                  transform: `scale(${pointScale})`,
                  opacity: pointOpacity,
                  padding: "24px 32px",
                  background: "rgba(99, 102, 241, 0.1)",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "24px",
                  transition: "all 0.3s ease",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "700",
                    fontSize: "20px",
                    color: "#ffffff",
                    flexShrink: 0,
                    boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)",
                  }}
                >
                  {idx + 1}
                </div>
                <p
                  style={{
                    fontSize: "24px",
                    fontWeight: "400",
                    lineHeight: 1.6,
                    margin: 0,
                    color: "#e2e8f0",
                    flex: 1,
                  }}
                >
                  {point}
                </p>
              </div>
            );
          })}
        </div>

        {scene.narration && (
          <div
            style={{
              marginTop: "48px",
              padding: "24px 48px",
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              borderRadius: "50px",
              opacity: Interpolate(frame, [durationFrames * 0.5, durationFrames * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              transform: `translateY(${Interpolate(frame, [durationFrames * 0.5, durationFrames * 0.8], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
            }}
          >
            <span style={{ fontSize: "24px", fontWeight: "600", color: "#ffffff" }}>
              {scene.narration}
            </span>
          </div>
        )}

        <div
          style={{
            marginTop: "60px",
            opacity: Interpolate(frame, [durationFrames * 0.7, durationFrames * 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          <p style={{ fontSize: "18px", color: "#64748b", margin: 0 }}>
            Thank you for watching
          </p>
          <p style={{ fontSize: "16px", color: "#475569", marginTop: "8px" }}>
            Generated with EduMotion AI
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};