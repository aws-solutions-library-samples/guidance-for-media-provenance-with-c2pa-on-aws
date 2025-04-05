import "https://vjs.zencdn.net/8.3.0/video.js";
import "https://cdn.dashjs.org/v4.7.2/dash.all.min.js";
import "../c2pa/c2pa-player.css";

import { useEffect, useRef, useState } from "react";
import { c2pa_init } from "../../../c2pa/plugin-dash/c2pa-dash-plugin.js";
import { C2PAPlayer } from "../../../c2pa/C2paPlayer/main.js";
import { Button, Container, Header } from "@cloudscape-design/components";

export const FMP4Inspect = () => {
  const [_player, setPlayer] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const url = "https://cc-assets.netlify.app/video/fmp4-samples/boat.mpd";
  const videoId = "videoPlayer";
  const autoPlay = false;
  const options = {};

  useEffect(() => {
    // Initialize dash when component mounts
    initializeDash(url, options, autoPlay);

    // Cleanup when component unmounts
    return () => {
      // Optional: Add cleanup if needed
      setPlayer(null);
    };
  }, []);

  const initializeDash = (
    url: string,
    options?: Record<string, any>,
    autoPlay = false
  ) => {
    console.log("initializeDash", url, options, autoPlay);
    const player = dashjs.MediaPlayer().create();
    const playerOptions = {
      fluid: true,
      controlBar: {
        children: [
          "playToggle",
          "progressControl",
          "currentTimeDisplay",
          "volumePanel",
          "pictureInPictureToggle",
          "fullscreenToggle",
        ],
      },
    };

    /* Create videojs player and c2pa player */
    /* Responsible for UI and playback control */
    const video = document.querySelector(`#${videoId}`) as HTMLVideoElement;
    const videoJsPlayer = videojs(videoId, playerOptions, () => {
      videojs.log("onPlayerReady");
    });

    const c2paJsPlayer = new C2PAPlayer(videoJsPlayer, video);
    c2paJsPlayer.initialize();

    c2pa_init(player, function (e) {
      /* Update c2pa player with current c2pa status update */
      console.log("c2pa_init", e);
      c2paJsPlayer.playbackUpdate(e.c2pa_status);
    }).then(() => {
      player.initialize(video, url, true);
    });

    setPlayer(player);
  };

  return (
    <Container
      header={
        <Header
          actions={
            <Button
              iconName="external"
              href="https://github.com/contentauth/dash.js/tree/c2pa-dash/samples/c2pa"
              target="_blank"
            >
              dash.js
            </Button>
          }
          description="Use this screen to verify using dash.js"
        >
          Dash Player
        </Header>
      }
    >
      <video
        style={{ maxWidth: "100%" }}
        ref={videoRef}
        id={videoId}
        className={"video-js"}
        controls={true}
        autoPlay={autoPlay}
      />
    </Container>
  );
};
