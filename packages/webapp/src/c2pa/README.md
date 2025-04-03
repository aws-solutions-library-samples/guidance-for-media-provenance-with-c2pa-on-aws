# DASH.js Content Authenticity Initiative player and plugin

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Contents**  

- [About the Content Authenticity Initiative](#about-the-content-authenticity-initiative)
- [Key features](#key-features)
- [Supported file formats](#supported-file-formats)
- [Sample videos](#sample-videos)
    - [Running the samples](#running-the-samples)
- [Usage](#usage)
- [Common JavaScript and CSS inclusions](#common-javascript-and-css-inclusions)
- [DASH-native implementation](#dash-native-implementation)
- [DASH plugin implementation](#dash-plugin-implementation)
- [C2PA UI player on top of Video.js](#c2pa-ui-player-on-top-of-videojs)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

This folder contains examples of integrating C2PA ([Coalition for Content Provenance and Authenticity](https://c2pa.org)) verification capabilities into the DASH player to display  Content Credentials while streaming a video.  It also provides a reference UI implementation using [Video.js](https://videojs.com/).

## About the Content Authenticity Initiative

The Content Authenticity Initiative (CAI) is a community of media and technology companies, NGOs, academics, and others working to promote adoption of an open industry standard for content authenticity and provenance. CAI collaborators include Adobe, BBC, Microsoft, The New York Times Co., Leica, Nikon, Truepic, Qualcomm, and more.  

For more information, see [Content Authenticity Initiative](https://contentauthenticity.org/).

## Key features

This reference implementation demonstrates how to display Content Credentials attached to a video while it's streaming. Specifically, it showcases:

1. Two ways of adding C2PA verification capabilities to the DASH player: 
    - **Native** integration, which involves changes to the standard DASH player itself.
    - **Plugin** implementation on top of the existing standard DASH player. 
2. A reference UI implementation to display C2PA information to the end-user, with two main elements:
    - A **color-coded timeline** that shows the validation status of the streamed video.
    - A **C2PA** menu showing detailed information extracted from the C2PA manifest. 

You can use both UI elements with either native and plugin implementation.

### Supported file formats

* MPEG DASH fragmented MP4
* Monolithic MP4

## Sample videos

| Type 										        | Sample 1            | Sample 2 | Sample 3|
|---------------------------------------------------|---------------------|----------|---------|
|No C2PA manifest embedded                          | [mpd]() / [mp4]()   |          |         |
|With valid C2PA manifest                           | [mpd]() / [mp4]()   |          |         |
|With invalid C2PA manifest                         | [mpd]() / [mp4]()   |          |         |
|With valid C2PA manifest and tampered fragments    | [mpd]()             |          |         |

### Running the samples

Follow the [instructions in the Dash.js README](../../README.md#quick-start-for-developers) to install dependencies, build the project, and launch the samples page.  Then Navigate to the **Content Authenticity** tab to display links to the C2PA demos.

## Usage

The video streaming session is logically divided into three parts:

- A DASH session that streams the video content.
- A C2PA session that verifies the content provenance of the video.
- A UI session that surfaces C2PA information to the end-user.

We show in the following how to instantiate your player to support the above functionalities. Full examples are available at [c2pa-demo-native](./native-dash/c2pa-demo-native.html) for the native DASH implementation, [c2pa-demo-plugin](./plugin-dash/c2pa-demo-plugin.html) for the plugin-style implementation, and [c2pa-demo-monolithic](./monolithic/c2pa-demo-monolithic.html) for monolithic (non-streaming) MP4 video.

### Common JavaScript and CSS inclusions

Regardless whether you use native or plug-in C2PA implementation, the following JavaScript and CSS files are required to instantiate the player.

First, include the `dash.js` library:

```html
<!-- dash-js -->
<script src="../../../dist/dash.all.debug.js"></script>
```

In the native implementation case, the page downloads the Dash.js library with C2PA validation from `<Link TBD>`. The plugin-style implementation case uses the standard Dash.js library. 

Next, include the JavaScript librarires and CSS files for `video.js` and `c2pa-player`:

```html    
<!-- video-js -->
<script src="https://vjs.zencdn.net/8.3.0/video.min.js"></script>
<link href="https://vjs.zencdn.net/8.3.0/video-js.css" rel="stylesheet" />

<!-- c2pa player -->
<script class="code" src="../c2pa-player.js"></script>
<link href="../c2pa-player.css" rel="stylesheet" />
```

### DASH-native implementation

With the native implementation, C2PA validation is integrated into the DASH player codebase. Once the page's HTML content is loaded, the `init()` function instantiates the player. The `c2paPlayer` instance is the bridge between the DASH player and the UI component. 

Here is the example code from [`c2pa-demo-native.html`](./native-dash/c2pa-demo-native.html):

```javascript
/* C2PA player instance */
var c2paPlayer;
        
function init() {
    var video,
        dashPlayer,
        url = "url-to-video-manifest.mpd";

    video = document.querySelector("#videoPlayer");
    /* Create dashjs player with C2PA verification enabled */
    /* Responsible for streaming video and executing C2PA validation */
    dashPlayer = dashjs.MediaPlayer().create();
    dashPlayer.initialize(video, url, true, NaN, true);

    /* Create videojs player and C2PA player */
    /* Responsible for UI and playback control */
    var videoJsPlayer = videojs('videoPlayer', {fluid: true});
    c2paPlayer = new C2PAPlayer(videoJsPlayer, video);
    c2paPlayer.initialize();

    dashPlayer.on(dashjs.MediaPlayer.events["PLAYBACK_TIME_UPDATED"], playbackUpdate);
}

function playbackUpdate(e) {
    c2paPlayer.playbackUpdate(e.c2pa_status);
}

document.addEventListener('DOMContentLoaded', function () {
    init();
});
```

First, this line gets the `<video>` document element:

```javascript
var video = document.querySelector("#videoPlayer");
```

Here is the HTML element:

```html
<video id="videoPlayer" class="video-js" controls="true"></video>
```

Then, these two lines create the DASH player and initialize it with the `video` page element and C2PA validation enabled:

```javascript
var dashPlayer = dashjs.MediaPlayer().create();
dashPlayer.initialize(video, url, true, NaN, true);
```

NOTE: This implementation changes the signature of `initialize` so the last argument is a Boolean that specifies whether C2PA validation is enabled:

```js
function initialize(view, source, autoPlay, startTime = NaN, enableC2pa = false)
```

Next, these three lines create the `video.js` player and the C2PA player responsible for the UI component:

```javascript
var videoJsPlayer = videojs('videoPlayer', {fluid: true});
c2paPlayer = new C2PAPlayer(videoJsPlayer, video);
c2paPlayer.initialize();
```

Finally, this line registers a callback function to be called every time the playback time is updated:

```javascript
dashPlayer.on(dashjs.MediaPlayer.events["PLAYBACK_TIME_UPDATED"], playbackUpdate);
```

This callback contains the C2PA information that is passed to the UI component using the `playbackUpdate` function:

```javascript
function playbackUpdate(e) {
    c2paPlayer.playbackUpdate(e.c2pa_status);
}
```

In this callback, `e` is the event object triggered by the DASH player, which has been expanded to contain the C2PA information. The `c2pa_status` field contains the C2PA information to be passed to the UI component for display. The `playbackUpdate` function is part of the `c2paPlayer` puiblic API and allows to update the UI with the information contained in `c2pa_status`.

### DASH plugin implementation

In the plugin-style implementation, C2PA validation happens on top of the standard DASH player. Nevertheless, the instantion of the player is similar to the native implementation case; for example:

```javascript
import {c2pa_init} from './c2pa-plugin.js';

/* C2PA player instance */
var c2paPlayer;

function init() {
    var video,
        dashPlayer,
        url = "url-to-video-manifest.mpd";

    video = document.querySelector("#videoPlayer");
    /* Create dashjs player */
    /* Responsible for streaming video */
    dashPlayer = dashjs.MediaPlayer().create();

    /* Create videojs player and C2PA player */
    /* Responsible for UI and playback control */
    var videoJsPlayer = videojs('videoPlayer', {fluid: true});
    c2paPlayer = new C2PAPlayer(videoJsPlayer, video);
    c2paPlayer.initialize();

    /* Create C2PA plugin*/
    /* Responsible for executing C2PA validation */
    c2pa_init(dashPlayer, function (e) {
        /* Update C2PA player with current C2PA status update */
        c2paPlayer.playbackUpdate(e.c2pa_status);
    }).then(() => {
        dashPlayer.initialize(video, url, true);
    });
}

document.addEventListener('DOMContentLoaded', function () {
    init();
});
```

First, this line imports the library responsible for the C2PA validation:

```javascript
import {c2pa_init} from './c2pa-plugin.js';
```

Next, this line creates the DASH player (in this case, a standard DASH player):

```javascript
var dashPlayer = dashjs.MediaPlayer().create();
```

Similarly to the native implementation case, these lines create the `video.js` player and the C2PA player, responsible for the UI component:

```javascript
var videoJsPlayer = videojs('videoPlayer', {fluid: true});
c2paPlayer = new C2PAPlayer(videoJsPlayer, video);
c2paPlayer.initialize();
```

Finally, these lines initialize the C2PA plugin and call the `playbackUpdate` method from the `c2paPlayer` instance to update the UI with the information contained in the `c2pa_status` field:

```javascript
c2pa_init(dashPlayer, function (e) {
    /* Update C2PA player with current C2PA status update */
    c2paPlayer.playbackUpdate(e.c2pa_status);
}).then(() => {
    dashPlayer.initialize(video, url, true);
});
```

In the above example, `e` is the event object trigger by the C2PA library, which contains the C2PA information. Please note that native and plugin-style implementations share the same structure of the `c2pa_status` field.

### C2PA UI player on top of Video.js

While developers are free to implement their own UI component, the files [c2pa-player.js](c2pa-player.js) and [c2pa-player.css](c2pa-player.css) provide a simple reference implementation using [Video.js](https://videojs.com/).

## License

TBC