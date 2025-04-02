export let initializeFrictionOverlay = function (
    videoPlayer,
    setPlaybackStarted,
) {
    let frictionOverlay;
    //Create the friction overlay container
    frictionOverlay = document.createElement('div');
    frictionOverlay.className = 'friction-overlay';

    //Create the warnimg message to be shown to the user when initial manifest validation fails
    let warnMessage = document.createElement('p');
    warnMessage.textContent =
    'The information in this video\'s Content Credentials is no longer trustworthy and the video\'s history cannot be confirmed.';

    //Create "Watch Anyway" button
    let watchAnywayBtn = document.createElement('button');
    watchAnywayBtn.textContent = 'Watch Anyway';
    watchAnywayBtn.classList.add('friction-button');

    //Append the elements to the friction overlay container
    frictionOverlay.appendChild(warnMessage);
    frictionOverlay.appendChild(watchAnywayBtn);

    //Hide overlay by default
    frictionOverlay.style.display = 'none';

    //Append the overlay container to the player's container
    let playerContainer = videoPlayer.el();
    playerContainer.appendChild(frictionOverlay);

    //The user can click the "Watch Anyway" button to continue watching the video
    watchAnywayBtn.addEventListener('click', function () {
    //Close overlay and resume playback
        frictionOverlay.style.display = 'none';
        setPlaybackStarted();
        videoPlayer.play();
    });

    return frictionOverlay;
};

//Display the friction overlay if the initial manifest validation fails
export let displayFrictionOverlay = function (
    playbackStarted,
    videoPlayer,
    frictionOverlay,
) {
    if (!playbackStarted) {
        videoPlayer.pause();
        frictionOverlay.style.display = 'block';
    }
};
