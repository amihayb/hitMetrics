# hitMetrics

**Developed by Blau Robotics**

Shooting Dispersion Analyzer — A web-based tool for analyzing shooting accuracy and dispersion patterns in milliradians (mRad).

## Overview

hitMetrics is a precision analysis tool designed to measure and visualize shooting dispersion patterns. Upload a target image, calibrate the scale, mark hit points, and instantly see blocking circle radius, standard deviations, and aim offset — all in mRad.

## Features

- **Image-based Analysis**: Upload target images via file picker or drag-and-drop onto the canvas
- **Image Crop**: Crop the loaded image before analysis using an interactive drag-to-select tool
- **Precise Calibration**: Set scale using two reference points with real-world distance and range measurements
- **Interactive Hit Marking**: Click (or tap on mobile) to mark hit points on the target image
- **Statistical Calculations**:
  - Blocking circle radius (maximum distance from center of hits)
  - Standard deviation in Traverse (X-axis) and Elevation (Y-axis)
  - Aim point offset from center of hits
  - Scale conversion (mRad per pixel)
- **Draggable Statistics Labels**: Drag any label on the canvas to reposition it
- **Zoom Controls**: Zoom in/out with +/− buttons, scroll wheel, or pinch-to-zoom on mobile
- **Annotation Size Control**: Scale all drawn overlays up or down with the +/− annotation buttons
- **Export Capabilities**:
  - Export annotated PNG image with all markings and statistics
  - Export data to CSV; can append to an existing CSV file
- **Mobile Support**: Full touch support — tap to place points, drag to crop, pinch to zoom; compact layout with a quick-action toolbar

## Usage

### Loading an Image
- Click the file input to browse for an image, or drag-and-drop a file onto the canvas.
- On mobile, the file picker also offers a camera capture option.
- After loading, optionally click **✂ Crop image** to select and apply a crop region before proceeding.

### Stage 1: Set Scale
1. Tap/click two points on the image that represent a known real-world distance.
2. Enter the distance between those points (meters) and the range to target (meters).
3. Click **Compute scale** to calculate mRad per pixel.

### Stage 2: Choose Aim Point
1. Tap/click once on the image to place the aim point crosshair.
2. Click **Go to hit marking** (or press `S`) to proceed.

### Stage 3: Mark Hits
1. Tap/click each hit location on the image.
2. Statistics are calculated and displayed automatically:
   - Center of hits (mean X/Y)
   - Blocking circle radius
   - STD TR (standard deviation, traverse/X)
   - STD EL (standard deviation, elevation/Y)
   - Aim → Center offset
3. Use **Undo last hit** (or `Ctrl+Click` / mobile Undo button) to remove the last hit.

### Export Options
- **Export annotated PNG** — Downloads the target image with all annotations overlaid.
- **Export to CSV** — Exports statistics (Hits, Range, STD TR, STD EL, Radius, Aim Offset). Prompts to append to an existing CSV or create a new one.

## Zoom

| Action | Result |
|---|---|
| Scroll wheel on canvas | Zoom in / out |
| Pinch (mobile) | Zoom in / out |
| − / + buttons under canvas | Zoom out / in by 25% |
| Reset zoom button | Return to 100% |

When zoomed above 100% the canvas area becomes scrollable.

## Keyboard Shortcuts (Desktop)

| Key | Action |
|---|---|
| `S` | Cycle stages (when transition is allowed) |
| `Ctrl + Click` | Undo last hit (hit marking stage) |

## Technical Details

- **Units**: All measurements are in milliradians (mRad)
- **Scale formula**: `mRad/px = (1000 × distance_m / range_m) / pixel_distance`
- **Statistics**: Population standard deviation for traverse and elevation
- **CSV format**: Comma-separated, no quotation marks; header row added automatically

## Browser Compatibility

Works in all modern browsers supporting:
- HTML5 Canvas API
- File API / FileReader
- ES6 JavaScript (arrow functions, destructuring, template literals)
- Touch Events API (for mobile)

## Credits

**Developed by Blau Robotics**

In collaboration with Rafael Advanced Defense Systems

---

For questions or support, contact Blau Robotics

Amihay Blau
amihay@blaurobotics.co.il
