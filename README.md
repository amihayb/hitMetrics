# hitMetrics

**Developed by Blau Robotics**

Shooting Dispersion Analyzer - A web-based tool for analyzing shooting accuracy and dispersion patterns in milliradians (mRad).

## Overview

hitMetrics is a precision analysis tool designed to measure and visualize shooting dispersion patterns. It allows users to upload target images, set calibration scales, mark hit points, and calculate statistical metrics including blocking circle radius, standard deviations, and aim offset.

## Features

- **Image-based Analysis**: Upload target images and analyze shooting patterns directly
- **Precise Calibration**: Set scale using two reference points with real-world distance and range measurements
- **Interactive Hit Marking**: Click to mark hit points on the target image
- **Statistical Calculations**:
  - Blocking circle radius (maximum distance from center)
  - Standard deviation in Traverse (X-axis) and Elevation (Y-axis)
  - Aim point offset from center of hits
  - Scale conversion (mRad per pixel)
- **Draggable Statistics Labels**: Move statistics labels on the canvas for better visibility
- **Export Capabilities**:
  - Export annotated PNG images with all markings and statistics
  - Export data to CSV format for further analysis
  - Append new results to existing CSV files
- **Modern UI**: Clean, dark-themed interface with intuitive controls

## Usage

### Stage 1: Set Scale
1. Load a target image using the file input
2. Click two points on the image that represent a known distance
3. Enter the real-world distance between those points (in meters)
4. Enter the range to the target (in meters)
5. Click "Compute scale" to calculate mRad per pixel

### Stage 2: Choose Aim Point
1. Click once on the image to set the aim point
2. The aim point will be marked with a crosshair

### Stage 3: Mark Hits
1. Click on the image to mark each hit location
2. Statistics are calculated automatically:
   - Center of hits (mean X/Y position)
   - Blocking circle radius
   - STD TR (standard deviation in traverse/X)
   - STD EL (standard deviation in elevation/Y)
   - Aim → Center offset
3. Use Ctrl+Click to undo the last hit
4. Press `S` to cycle between stages (when allowed)

### Export Options
- **Export annotated PNG**: Downloads the target image with all markings, labels, and statistics overlaid
- **Export to CSV**: Exports statistics (Hits, Range, STD TR, STD EL, Radius, Aim Offset) to CSV format
  - Can append to existing CSV files by selecting a file when prompted
  - Creates new CSV with headers if no file is selected

## Keyboard Shortcuts

- `S` - Cycle between stages (when transitions are allowed)
- `Ctrl + Click` - Undo last hit (in hit marking stage)

## Technical Details

- **Units**: All measurements are in milliradians (mRad)
- **Scale Calculation**: mRad per pixel = (1000 × real_distance_meters / range_meters) / pixel_distance
- **Statistics**: Uses population standard deviation for traverse and elevation calculations
- **File Format**: CSV exports use comma-separated values without quotation marks

## Browser Compatibility

Works in all modern browsers that support:
- HTML5 Canvas API
- File API
- ES6 JavaScript features

## Credits

**Developed by Blau Robotics**

In collaboration with Rafael Advanced Defense Systems

---

For questions or support, please contact Blau Robotics

Amihay Blau
amihay@blaurobotics.co.il
