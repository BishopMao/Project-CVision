import {
    ImageClassifier,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2";

// Get DOM elements
const video = document.getElementById("webcam");
const webcamPredictions = document.getElementById("webcamPredictions");
const demosSection = document.getElementById("demos");
let enableWebcamButton;
let webcamRunning = false;
const videoHeight = "360px";
const videoWidth = "480px";

const imageContainers = document.getElementsByClassName("classifyOnClick");
let runningMode = "IMAGE";

// Add click event listeners for the img elements.
for (let i = 0; i < imageContainers.length; i++) {
    imageContainers[i].children[0].addEventListener("click", handleClick);
}

// Track imageClassifier object and load status.
let imageClassifier;

const createImageClassifier = async () => {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm"
    );
    imageClassifier = await ImageClassifier.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/image_classifier/efficientnet_lite0/float32/1/efficientnet_lite0.tflite`
        },
        maxResults: 1,
        runningMode: runningMode
    });

    demosSection.classList.remove("invisible");
};
createImageClassifier();

async function handleClick(event) {
    if (imageClassifier === undefined) {
        return;
    }
    if (runningMode === "VIDEO") {
        runningMode = "IMAGE";
        await imageClassifier.setOptions({ runningMode: "IMAGE" });
    }

    const classificationResult = await imageClassifier.classify(event.target);
    const classifications = classificationResult.classifications;

    const p = event.target.parentNode.childNodes[3];
    p.className = "classification";
    p.innerText =
        "Classification: " +
        classifications[0].categories[0].categoryName +
        "\n Confidence: " +
        Math.round(parseFloat(classifications[0].categories[0].score) * 100) +
        "%";
    classificationResult.close();
}

function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

async function predictWebcam() {
    if (imageClassifier === undefined) {
        return;
    }
    if (runningMode === "IMAGE") {
        runningMode = "VIDEO";
        await imageClassifier.setOptions({ runningMode: "VIDEO" });
    }
    const startTimeMs = performance.now();
    const classificationResult = await imageClassifier.classifyForVideo(
        video,
        startTimeMs
    );
    video.style.height = videoHeight;
    video.style.width = videoWidth;
    webcamPredictions.style.width = videoWidth;
    const classifications = classificationResult.classifications;
    webcamPredictions.className = "webcamPredictions";
    webcamPredictions.innerText =
        "Classification: " +
        classifications[0].categories[0].categoryName +
        "\n Confidence: " +
        Math.round(parseFloat(classifications[0].categories[0].score) * 100) +
        "%";
    if (webcamRunning === true) {
        window.requestAnimationFrame(predictWebcam);
    }
}

async function enableCam(event) {
    if (imageClassifier === undefined) {
        return;
    }

    if (webcamRunning === true) {
        webcamRunning = false;
        enableWebcamButton.innerText = "ENABLE PREDICTIONS";
    } else {
        webcamRunning = true;
        enableWebcamButton.innerText = "DISABLE PREDICTIONS";
    }

    const constraints = {
        video: true
    };

    video.srcObject = await navigator.mediaDevices.getUserMedia(constraints);
    video.addEventListener("loadeddata", predictWebcam);
}

if (hasGetUserMedia()) {
    enableWebcamButton = document.getElementById("webcamButton");
    enableWebcamButton.addEventListener("click", enableCam);
} else {
    console.warn("getUserMedia() is not supported by your browser");
}
