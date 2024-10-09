import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";
const { FaceLandmarker, FilesetResolver, DrawingUtils } = vision;

// DOM elements
const demosSection = document.getElementById("demos");
const videoBlendShapes = document.getElementById("video-blend-shapes");
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");

let faceLandmarker;
let runningMode = "VIDEO";
let webcamRunning = false;

// Function to create FaceLandmarker
async function createFaceLandmarker() {
    const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );

    faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode,
        numFaces: 1
    });
    demosSection.classList.remove("invisible");
}
createFaceLandmarker();

// Check if browser supports getUserMedia
function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

if (hasGetUserMedia()) {
    const enableWebcamButton = document.getElementById("webcamButton");
    enableWebcamButton.addEventListener("click", enableCam);
} else {
    console.warn("getUserMedia() is not supported by your browser");
}

// Function to enable the webcam
function enableCam(event) {
    if (!faceLandmarker) {
        console.log("Wait! faceLandmarker not loaded yet.");
        return;
    }

    webcamRunning = !webcamRunning;
    const enableWebcamButton = document.getElementById("webcamButton");
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
const drawingUtils = new DrawingUtils(canvasCtx);

// Function to predict and draw landmarks
async function predictWebcam() {
    // Ensure video dimensions are available
    if (video.videoWidth === 0 || video.videoHeight === 0) {
        requestAnimationFrame(predictWebcam);
        return;
    }

    // Set video and canvas dimensions
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    video.width = videoWidth;
    video.height = videoHeight;
    canvasElement.width = videoWidth;
    canvasElement.height = videoHeight;

    if (webcamRunning) {
        const startTimeMs = performance.now();
        if (lastVideoTime !== video.currentTime) {
            lastVideoTime = video.currentTime;

            const results = await faceLandmarker.detectForVideo(video, startTimeMs);

            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                for (const landmarks of results.faceLandmarks) {
                    // Draw the landmarks on the face
                    drawingUtils.drawLandmarks(landmarks, { color: "#FF0000", radius: 2 });

                    // Draw connectors between landmarks
                    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: "#C0C0C070", lineWidth: 1 });
                    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: "#FF3030" });
                    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: "#30FF30" });
                    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, { color: "#E0E0E0" });
                }
                drawBlendShapes(videoBlendShapes, results.faceBlendshapes);
            } else {
                console.log("No face detected.");
            }
        }
    }

    requestAnimationFrame(predictWebcam);
}

// Function to display blend shapes
function drawBlendShapes(el, blendShapes) {
    if (!blendShapes || blendShapes.length === 0) return;

    let htmlMaker = "";
    blendShapes[0].categories.forEach((shape) => {
        htmlMaker += `
        <li class="blend-shapes-item">
            <span class="blend-shapes-label">${shape.displayName || shape.categoryName}</span>
            <span class="blend-shapes-value" style="width: calc(${shape.score * 100}% - 120px)">${shape.score.toFixed(4)}</span>
        </li>`;
    });
    el.innerHTML = htmlMaker;
}
