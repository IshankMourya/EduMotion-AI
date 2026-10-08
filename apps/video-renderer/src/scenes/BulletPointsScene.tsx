import React from "react";
import { AbsoluteFill, Interpolate } from "remotion";
import { fadeIn, slideUp, slideRight, springScale } from "../utils/animation";

interface SceneProps {
  scene: any;
  index: number;
  progress: number;
}

export const BulletPointsScene: React.FC<SceneProps> = ({ scene, progress }) => {
  const durationFrames = scene.duration_seconds * 30;
  const frame = progress * durationFrames;

  // Parse bullet points from body_text
  const bulletPoints = scene.body_text
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

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {bulletPoints.map((point: string, idx: number) => {
            const pointFrame = frame - idx * 8;
            const pointProgress = pointFrame / durationFrames;
            const pointOpacity = Interpolate(pointFrame, [0, durationFrames * 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const pointX = Interpolate(pointFrame, [0, durationFrames * 0.4], [-40, 0], { extrapolateLeft: "clamp", extrapulateRight: "clamp" });

            return (
              <div
                key={idx}
                style={{
                  transform: `translateX(${pointX}px)`,
                  opacity: pointOpacity,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "20px",
                  padding: "20px 24px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  backdropFilter: "blur(10px)",
                }}
              >
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)",
                    marginTop: "6px",
                    flexShrink: 0,
                    boxShadow: "0 0 12px rgba(56, 189, 248, 0.5)",
                  }}
                />
                <p
                  style={{
                    fontSize: "24px",
                    lineHeight: 1.5,
                    margin: 0,
                    color: "#e2e8f0",
                  }}
                >
                  {point}
                </p>
              </div>
            );
          })}
        </div>

        {scene.narration && (
          <p
            style={{
              marginTop: "40px",
              fontSize: "20px",
              color: "#94a3b8",
              textAlign: "center",
              lineHeight: 1.6,
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