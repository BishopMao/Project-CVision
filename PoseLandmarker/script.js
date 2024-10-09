// JavaScript code
import {
    PoseLandmarker,
    FilesetResolver,
    DrawingUtils
} from "https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0";

const demosSection = document.getElementById("demos");
let poseLandmarker;
let runningMode = "IMAGE";
let enableWebcamButton;
let webcamRunning = false;

const createPoseLandmarker = async () => {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU"
        },
        runningMode: runningMode,
        numPoses: 2
    });
    demosSection.classList.remove("invisible");
};

createPoseLandmarker();

const imageContainers = document.getElementsByClassName("detectOnClick");
for (let i = 0; i < imageContainers.length; i++) {
    imageContainers[i].children[0].addEventListener("click", handleClick);
}

async function handleClick(event) {
    if (!poseLandmarker) return;
    if (runningMode === "VIDEO") {
        runningMode = "IMAGE";
        await poseLandmarker.setOptions({ runningMode: "IMAGE" });
    }

    const imgElement = event.target;
    
    // Ensure cross-origin loading for images
    imgElement.crossOrigin = "anonymous"; // Make sure this is set

    // Remove previous canvas if exists
    const existingCanvas = imgElement.parentNode.querySelector(".landmarkCanvas");
    if (existingCanvas) {
        existingCanvas.parentNode.removeChild(existingCanvas);
    }

    poseLandmarker.detect(imgElement, (result) => {
        // Create a canvas that matches the size of the image
        const canvas = document.createElement("canvas");
        canvas.setAttribute("class", "landmarkCanvas");
        canvas.setAttribute("width", imgElement.naturalWidth);
        canvas.setAttribute("height", imgElement.naturalHeight);
        canvas.style.position = "absolute";
        canvas.style.left = imgElement.offsetLeft + "px"; // Positioning canvas
        canvas.style.top = imgElement.offsetTop + "px";   // Positioning canvas
        imgElement.parentNode.appendChild(canvas); // Add canvas to the same parent as the image

        const canvasCtx = canvas.getContext("2d");
        const drawingUtils = new DrawingUtils(canvasCtx);
        
        // Draw landmarks and connectors on the canvas
        for (const landmark of result.landmarks) {
            drawingUtils.drawLandmarks(landmark, {
                radius: (data) => DrawingUtils.lerp(data.from ? data.from.z : -0.15, -0.15, 0.1, 5, 1)
            });
            drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
        }
    });
}

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const drawingUtils = new DrawingUtils(canvasCtx);

const hasGetUserMedia = () => !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;

if (hasGetUserMedia()) {
    enableWebcamButton = document.getElementById("webcamButton");
    enableWebcamButton.addEventListener("click", enableCam);
} else {
    console.warn("getUserMedia() is not supported by your browser");
}

function enableCam(event) {
    if (!poseLandmarker) return;

    webcamRunning = !webcamRunning;
    enableWebcamButton.innerText = webcamRunning ? "DISABLE PREDICTIONS" : "ENABLE PREDICTIONS";

    const constraints = {
        video: true
    };

    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
    });
}

let lastVideoTime = -1;
async function predictWebcam() {
    if (runningMode === "IMAGE") {
        runningMode = "VIDEO";
        await poseLandmarker.setOptions({ runningMode: "VIDEO" });
    }
    let startTimeMs = performance.now();
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        poseLandmarker.detectForVideo(video, startTimeMs, (result) => {
            canvasCtx.save();
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            for (const landmark of result.landmarks) {
                drawingUtils.drawLandmarks(landmark, {
                    radius: (data) => DrawingUtils.lerp(data.from ? data.from.z : -0.15, -0.15, 0.1, 5, 1)
                });
                drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
            }
            canvasCtx.restore();
        });
    }

    if (webcamRunning) {
        window.requestAnimationFrame(predictWebcam);
    }
}
