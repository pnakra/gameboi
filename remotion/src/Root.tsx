import { Composition } from "remotion";
import { DemoVideo } from "./compositions/DemoVideo";
import { AdVideo } from "./compositions/AdVideo";

export const RemotionRoot = () => {
  return (
    <>
      {/* Landscape walkthrough — for sharing with people / LLMs */}
      <Composition
        id="demo"
        component={DemoVideo}
        durationInFrames={600}
        fps={30}
        width={1920}
        height={1080}
      />
      {/* Vertical hook — for TikTok / Reddit ads, < 9s */}
      <Composition
        id="ad"
        component={AdVideo}
        durationInFrames={255}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
