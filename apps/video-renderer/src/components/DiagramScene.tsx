import React from "react";
import { AbsoluteFill } from "remotion";
import { fadeIn, slideUp, springScale } from "../utils/animation";

interface SceneProps {
  scene: any;
  storyboard: any;
}

export const DiagramScene: React.FC<SceneProps> = ({ scene, storyboard }) => {
  const { fps } = useVideoConfig();
  const durationFrames = scene.duration_sec * fps;
  const frame = React.useFrame();

  const contentOpacity = fadeIn(frame, durationFrames * 0.3);
  const diagramScale = springScale(frame, fps);

  const elements = scene.visual_spec.props.elements || [];
  const connections = scene.visual_spec.props.connections || [];

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "80px",
        backgroundColor: "#f8fafc",
        color: "#1e293b",
      }}
    >
      <div
        style={{
          transform: `translateY(${slideUp(frame, durationFrames * 0.5, 30)}px)`,
          opacity: fadeIn(frame, durationFrames * 0.4),
          textAlign: "center",
          maxWidth: "1000px",
        }}
      >
        <h2 style={{ fontSize: "42px", fontWeight: "700", marginBottom: "40px", color: "#1e3a5f" }}>
          {scene.title}
        </h2>

        <div
          style={{
            transform: `scale(${diagramScale})`,
            opacity: contentOpacity,
            position: "relative",
            width: "800px",
            height: "500px",
          }}
        >
          {elements.map((el: any, index: number) => {
            const elFrame = frame - index * 10;
            const elOpacity = fadeIn(elFrame, durationFrames * 0.2);
            const elScale = springScale(elFrame, fps);

            return (
              <div
                key={el.id}
                style={{
                  position: "absolute",
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  transform: `translate(-50%, -50%) scale(${elScale})`,
                  opacity: elOpacity,
                  transition: "all 0.3s ease",
                }}
              >
                <div
                  style={{
                    width: el.width || 160,
                    height: el.height || 100,
                    backgroundColor: el.color || "#3b82f6",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "16px",
                    textAlign: "center",
                    padding: "16px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  }}
                >
                  {el.label}
                </div>
              </div>
            );
          })}

          {connections.map((conn: any, index: number) => (
            <svg
              key={index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
              }}
            >
              <line
                x1={`${conn.from.x}%`}
                y1={`${conn.from.y}%`}
                x2={`${conn.to.x}%`}
                y2={`${conn.to.y}%`}
                stroke="#64748b"
                strokeWidth="3"
                strokeDasharray="10,5"
                style={{
                  opacity: fadeIn(frame - index * 10, durationFrames * 0.3),
                }}
              />
            </svg>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};