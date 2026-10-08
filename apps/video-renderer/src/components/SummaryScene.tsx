import React from "react";
import { AbsoluteFill } from "remotion";
import { fadeIn, slideUp, typewriter } from "../utils/animation";

interface SceneProps {
  scene: any;
  storyboard: any;
}

export const SummaryScene: React.FC<SceneProps> = ({ scene, storyboard }) => {
  const { fps } = useVideoConfig();
  const durationFrames = scene.duration_sec * fps;
  const frame = React.useFrame();

  const keyPoints = scene.visual_spec.props.key_points || [scene.narration];
  const cta = scene.visual_spec.props.cta || "Thanks for watching!";

  const contentOpacity = fadeIn(frame, durationFrames * 0.3);
  const contentY = slideUp(frame, durationFrames * 0.5, 30);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "80px 120px",
        backgroundColor: "#1e3a5f",
        color: "#ffffff",
      }}
    >
      <div
        style={{
          transform: `translateY(${contentY}px)`,
          opacity: contentOpacity,
          maxWidth: "1000px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: "48px", fontWeight: "700", marginBottom: "40px" }}>
          Key Takeaways
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px", textAlign: "left" }}>
          {keyPoints.map((point: string, index: number) => {
            const pointFrame = frame - index * 15;
            const pointOpacity = fadeIn(pointFrame, durationFrames * 0.3);
            const pointY = slideUp(pointFrame, durationFrames * 0.4, 20);

            return (
              <div
                key={index}
                style={{
                  transform: `translateY(${pointY}px)`,
                  opacity: pointOpacity,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "20px",
                  padding: "24px",
                  backgroundColor: "rgba(255,255,255,0.1)",
                  borderRadius: "16px",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: "#3b82f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    fontSize: "18px",
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </div>
                <p style={{ fontSize: "24px", lineHeight: 1.6, margin: 0, flex: 1 }}>
                  {point}
                </p>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: "60px",
            padding: "24px 48px",
            backgroundColor: "#3b82f6",
            borderRadius: "50px",
            fontSize: "22px",
            fontWeight: 600,
            opacity: fadeIn(frame, durationFrames * 0.3, durationFrames * 0.7),
          }}
        >
          {cta}
        </div>
      </div>
    </AbsoluteFill>
  );
};