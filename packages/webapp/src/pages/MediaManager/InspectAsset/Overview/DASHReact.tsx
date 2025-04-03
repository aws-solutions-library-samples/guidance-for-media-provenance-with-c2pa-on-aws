

import "https://vjs.zencdn.net/8.3.0/video.js";
import 'https://cdn.dashjs.org/v4.7.2/dash.all.min.js';
import {c2pa_init} from '../../../../c2pa/plugin-dash/c2pa-dash-plugin.js';
import {C2PAPlayer} from '../../../../c2pa/C2paPlayer/main.js'
import {
  getUrl
} from "aws-amplify/storage";

import React from 'react';

import '../../../../c2pa/c2pa-player.css';
import { get } from "lodash";

export interface props {
  className?: string
  id?: string
  controls?: boolean
  autoPlay?: boolean
  url: string
  options?: {}
}

export interface state {
  player: any
}


class DASHReact extends React.Component<props, state> {

  constructor(props: props) {
    super(props);
    this.state = {
      player: null
    }
  }

  componentDidMount() {
    this.initializeDash(
      this.props.url, 
      this.props.options as {}, 
      this.props.autoPlay
    );
  }

  componentWillUnmount() {
    // this.state.player.destroy(); 
    this.setState({ player: null });
  }

  initializeDash(url: string, options?: MediaPlayerSettingClass, autoPlay = false) {
    console.log('initializeDash', url, options, autoPlay);
    var player = dashjs.MediaPlayer().create();
    var options = {fluid: true , controlBar: { children: ['playToggle' , 'progressControl', "currentTimeDisplay", 'volumePanel','pictureInPictureToggle','fullscreenToggle']}}

    /* Create videojs player and c2pa player */
    /* Responsible for UI and playback control */
    var video = document.querySelector('#videoPlayer');
    //var videoJsPlayer = videojs('videoPlayer', options);
    var videoJsPlayer = videojs('videoPlayer', options, () => {
      videojs.log('onPlayerReady', this);
    });
    var c2paJsPlayer = new C2PAPlayer(videoJsPlayer, video);
    c2paJsPlayer.initialize();
    

    var videoUrl;
    c2pa_init(player, function (e) {
      /* Update c2pa player with current c2pa status update */
      console.log("c2pa_init", e);
      c2paJsPlayer.playbackUpdate(e.c2pa_status);
    }).then(() => {
      player.initialize(video, url, true);
    });
    
    

    /*
    if (options) player.updateSettings(options);
    player.initialize(
      document.querySelector("#dash-react")! as HTMLElement, 
      // needs regex to select for anything beginning with dash-react 
      url, 
      autoPlay
    );
    */
    this.setState({ player });
  }

  render() {
    const videoId = this.props.id ? `dash-react-${this.props.id}` : 'videoPlayer';
    return (
      <video
        //style={{width : 640, height: 360}}
        id={videoId}
        className={this.props.className}
        controls={this.props.controls}
        autoPlay={this.props.autoPlay}>
      </video>
    );
  }
}

export default DASHReact;
  