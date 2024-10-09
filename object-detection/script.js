import {
  ObjectDetector,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2";

// Select the demo section and set up global variables
const demosSection = document.getElementById("demos");
let objectDetector;
let runningMode = "IMAGE";

// Initialize the object detector
const initializeObjectDetector = async () => {
  const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm"
  );

  objectDetector = await ObjectDetector.createFromOptions(vision, {
      baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
          delegate: "GPU"
      },
      scoreThreshold: 0.5,
      runningMode: runningMode
  });

  demosSection.classList.remove("invisible");
  console.log("Object Detector initialized!"); // เพิ่มบรรทัดนี้เพื่อตรวจสอบการโหลด
};

initializeObjectDetector();

// Demo 1: Detect objects in images on click
const imageContainers = document.getElementsByClassName("detectOnClick");
for (let imageContainer of imageContainers) {
  imageContainer.children[0].addEventListener("click", handleClick);
}

// Function to handle image click for object detection
async function handleClick(event) {
  // Remove existing highlighters and info
  const highlighters = event.target.parentNode.getElementsByClassName("highlighter");
  while (highlighters[0]) {
      highlighters[0].parentNode.removeChild(highlighters[0]);
  }

  const infos = event.target.parentNode.getElementsByClassName("info");
  while (infos[0]) {
      infos[0].parentNode.removeChild(infos[0]);
  }

  if (!objectDetector) {
      alert("Object Detector is still loading. Please try again.");
      return;
  }

  // Switch to image mode if in video mode
  if (runningMode === "VIDEO") {
      runningMode = "IMAGE";
      await objectDetector.setOptions({ runningMode: "IMAGE" });
  }

  const ratio = event.target.height / event.target.naturalHeight;

  // Detect objects in the clicked image
  const detections = await objectDetector.detect(event.target);
  displayImageDetections(detections, event.target);
}

// Function to display detections in images
function displayImageDetections(result, resultElement) {
  const ratio = resultElement.height / resultElement.naturalHeight;

  for (let detection of result.detections) {
      const p = document.createElement("p");
      p.setAttribute("class", "info");
      p.innerText = `${detection.categories[0].categoryName} - with ${Math.round(parseFloat(detection.categories[0].score) * 100)}% confidence.`;
      
      p.style = `left: ${detection.boundingBox.originX * ratio}px; top: ${detection.boundingBox.originY * ratio}px; width: ${(detection.boundingBox.width * ratio - 10)}px;`;
      
      const highlighter = document.createElement("div");
      highlighter.setAttribute("class", "highlighter");
      highlighter.style = `left: ${detection.boundingBox.originX * ratio}px; top: ${detection.boundingBox.originY * ratio}px; width: ${detection.boundingBox.width * ratio}px; height: ${detection.boundingBox.height * ratio}px;`;

      resultElement.parentNode.appendChild(highlighter);
      resultElement.parentNode.appendChild(p);
  }
}

// Demo 2: Webcam detection
let video = document.getElementById("webcam");
const liveView = document.getElementById("liveView");
let enableWebcamButton;

function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

var children = [];

// Check for webcam support and set up event listener
if (hasGetUserMedia()) {
  enableWebcamButton = document.getElementById("webcamButton");
  enableWebcamButton.addEventListener("click", enableCam);
} else {
  console.warn("getUserMedia() is not supported by your browser");
}

// Enable the webcam and start detection
async function enableCam(event) {
  if (!objectDetector) {
      console.log("Wait! objectDetector not loaded yet.");
      return;
  }

  enableWebcamButton.classList.add("removed");

  const constraints = {
      video: true
  };

  // Activate the webcam stream
  navigator.mediaDevices
      .getUserMedia(constraints)
      .then(function (stream) {
          video.srcObject = stream;
          video.addEventListener("loadeddata", predictWebcam);
      })
      .catch((err) => {
          console.error(err);
      });
}

let lastVideoTime = -1;

// Function to predict objects from the webcam stream
async function predictWebcam() {
  if (runningMode === "IMAGE") {
      runningMode = "VIDEO";
      await objectDetector.setOptions({ runningMode: "VIDEO" });
  }
  
  let startTimeMs = performance.now();

  if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const detections = await objectDetector.detectForVideo(video, startTimeMs);
      displayVideoDetections(detections);
  }
  
  window.requestAnimationFrame(predictWebcam);
}

// Function to display detections in the webcam view
function displayVideoDetections(result) {
  for (let child of children) {
      liveView.removeChild(child);
  }
  children.splice(0);
  
  for (let detection of result.detections) {
      const p = document.createElement("p");
      p.innerText = `${detection.categories[0].categoryName} - with ${Math.round(parseFloat(detection.categories[0].score) * 100)}% confidence.`;
      
      p.style = `left: ${video.offsetWidth - detection.boundingBox.width - detection.boundingBox.originX}px; top: ${detection.boundingBox.originY}px; width: ${(detection.boundingBox.width - 10)}px;`;

      const highlighter = document.createElement("div");
      highlighter.setAttribute("class", "highlighter");
      highlighter.style = `left: ${video.offsetWidth - detection.boundingBox.width - detection.boundingBox.originX}px; top: ${detection.boundingBox.originY}px; width: ${(detection.boundingBox.width - 10)}px; height: ${detection.boundingBox.height}px;`;

      liveView.appendChild(highlighter);
      liveView.appendChild(p);

      children.push(highlighter);
      children.push(p);
  }
}
