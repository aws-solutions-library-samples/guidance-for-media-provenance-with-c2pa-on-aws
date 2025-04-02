export function getTimelineFunctions() {
  //List of segments to be added to the progress bar, showing the c2pa validation status
  let progressSegments = [];

  let handleOnSeeked = function (time) {
    console.log('[C2PA] Player seeked: ', time);
    const seeking = false;
    return seeking;
  };

  let handleOnSeeking = function (time , playbackStarted , lastPlaybackTime , isMonolithic , c2paControlBar , videoPlayer) {
    console.log('[C2PA] Player seeking: ', time);
    let seeking = true;

    if (time === 0) {
        console.log('[C2PA] Player resetting');
        progressSegments.forEach((segment) => {
            segment.remove();
        });

        progressSegments = [];
        const resetPlaybackTime = 0.0;
        seeking = false;

        updateC2PAButton(videoPlayer);
        return [seeking , resetPlaybackTime];
    }

    //A seek event is triggered at the beginning of the playback, so we ignore it
    if (playbackStarted && time > 0 && progressSegments.length > 0) {
        handleSeekC2PATimeline(time, isMonolithic, c2paControlBar, videoPlayer);
    }

    return [seeking , lastPlaybackTime];
};

let handleSeekC2PATimeline = function (seekTime, isMonolithic, c2paControlBar, videoPlayer) {
    console.log('[C2PA] Handle seek to: ', seekTime);
    //Remove segments that are not active anymore
    progressSegments = progressSegments.filter((segment) => {
      const segmentStartTime = parseFloat(segment.dataset.startTime);
      const segmentEndTime = parseFloat(segment.dataset.endTime);
      let isSegmentActive =
        seekTime >= segmentEndTime ||
        (seekTime < segmentEndTime && seekTime >= segmentStartTime);

      if (!isSegmentActive) {
        segment.remove(); // Remove the segment element from the DOM
      }

      return isSegmentActive;
    });

    const lastSegment = progressSegments[progressSegments.length - 1];
    if (lastSegment) {
        if (lastSegment.dataset.endTime > seekTime) {
            //Adjust end time of last segment if seek time is lower than the previous end time
            lastSegment.dataset.endTime = seekTime;
        } else {
            if (!isMonolithic && lastSegment.dataset.endTime != seekTime && lastSegment.dataset.verificationStatus != "unknown") {
                //In the streaming case, if there was a jump ahead in the timeline, we do not know the validation status
                //Therefore, we create an unkwown segment and add it to the timeline
                const segment = createTimelineSegment(lastSegment.dataset.endTime, seekTime, 'unknown');
                c2paControlBar.el().appendChild(segment);
                progressSegments.push(segment);
            }
        }
    }

    updateC2PATimeline(seekTime, videoPlayer, c2paControlBar);
};
    //Create a new progress segment to be added to the c2pa progress bar
let createTimelineSegment = function (
    segmentStartTime,
    segmentEndTime,
    verificationStatus,
    isManifestInvalid,
  ) {
    const segment = document.createElement('div');
    segment.className = 'seekbar-play-c2pa';
    //Width is initially set to zero, and increased directly as playback progresses
    segment.style.width = '0%';
    segment.dataset.startTime = segmentStartTime;
    segment.dataset.endTime = segmentEndTime;
    segment.dataset.verificationStatus = verificationStatus;

    if (isManifestInvalid) {
      segment.style.backgroundColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--c2pa-failed')
        .trim();
    } else {
      if (verificationStatus == 'true') {
        //c2pa validation passed
        segment.style.backgroundColor = getComputedStyle(
          document.documentElement,
        )
          .getPropertyValue('--c2pa-passed')
          .trim();
      } else if (verificationStatus == 'false') {
        //c2pa validation failed
        segment.style.backgroundColor = getComputedStyle(
          document.documentElement,
        )
          .getPropertyValue('--c2pa-failed')
          .trim();
      } else {
        //c2pa validation not available or unkwown
        segment.style.backgroundColor = getComputedStyle(
          document.documentElement,
        )
          .getPropertyValue('--c2pa-unknown')
          .trim();
      }
    }

    return segment;
  };

  let updateC2PATimeline = function (currentTime , videoPlayer, c2paControlBar) {
    console.log('[C2PA] Updating play bar');

    //If no new segments have been added to the timeline, we add a new one with unknown status
    if (progressSegments.length === 0) {
        handleC2PAValidation('unknown', currentTime , c2paControlBar);
    }

    let numSegments = progressSegments.length;
    const lastSegment = progressSegments[numSegments - 1];
    lastSegment.dataset.endTime = currentTime;

    //Update the color of the progress bar tooltip to match with the that of the last segment
    const playProgressControl = videoPlayer
      .el()
      .querySelector('.vjs-play-progress');
    playProgressControl.style.backgroundColor =
      lastSegment.style.backgroundColor;
    playProgressControl.style.color = lastSegment.style.backgroundColor;

    //Update the width of the segments
    let isVideoSegmentInvalid = false;
    progressSegments.forEach((segment) => {
      const segmentStartTime = parseFloat(segment.dataset.startTime);
      const segmentEndTime = parseFloat(segment.dataset.endTime);

      let segmentProgressPercentage = 0;
      if (currentTime >= segmentStartTime && currentTime <= segmentEndTime) {
        //Current time is within the segment extremes
        segmentProgressPercentage =
          (currentTime / videoPlayer.duration()) * 100;
      } else if (currentTime >= segmentEndTime) {
        segmentProgressPercentage =
          (segmentEndTime / videoPlayer.duration()) * 100; //Current time is after the segment end time
      }

      console.log(
        '[C2PA] Segment progress percentage: ',
        segmentProgressPercentage,
      );
      segment.style.width = segmentProgressPercentage + '%';

      //Set the z-index so that segments appear in order of creation
      segment.style.zIndex = numSegments;
      numSegments--;
      console.log('[C2PA] ----');

      if (segment.dataset.verificationStatus == 'false') {
        isVideoSegmentInvalid = true;
      }
    });

    updateC2PAButton(videoPlayer, isVideoSegmentInvalid);
  };

  let updateC2PAButton = function (videoPlayer, isVideoSegmentInvalid = false) {
    const c2paInvalidButton = videoPlayer
      .el()
      .querySelector('.c2pa-menu-button button');
    if (c2paInvalidButton) {
      if (isVideoSegmentInvalid) {
        c2paInvalidButton.classList.add('c2pa-menu-button-invalid');
      } else {
        c2paInvalidButton.classList.remove('c2pa-menu-button-invalid');
      }
    }
  };
  //Format time from seconds to mm:ss
  let formatTime = function (seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
  };

  let handleC2PAValidation = function (
    verificationStatusBool,
    currentTime,
    c2paControlBar,
  ) {
    //Convert verification status to string since this value is saved in the segment dataset
    //If variable is not a boolean, we set the status to unknown
    let verificationStatus = 'unknown';
    if (typeof verificationStatusBool === 'boolean')
      verificationStatus = verificationStatusBool.toString();

    //If no segments have been added to the timeline, or if the validation status has changed with respect to the last segment
    //We add a new segment to the timeline
    if (
      progressSegments.length === 0 ||
      progressSegments[progressSegments.length - 1].dataset
        .verificationStatus != verificationStatus
    ) {
      console.log('[C2PA] New validation status: ', verificationStatus);

      //Update the end time of the last segment
      if (progressSegments.length > 0) {
        const lastSegment = progressSegments[progressSegments.length - 1];
        lastSegment.dataset.endTime = currentTime;
      }

      //Add new segment to the timeline
      const segment = createTimelineSegment(
        currentTime,
        currentTime,
        verificationStatus,
      );
      c2paControlBar.el().appendChild(segment);
      progressSegments.push(segment);
    }
  };

  //Get time regions that have failed the c2pa validation
  let getCompromisedRegions = function (isMonolithic, videoPlayer) {
    let compromisedRegions = [];

    if (isMonolithic) {
      //In the monolithic case, the validation status is known for the entire video. If the validation has failed,
      //the whole video is considered compromised
      if (
        progressSegments.length > 0 &&
        progressSegments[0].dataset.verificationStatus === 'false'
      ) {
        const startTime = 0.0;
        const endTime = videoPlayer.duration();
        compromisedRegions.push(
          formatTime(startTime) + '-' + formatTime(endTime),
        );
      }
    } else {
      //In the streaming case, we get the compromised regions from the segments that have failed the c2pa validation
      progressSegments.forEach((segment) => {
        if (segment.dataset.verificationStatus === 'false') {
          const startTime = parseFloat(segment.dataset.startTime);
          const endTime = parseFloat(segment.dataset.endTime);
          compromisedRegions.push(
            formatTime(startTime) + '-' + formatTime(endTime),
          );
        }
      });
    }

    return compromisedRegions;
  };

  return {
    handleOnSeeked,
    handleOnSeeking,
    handleC2PAValidation,
    getCompromisedRegions,
    formatTime,
    updateC2PATimeline,
  };
}
