import {
  Button,
  Slider,
  Checkbox,
  Container,
  SpaceBetween,
  KeyValuePairs,
} from "@cloudscape-design/components";
import { useEffect } from "react";
import { Control, Controller, UseFormResetField } from "react-hook-form";
import { FormValues } from "./EditAsset";

interface ImageEditorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  photoEditorHook: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<FormValues, any>;
  resetField: UseFormResetField<FormValues>;
}

export const ImageEditor = ({
  photoEditorHook,
  control,
  resetField,
}: ImageEditorProps) => {
  const {
    imageSrc,
    canvasRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    brightness,
    setBrightness,
    contrast,
    setContrast,
    saturate,
    setSaturate,
    grayscale,
    setGrayscale,
    rotate,
    setRotate,
    zoom,
    setZoom,
    flipHorizontal,
    setFlipHorizontal,
    flipVertical,
    setFlipVertical,
    resetFilters,
    applyFilter,
  } = photoEditorHook;

  useEffect(() => {
    applyFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Container>
      <SpaceBetween size="l">
        {imageSrc && (
          <canvas
            style={{
              width: "40vw",
            }}
            ref={canvasRef}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onWheel={handleWheel}
          />
        )}

        <KeyValuePairs
          columns={3}
          items={[
            {
              label: "Brightness",
              value: (
                <Controller
                  name="assertions.brightness"
                  control={control}
                  render={({ field: { onChange } }) => (
                    <Slider
                      value={brightness}
                      onChange={({ detail }) => {
                        setBrightness(detail.value);
                        return detail.value !== 100
                          ? onChange({
                              action: "c2pa.color_adjustments",
                              digitalSourceType:
                                "http://cv.iptc.org/newscodes/digitalsourcetype/minorHumanEdits",
                              softwareAgent: "AWS C2PA Guidance Platform",
                              parameters: {
                                actionType: "brightnessAdjusted",
                                actionValue: detail.value - 100,
                                actionDescription:
                                  "This value represents if the brightness was increased or decreased",
                              },
                            })
                          : onChange(undefined);
                      }}
                      min={0}
                      max={200}
                    />
                  )}
                />
              ),
            },
            {
              label: "Contrast",
              value: (
                <Controller
                  name="assertions.contrast"
                  control={control}
                  render={({ field: { onChange } }) => (
                    <Slider
                      value={contrast}
                      onChange={({ detail }) => {
                        setContrast(detail.value);
                        return detail.value !== 100
                          ? onChange({
                              action: "c2pa.color_adjustments",
                              digitalSourceType:
                                "http://cv.iptc.org/newscodes/digitalsourcetype/minorHumanEdits",
                              softwareAgent: "AWS C2PA Guidance Platform",
                              parameters: {
                                actionType: "contrastAdjusted",
                                actionValue: detail.value - 100,
                                actionDescription:
                                  "This value represents if the contrast was increased or decreased",
                              },
                            })
                          : onChange(undefined);
                      }}
                      min={0}
                      max={200}
                    />
                  )}
                />
              ),
            },
            {
              label: "Saturation",
              value: (
                <Controller
                  name="assertions.saturation"
                  control={control}
                  render={({ field: { onChange } }) => (
                    <Slider
                      value={saturate}
                      onChange={({ detail }) => {
                        setSaturate(detail.value);
                        return detail.value !== 100
                          ? onChange({
                              action: "c2pa.color_adjustments",
                              digitalSourceType:
                                "http://cv.iptc.org/newscodes/digitalsourcetype/minorHumanEdits",
                              softwareAgent: "AWS C2PA Guidance Platform",
                              parameters: {
                                actionType: "saturationAdjusted",
                                actionValue: detail.value - 100,
                                actionDescription:
                                  "This value represents if the saturation was increased or decreased",
                              },
                            })
                          : onChange(undefined);
                      }}
                      min={0}
                      max={200}
                    />
                  )}
                />
              ),
            },
            {
              label: "Grayscale",
              value: (
                <Controller
                  name="assertions.grayScale"
                  control={control}
                  render={({ field: { onChange } }) => (
                    <Slider
                      value={grayscale}
                      onChange={({ detail }) => {
                        setGrayscale(detail.value);
                        return detail.value !== 0
                          ? onChange({
                              action: "c2pa.color_adjustments",
                              digitalSourceType:
                                "http://cv.iptc.org/newscodes/digitalsourcetype/minorHumanEdits",
                              softwareAgent: "AWS C2PA Guidance Platform",
                              parameters: {
                                actionType: "grayScale",
                                actionValue: detail.value,
                                actionDescription:
                                  "This value represents if grayscale was applied",
                              },
                            })
                          : onChange(undefined);
                      }}
                      min={0}
                      max={100}
                    />
                  )}
                />
              ),
            },
            {
              label: "Rotate",
              value: (
                <Controller
                  name="assertions.rotate"
                  control={control}
                  render={({ field: { onChange } }) => (
                    <Slider
                      value={rotate}
                      onChange={({ detail }) => {
                        setRotate(detail.value);
                        return detail.value !== 0
                          ? onChange({
                              action: "c2pa.orientation",
                              digitalSourceType:
                                "http://cv.iptc.org/newscodes/digitalsourcetype/minorHumanEdits",
                              softwareAgent: "AWS C2PA Guidance Platform",
                              parameters: {
                                actionType: "imageRotation",
                                actionValue: detail.value,
                                actionDescription:
                                  "This value represents the number of degrees this image was rotated by",
                              },
                            })
                          : onChange(undefined);
                      }}
                      min={0}
                      max={360}
                    />
                  )}
                />
              ),
            },
            {
              label: "Zoom",
              value: (
                <Controller
                  name="assertions.zoom"
                  control={control}
                  render={({ field: { onChange } }) => (
                    <Slider
                      value={zoom}
                      onChange={({ detail }) => {
                        setZoom(detail.value);
                        return detail.value !== 1
                          ? onChange({
                              action: "c2pa.resized",
                              digitalSourceType:
                                "http://cv.iptc.org/newscodes/digitalsourcetype/minorHumanEdits",
                              softwareAgent: "AWS C2PA Guidance Platform",
                              parameters: {
                                actionType: "resized",
                                actionValue: detail.value,
                                actionDescription:
                                  "This is to say if zoom was applied",
                              },
                            })
                          : onChange(undefined);
                      }}
                      step={0.1}
                      min={0.1}
                      max={3}
                    />
                  )}
                />
              ),
            },
          ]}
        />

        <SpaceBetween direction="horizontal" size="l">
          <Controller
            name="assertions.horizontallyFlipped"
            control={control}
            render={({ field: { onChange } }) => (
              <Checkbox
                onChange={({ detail }) => {
                  setFlipHorizontal(detail.checked);
                  return detail.checked
                    ? onChange({
                        action: "c2pa.orientation",
                        digitalSourceType:
                          "http://cv.iptc.org/newscodes/digitalsourcetype/minorHumanEdits",
                        softwareAgent: "AWS C2PA Guidance Platform",
                        parameters: {
                          actionType: "horizontallyFlipped",
                          actionDescription:
                            "Inidicates that the image was flipped on the y-axis",
                        },
                      })
                    : onChange(undefined);
                }}
                checked={flipHorizontal}
              >
                Flip Horizontal
              </Checkbox>
            )}
          />

          <Controller
            name="assertions.verticallyFlipped"
            control={control}
            render={({ field: { onChange } }) => (
              <Checkbox
                onChange={({ detail }) => {
                  setFlipVertical(detail.checked);
                  return detail.checked
                    ? onChange({
                        action: "c2pa.orientation",
                        digitalSourceType:
                          "http://cv.iptc.org/newscodes/digitalsourcetype/minorHumanEdits",
                        softwareAgent: "AWS C2PA Guidance Platform",
                        parameters: {
                          actionType: "verticallyFlipped",
                          actionDescription:
                            "Inidicates that the image was flipped on the x-axis",
                        },
                      })
                    : onChange(undefined);
                }}
                checked={flipVertical}
              >
                Flip Vertical
              </Checkbox>
            )}
          />
        </SpaceBetween>
        <Button
          onClick={(e) => {
            e.preventDefault();
            resetField("assertions");
            resetFilters();
          }}
        >
          Reset
        </Button>
      </SpaceBetween>
    </Container>
  );
};
