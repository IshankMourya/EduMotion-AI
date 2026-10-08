import React from "react";
import { AbsoluteFill } from "remotion";
import { fadeIn, slideUp, springScale } from "../utils/animation";

interface SceneProps {
  scene: any;
  storyboard: any;
}

export const ChartScene: React.FC<SceneProps> = ({ scene, storyboard }) => {
  const { fps } = useVideoConfig();
  const durationFrames = scene.duration_sec * fps;
  const frame = React.useFrame();

  const chartType = scene.visual_spec.props.chartType || "bar";
  const data = scene.visual_spec.props.data || [];
  const labels = scene.visual_spec.props.labels || [];
  const colors = scene.visual_spec.props.colors || ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

  const contentOpacity = fadeIn(frame, durationFrames * 0.3);
  const contentY = slideUp(frame, durationFrames * 0.5, 30);

  const maxValue = Math.max(...data, 1);
  const chartWidth = 800;
  const chartHeight = 400;
  const padding = { top: 40, right: 40, bottom: 60, left: 80 };
  const barWidth = (chartWidth - padding.left - padding.right) / Math.max(data.length, 1) * 0.7;

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
          transform: `translateY(${contentY}px)`,
          opacity: contentOpacity,
          textAlign: "center",
          maxWidth: "1000px",
        }}
      >
        <h2 style={{ fontSize: "42px", fontWeight: "700", marginBottom: "40px", color: "#1e3a5f" }}>
          {scene.title}
        </h2>

        <div style={{ position: "relative", width: chartWidth, height: chartHeight }}>
          <svg width={chartWidth} height={chartHeight}>
            {/* Y axis */}
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={chartHeight - padding.bottom}
              stroke="#94a3b8"
              strokeWidth={2}
            />
            {/* X axis */}
            <line
              x1={padding.left}
              y1={chartHeight - padding.bottom}
              x2={chartWidth - padding.right}
              y2={chartHeight - padding.bottom}
              stroke="#94a3b8"
              strokeWidth={2}
            />

            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
              <line
                key={ratio}
                x1={padding.left}
                y1={padding.top + (chartHeight - padding.top - padding.bottom) * ratio}
                x2={chartWidth - padding.right}
                y2={padding.top + (chartHeight - padding.top - padding.bottom) * ratio}
                stroke="#e2e8f0"
                strokeWidth={1}
                strokeDasharray="5,5"
              />
            ))}

            {/* Bars */}
            {data.map((value: number, index: number) => {
              const barHeight = (value / maxValue) * (chartHeight - padding.top - padding.bottom);
              const x = padding.left + (chartWidth - padding.left - padding.right) * (index / Math.max(data.length - 1, 1)) + (chartWidth - padding.left - padding.right) / (data.length * 2) - barWidth / 2;
              const y = chartHeight - padding.bottom - barHeight;

              const barFrame = frame - index * 8;
              const barScale = springScale(barFrame, fps);

              return (
                <React.Fragment key={index}>
                  <rect
                    x={x}
                    y={chartHeight - padding.bottom - barHeight * barScale}
                    width={barWidth}
                    height={barHeight * barScale}
                    fill={colors[index % colors.length]}
                    rx={6}
                    ry={6}
                    style={{
                      opacity: fadeIn(barFrame, durationFrames * 0.3),
                      transformOrigin: `center ${chartHeight - padding.bottom}`,
                    }}
                  />
                  {/* Value label */}
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight - padding.bottom - barHeight * barScale - 10}
                    textAnchor="middle"
                    fontSize="16"
                    fontWeight="600"
                    fill="#1e293b"
                    style={{ opacity: fadeIn(barFrame, durationFrames * 0.3) }}
                  >
                    {value}
                  </text>
                  {/* Label */}
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight - padding.bottom + 25}
                    textAnchor="middle"
                    fontSize="14"
                    fill="#64748b"
                    style={{ opacity: fadeIn(barFrame, durationFrames * 0.3) }}
                  >
                    {labels[index] || `Item ${index + 1}`}
                  </text>
                </React.Fragment>
              );
            })}
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};