import React from "react";
import { AbsoluteFill } from "remotion";
import { fadeIn, slideUp, typewriter } from "../utils/animation";

interface SceneProps {
  scene: any;
  storyboard: any;
}

export const ConceptScene: React.FC<SceneProps> = ({ scene, storyboard }) => {
  const { fps } = useVideoConfig();
  const durationFrames = scene.duration_sec * fps;
  const frame = React.useFrame();

  const contentOpacity = fadeIn(frame, durationFrames * 0.4);
  const contentY = slideUp(frame, durationFrames * 0.6, 40);
  const bulletDelay = durationFrames * 0.1;

  const bullets = scene.visual_spec.props.bullets || [scene.narration];
  const typedText = scene.visual_spec.props.typed_text || "";

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "80px 120px",
        backgroundColor: "#f8fafc",
        color: "#1e293b",
      }}
    >
      <div
        style={{
          transform: `translateY(${contentY}px)`,
          opacity: contentOpacity,
          maxWidth: "1000px",
          width: "100%",
        }}
      >
        <h2
          style={{
            fontSize: "48px",
            fontWeight: "700",
            marginBottom: "32px",
            color: "#1e3a5f",
            textAlign: "center",
          }}
        >
          {scene.title}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {bullets.map((bullet: string, index: number) => {
            const bulletFrame = frame - index * 15;
            const bulletOpacity = fadeIn(bulletFrame, durationFrames * 0.3);
            const bulletY = slideUp(bulletFrame, durationFrames * 0.4, 20);

            return (
              <div
                key={index}
                style={{
                  transform: `translateY(${bulletY}px)`,
                  opacity: bulletOpacity,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "16px",
                  fontSize: "28px",
                  lineHeight: 1.6,
                }}
              >
                <span
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    backgroundColor: "#3b82f6",
                    marginTop: "8px",
                    flexShrink: 0,
                  }}
                />
                <span>{bullet}</span>
              </div>
            );
          })}

          {typedText && (
            <div
              style={{
                marginTop: "32px",
                padding: "24px",
                backgroundColor: "#1e293b",
                borderRadius: "12px",
                fontFamily: "monospace",
                fontSize: "22px",
                color: "#e2e8f0",
                whiteSpace: "pre-wrap",
                overflow: "hidden",
              }}
            >
              {typedText.slice(0, typewriter(frame, durationFrames * 0.8, typedText.length))}
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};