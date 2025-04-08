/**
 * @module c2pa-player
 * @param {object=} videoJsPlayer - videojs reference
 * @param {object=} videoHtml - video html element
 */

import { initializeC2PAControlBar } from "./C2paControlBar/C2paControlBarFunctions.js";
import {
  displayFrictionOverlay,
  initializeFrictionOverlay,
} from "./C2paFrictionModal/C2paFrictionModalFunctions.js";
import {
  adjustC2PAMenu,
  initializeC2PAMenu,
  updateC2PAMenu,
} from "./C2paMenu/C2paMenuFunctions.js";
import { getTimelineFunctions } from "./C2paTimeline/C2paTimelineFunctions.js";

export var C2PAPlayer = function (
  videoJsPlayer,
  videoHtml,
  isMonolithic = false
) {
  //Video.js player instance
  let videoPlayer = videoJsPlayer;
  const videoElement = videoHtml;

  //c2pa menu and control bar elements
  let c2paMenu;
  let c2paControlBar;
  let {
    getCompromisedRegions,
    handleC2PAValidation,
    handleOnSeeked,
    handleOnSeeking,
    updateC2PATimeline,
  } = getTimelineFunctions();

  //An overlay to be shown to the user in case the initial manifest validation fails
  //Used to warn the user the content cannot be trusted
  let frictionOverlay;
  let isManifestInvalid = false; //TODO: placeholder, this should be set based on info from the c2pa validation

  let seeking = false;
  let playbackStarted = false;
  let lastPlaybackTime = 0.0;

  //A playback update above this threshold is considered a seek
  const minSeekTime = 0.5;

  //Adjust height of c2pa menu with respect to the whole player
  const c2paMenuHeightOffset = 30;

  let setPlaybackStarted = function () {
    playbackStarted = true;
  };

  //Public API
  return {
    initialize: function () {
      console.log("[C2PA] Initializing C2PAPlayer", videoPlayer, videoElement);

      //Initialize c2pa timeline and menu
      initializeC2PAControlBar(videoPlayer);
      initializeC2PAMenu(videoPlayer, c2paMenu);
      //Initialize friction overlay to be displayed if initial manifest validation fails
      frictionOverlay = initializeFrictionOverlay(
        videoPlayer,
        setPlaybackStarted
      );

      //Get c2pa menu and control bar elements from html
      c2paMenu = videoPlayer.controlBar.getChild("C2PAMenuButton");
      c2paControlBar = videoPlayer.controlBar.progressControl.seekBar.getChild(
        "C2PALoadProgressBar"
      );

      videoPlayer.on("play", function () {
        if (isManifestInvalid && !playbackStarted) {
          console.log("[C2PA] Manifest invalid, displaying friction overlay");
          displayFrictionOverlay(playbackStarted, videoPlayer, frictionOverlay);
        } else {
          setPlaybackStarted();
        }
      });

      videoPlayer.on("seeked", function () {
        seeking = handleOnSeeked(videoPlayer.currentTime());
      });

      videoPlayer.on("seeking", function () {
        let seekResults = handleOnSeeking(
          videoPlayer.currentTime(),
          playbackStarted,
          lastPlaybackTime,
          isMonolithic,
          c2paControlBar,
          videoPlayer
        );
        seeking = seekResults[0];
        lastPlaybackTime = seekResults[1];
      });

      //Resize the c2pa menu
      //TODO: This is a workaround to resize the menu, as the menu is not resized when the player is resized
      setInterval(function () {
        adjustC2PAMenu(c2paMenu, videoElement, c2paMenuHeightOffset);
      }, 500);
      adjustC2PAMenu(c2paMenu, videoElement, c2paMenuHeightOffset);

      console.log("[C2PA] Initialization complete");
    },

    //Playback update with updates on c2pa manifest and validation
    playbackUpdate: function (c2paStatus) {
      const currentTime = videoPlayer.currentTime();

      //We only update the c2pa timeline if the playback is not seeking and the playback time has increased
      if (
        !seeking &&
        currentTime >= lastPlaybackTime &&
        currentTime - lastPlaybackTime < minSeekTime
      ) {
        console.log(
          "[C2PA] Validation update: ",
          lastPlaybackTime,
          currentTime
        );

        //Creates new c2pa progress segment to be added to the progress bar
        handleC2PAValidation(c2paStatus.verified, currentTime, c2paControlBar);
        //Update c2pa progress timeline
        updateC2PATimeline(currentTime, videoPlayer, c2paControlBar);
        //Update c2pa menu based on manifest
        updateC2PAMenu(
          c2paStatus,
          c2paMenu,
          isMonolithic,
          videoPlayer,
          getCompromisedRegions
        );
      }

      lastPlaybackTime = currentTime;
    },
  };
};
