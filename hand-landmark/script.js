const webcamButton = document.getElementById("webcamButton");
const video = document.getElementById("webcam");
const outputCanvas = document.getElementById("output_canvas");
const canvasCtx = outputCanvas.getContext("2d");

let webcamRunning = false;

const hasGetUserMedia = () => !!navigator.mediaDevices.getUserMedia;

if (hasGetUserMedia()) {
    webcamButton.addEventListener("click", enableCam);
} else {
    alert("Your browser does not support getUserMedia.");
}

async function enableCam() {
    if (webcamRunning) {
        webcamRunning = false;
        webcamButton.innerText = "ENABLE WEBCAM";
        video.srcObject.getTracks().forEach(track => track.stop());
    } else {
        webcamRunning = true;
        webcamButton.innerText = "DISABLE WEBCAM";

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            video.addEventListener("loadeddata", predictWebcam);
            alert("Webcam connected successfully!");
        } catch (error) {
            alert("Error connecting to webcam: " + error.message);
        }
    }
}

function predictWebcam() {
    outputCanvas.width = video.videoWidth;
    outputCanvas.height = video.videoHeight;

    canvasCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
    canvasCtx.save();
    canvasCtx.scale(-1, 1);
    canvasCtx.drawImage(video, -outputCanvas.width, 0, outputCanvas.width, outputCanvas.height);
    canvasCtx.restore();

    if (webcamRunning) {
        requestAnimationFrame(predictWebcam);
    }
}
