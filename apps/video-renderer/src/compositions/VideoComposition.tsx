import React from "react";
import { Composition, AbsoluteFill, Sequence, getInputProps, useVideoConfig } from "remotion";
import {
  TitleScene,
  DefinitionScene,
  BulletPointsScene,
  ProcessScene,
  ExampleScene,
  SummaryScene,
} from "../scenes";

const sceneComponents: Record<string, React.FC<{ scene: any; progress: number; index: number }>> = {
  title: TitleScene,
  definition: DefinitionScene,
  bullet_points: BulletPointsScene,
  process: ProcessScene,
  example: ExampleScene,
  summary: SummaryScene,
};

interface SceneWrapperProps {
  scene: any;
  index: number;
}

const SceneWrapper: React.FC<SceneWrapperProps> = ({ scene, index }) => {
  const { fps } = useVideoConfig();
  const durationFrames = scene.duration_seconds * fps;
  const frame = React.useFrame();
  const progress = frame / durationFrames;

  const Component = sceneComponents[scene.visual_type] || BulletPointsScene;

  return (
    <Sequence from={0} durationInFrames={durationFrames}>
      <Component scene={scene} index={index} progress={progress} />
    </Sequence>
  );
};

const VideoComposition: React.FC = () => {
  const inputProps = getInputProps();
  const storyboard = inputProps?.storyboard || {
    scenes: [],
    total_duration_seconds: 60,
    metadata: {},
  };
  const { fps } = useVideoConfig();

  const totalFrames = storyboard.total_duration_seconds * fps;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      {storyboard.scenes.map((scene: any, index: number) => {
        const startFrame = storyboard.scenes
          .slice(0, index)
          .reduce((acc: number, s: any) => acc + s.duration_seconds * fps, 0);
        return (
          <Sequence key={scene.id} from={startFrame} durationInFrames={scene.duration_seconds * fps}>
            <SceneWrapper scene={scene} index={index} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const RootComposition: React.FC = () => {
  const inputProps = getInputProps();
  const storyboard = inputProps?.storyboard || {
    scenes: [],
    total_duration_seconds: 60,
    metadata: {},
  };

  return (
    <Composition
      id="VideoComposition"
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={storyboard.total_duration_seconds * 30}
      component={VideoComposition}
    />
  );
};

export default RootComposition;