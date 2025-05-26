/* eslint-disable @typescript-eslint/ban-ts-comment */
import "https://vjs.zencdn.net/8.3.0/video.js";
import "https://cdn.dashjs.org/v4.7.2/dash.all.min.js";
import "../c2pa/c2pa-player.css";

import { Button, Container, Header } from "@cloudscape-design/components";
import { c2pa_init } from "../c2pa/plugin-dash/c2pa-dash-plugin.js";
import { C2PAPlayer } from "../c2pa/C2paPlayer/main.js";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export const FMP4Inspect = () => {
  const [searchParams] = useSearchParams();
  const assetId = searchParams.get("asset");

  const [, setPlayer] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);

  const basePath = import.meta.env.VITE_CLOUDFRONTURL || "";
  const url = `${basePath}/${assetId}output.mpd`;
  const videoId = "videoPlayer";
  const autoPlay = false;
  const options = {};

  useEffect(() => {
    initializeDash(url, options, autoPlay);
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  const initializeDash = useCallback((
    url: string,
    options?: Record<string, any>,
    autoPlay = false
  ) => {
    console.log("initializeDash", url, options, autoPlay);
    if (!videoRef.current || playerRef.current) return;

    // @ts-ignore
    const player = dashjs.MediaPlayer().create();
    const playerOptions = {
      fluid: true,
      autoplay: autoPlay,
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

    // @ts-expect-error
    const videoJsPlayer = videojs(videoRef.current, playerOptions);
    playerRef.current = videoJsPlayer;
    videoJsPlayer.log("onPlayerReady");
    

    const c2paJsPlayer = new C2PAPlayer(videoJsPlayer, videoRef.current);
    c2paJsPlayer.initialize();

    c2pa_init(player, function (e) {
      console.log("c2pa_init", e);
      c2paJsPlayer.playbackUpdate(e.c2pa_status);
    }).then(() => {
      player.initialize(videoRef.current, url, autoPlay);
    });

    setPlayer(player);
  }, []);

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
