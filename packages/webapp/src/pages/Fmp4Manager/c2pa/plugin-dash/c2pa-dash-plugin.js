import IntervalTree from "https://cdn.jsdelivr.net/npm/@flatten-js/interval-tree@1.0.20/dist/main.esm.js";
import { createC2pa } from "https://cdn.jsdelivr.net/npm/c2pa@0.18.0-fmp4-alpha.1/+esm";

async function c2pa_init(player, onPlaybackTimeUpdated) {
  const C2paSupportedMediaTypes = ["video", "audio"];

  let tree = {};
  let initFragment = {};

  let currentQuality = {};
  for (const type of C2paSupportedMediaTypes) {
    currentQuality[type] = null;
  }

  //We delay the segment verification by 1 frame to keep into account video quality swtiches,
  //which are notified with 1 frame delay compared to playback
  let verificationTime = 0.0;

  const c2pa = await createC2pa({
    wasmSrc:
      "https://cdn.jsdelivr.net/npm/c2pa@0.18.0-fmp4-alpha.1/dist/assets/wasm/toolkit_bg.wasm",
    workerSrc:
      "https://cdn.jsdelivr.net/npm/c2pa@0.18.0-fmp4-alpha.1/dist/c2pa.worker.js",
  });

  player.extend("SegmentResponseModifier", function () {
    return {
      modifyResponseAsync: async function (chunk) {
        if (!C2paSupportedMediaTypes.includes(chunk.mediaInfo.type)) {
          console.log(
            "[C2PA] Unsupported C2PA media type " + chunk.mediaInfo.type
          );
          return Promise.resolve(chunk);
        }

        let tag =
          chunk.streamId +
          "-" +
          chunk.mediaInfo.type +
          "-" +
          chunk.representationId;

        console.log(
          "[C2PA] Processing verification for " + tag,
          chunk.start,
          chunk.end,
          c2pa
        );

        if (chunk.segmentType == "InitializationSegment") {
          //TODO: mimetype should change based on actual type from chunk
          initFragment[tag] = new Blob([chunk.bytes], { type: "video/mp4" });
          console.log("[C2PA] Got init seg for " + tag);
        } else if (!(tag in initFragment)) {
          console.error("[C2PA] initFragment is null for " + tag);
        } else {
          var manifest = await c2pa.readFragment(
            initFragment[tag],
            chunk.bytes
          );

          if (!(tag in tree)) tree[tag] = new IntervalTree();

          const interval = [chunk.start, chunk.end];
          const c2paInfo = {
            type: chunk.segmentType,
            manifest: manifest,
            interval: [chunk.start, chunk.end],
          };

          tree[tag].search(interval).forEach((seg) => {
            if (
              seg.interval[0] == interval[0] &&
              seg.interval[1] == interval[1]
            ) {
              console.info(
                "[C2PA] Segment already exists in tree, removing",
                interval
              );
              tree[tag].remove(interval, seg);
            }
          });

          tree[tag].insert(interval, c2paInfo);

          if (currentQuality[chunk.mediaInfo.type] === null) {
            currentQuality[chunk.mediaInfo.type] = chunk.representationId;
          }

          console.log(
            "[C2PA] Completed verification for " + tag,
            chunk.start,
            chunk.end,
            manifest
          );
        }

        return Promise.resolve(chunk);
      },
    };
  });

  player.on(dashjs.MediaPlayer.events["QUALITY_CHANGE_RENDERED"], function (e) {
    console.log(
      "[C2PA] Video quality changed for type " + e.mediaType,
      player.getCurrentTrackFor(e.mediaType).bitrateList[e.newQuality].id
    );
    currentQuality[e.mediaType] = player.getCurrentTrackFor(
      e.mediaType
    ).bitrateList[e.newQuality].id;
  });

  player.on(dashjs.MediaPlayer.events["PLAYBACK_ENDED"], function (e) {
    console.log("[C2PA] Playback ended");
    verificationTime = 0.0;
  });

  player.on(dashjs.MediaPlayer.events["PLAYBACK_TIME_UPDATED"], function (e) {
    let ret = {
      verified: undefined,
      details: {},
    };

    let isUndefined = false;
    for (const type of C2paSupportedMediaTypes) {
      if (currentQuality[type] === null || verificationTime === null) continue;

      let representationId = currentQuality[type];
      let tag = e.streamId + "-" + type + "-" + representationId;

      console.log(
        "[C2PA] Searching verification for " +
          tag +
          " at time " +
          verificationTime
      );

      if (!(tag in tree)) {
        console.error("[C2PA] Cannot find " + tag);
        continue;
      }

      let detail = {
        verified: false,
        manifest: null,
        error: null,
      };

      let segs = tree[tag].search([verificationTime, verificationTime + 0.01]);

      if (segs.length > 1) {
        const interval = segs[0].interval;
        for (let i = 1; i < segs.length; i++) {
          if (segs[i].interval == interval) {
            isUndefined = true;
            break;
          }
        }
        if (isUndefined) {
          console.info(
            "[C2PA] Retrieved unexpected number of segments: " +
              segs.length +
              " for media type " +
              type
          );
          detail["error"] =
            "Retrieved unexpected number of segments: " +
            segs.length +
            " for media type " +
            type;
          ret["details"][type] = detail;
          continue;
        }
      }

      if (segs.length == 0) {
        console.info("[C2PA] No segment found for media type " + type);
        detail["error"] = "No segment found for media type " + type;
        ret["details"][type] = detail;
        isUndefined = true;
        continue;
      }

      let manifest = segs[0].manifest;

      detail["manifest"] = manifest;

      if (manifest.manifestStore == null)
        detail["error"] = "null manifestStore";

      if (manifest["manifestStore"]["validationStatus"]?.length === 0) {
        detail["verified"] = true;
      } else
        detail["error"] =
          "error code" + manifest.manifestStore.validationStatus[0].code;

      ret["details"][type] = detail;
      ret["verified"] =
        (ret["verified"] === true || ret["verified"] === undefined
          ? true
          : false) && detail["verified"];
    }

    if (isUndefined) {
      ret["verified"] = undefined;
    }

    console.log("[C2PA] Verification result: ", ret);

    e["c2pa_status"] = ret;
    onPlaybackTimeUpdated(e);
    verificationTime = e.time;
  });
}

export { c2pa_init };
