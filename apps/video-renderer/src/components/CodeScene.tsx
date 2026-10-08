import React from "react";
import { AbsoluteFill } from "remotion";
import { fadeIn, slideUp, typewriter } from "../utils/animation";

interface SceneProps {
  scene: any;
  storyboard: any;
}

export const CodeScene: React.FC<SceneProps> = ({ scene, storyboard }) => {
  const { fps } = useVideoConfig();
  const durationFrames = scene.duration_sec * fps;
  const frame = React.useFrame();

  const code = scene.visual_spec.props.code || "";
  const language = scene.visual_spec.props.language || "python";
  const lines = code.split("\n");

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
        backgroundColor: "#0d1117",
        color: "#e2e8f0",
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
        <h2 style={{ fontSize: "36px", fontWeight: "600", marginBottom: "24px", color: "#58a6ff" }}>
          {scene.title}
        </h2>

        <div
          style={{
            backgroundColor: "#161b22",
            border: "1px solid #30363d",
            borderRadius: "12px",
            overflow: "hidden",
            fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', 'Droid Sans Mono', monospace",
            fontSize: "20px",
            lineHeight: 1.7,
          }}
        >
          <div style={{ backgroundColor: "#21262d", padding: "12px 16px", borderBottom: "1px solid #30363d", display: "flex", gap: "8px" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#ff5f57" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#ffbd2e" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#28ca42" }} />
            <span style={{ marginLeft: "16px", color: "#8b949e", fontSize: "14px" }}>{language}</span>
          </div>
          <pre style={{ padding: "24px", margin: 0, overflow: "auto" }}>
            <code>
              {lines.map((line: string, index: number) => {
                const lineFrame = frame - index * 5;
                const lineOpacity = fadeIn(lineFrame, durationFrames * 0.2);
                const lineTyped = typewriter(lineFrame, durationFrames * 0.1, line.length);

                return (
                  <div key={index} style={{ opacity: lineOpacity, whiteSpace: "pre" }}>
                    <span style={{ color: "#8b949e", marginRight: "16px", userSelect: "none" }}>
                      {String(index + 1).padStart(3, " ")}
                    </span>
                    <span>{line.slice(0, lineTyped)}</span>
                    <br />
                  </div>
                );
              })}
            </code>
          </pre>
        </div>
      </div>
    </AbsoluteFill>
  );
};