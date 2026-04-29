import { Composition } from "remotion";
import { DemoVideo } from "./compositions/DemoVideo";
import { AdVideo } from "./compositions/AdVideo";
import { TikTokAdVideo } from "./compositions/TikTokAdVideo";
import { RedditAdVideo } from "./compositions/RedditAdVideo";
import { RedditPaidAdVideo } from "./compositions/RedditPaidAdVideo";

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
      {/* Vertical editorial hook — original < 9s */}
      <Composition
        id="ad"
        component={AdVideo}
        durationInFrames={255}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Vertical product-UI ad — 12s, real game thread + end card + CTA */}
      <Composition
        id="tiktok"
        component={TikTokAdVideo}
        durationInFrames={360}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Reddit-native organic — square, 18s, no brand chrome */}
      <Composition
        id="reddit"
        component={RedditAdVideo}
        durationInFrames={540}
        fps={30}
        width={1080}
        height={1080}
      />
      {/* Reddit Promoted Post — 4:5, 15s, cold-open hook, no end card */}
      <Composition
        id="reddit-paid"
        component={RedditPaidAdVideo}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1350}
      />
    </>
  );
};
