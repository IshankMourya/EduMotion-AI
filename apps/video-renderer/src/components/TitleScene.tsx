import React from "remotion";
import { useVideoConfig, AbsoluteFill, Sequence } from "remotion";
import { fadeIn, slideUp, typewriter } from "../utils/animation";

interface SceneProps {
  scene: any;
  storyboard: any;
}

export const TitleScene: React.FC<SceneProps> = ({ scene, storyboard }) => {
  const { fps, width, height } = useVideoConfig();
  const durationFrames = scene.duration_sec * fps;

  const titleOpacity = fadeIn(React.useFrame(), durationFrames * 0.5);
  const subtitleOpacity = fadeIn(React.useFrame(), durationFrames * 0.5, durationFrames * 0.3);
  const titleY = slideUp(React.useFrame(), durationFrames * 0.8, 30);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "100px",
        backgroundColor: "#1e3a5f",
        color: "#ffffff",
        opacity: 1,
      }}
    >
      <div
        style={{
          transform: `translateY(${titleY}px)`,
          opacity: titleOpacity,
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "72px",
            fontWeight: "bold",
            margin: 0,
            lineHeight: 1.1,
            maxWidth: "90%",
          }}
        >
          {scene.visual_spec.props.title || scene.title}
        </h1>
        {scene.visual_spec.props.subtitle && (
          <p
            style={{
              fontSize: "28px",
              marginTop: "24px",
              opacity: subtitleOpacity,
              fontWeight: 300,
              maxWidth: "80%",
            }}
          >
            {scene.visual_spec.props.subtitle}
          </p>
        )}
      </div>

      <div
        style={{
          marginTop: "60px",
          padding: "16px 48px",
          border: "2px solid rgba(255,255,255,0.3)",
          borderRadius: "50px",
          opacity: fadeIn(React.useFrame(), durationFrames * 0.3, durationFrames * 0.6),
        }}
      >
        <span style={{ fontSize: "18px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          EduMotion AI
        </span>
      </div>
    </AbsoluteFill>
  );
};