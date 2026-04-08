// Teachable Machine 이미지 모델을 웹캠과 연결하고 예측 결과를 표시하는 코드입니다.

const URL = "../my_model/"; // 현재 index.html 위치 기준으로 상위 폴더의 my_model을 가리킵니다.
let model, webcam, labelContainer, maxPredictions;
let isRunning = false;
let animationId = null;

async function init() {
    if (isRunning) return;
    document.getElementById('prediction-text').innerText = "시작 중...";

    if (window.location.protocol === 'file:') {
        document.getElementById('prediction-text').innerText = "파일로 열면 모델 로드가 실패할 수 있습니다. http://localhost:8000 으로 실행하세요.";
        return;
    }

    if (!webcam) {
        await setupWebcam();
    }

    if (!model) {
        await loadModel();
    }

    if (!model) {
        return;
    }

    isRunning = true;
    animationId = window.requestAnimationFrame(loop);
}

async function loadModel() {
    try {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        console.log("Teachable Machine 모델 로드 완료");
        labelContainer = document.getElementById("label-container");
        labelContainer.innerHTML = "";
        for (let i = 0; i < maxPredictions; i++) {
            labelContainer.appendChild(document.createElement("div"));
        }
        document.getElementById('prediction-text').innerText = "모델 로드 완료";
    } catch (error) {
        console.error("모델 로드 실패:", error);
        const message = error && error.message ? error.message : "모델을 불러올 수 없습니다.";
        document.getElementById('prediction-text').innerText = `모델 로드 실패: ${message}`;
    }
}

async function setupWebcam() {
    const flip = true;
    webcam = new tmImage.Webcam(400, 300, flip);
    await webcam.setup();
    await webcam.play();
    const container = document.getElementById("webcam-container");
    container.innerHTML = "";
    container.appendChild(webcam.canvas);
}

async function loop() {
    if (!isRunning) return;
    webcam.update();
    if (model) {
        await predict();
    }
    animationId = window.requestAnimationFrame(loop);
}

async function predict() {
    const prediction = await model.predict(webcam.canvas);
    let best = prediction[0];
    for (let i = 0; i < maxPredictions; i++) {
        const classPrediction = `${prediction[i].className}: ${prediction[i].probability.toFixed(2)}`;
        labelContainer.childNodes[i].innerHTML = classPrediction;
        if (prediction[i].probability > best.probability) {
            best = prediction[i];
        }
    }
    document.getElementById('prediction-text').innerText = best.className;
    document.getElementById('status-text').innerText = `상태 : ${best.className}`;
}

function stopApp() {
    if (!isRunning) return;
    isRunning = false;
    if (animationId) {
        window.cancelAnimationFrame(animationId);
        animationId = null;
    }
    if (webcam && webcam.webcam && webcam.webcam.srcObject) {
        webcam.webcam.srcObject.getTracks().forEach(track => track.stop());
    }
    document.getElementById('prediction-text').innerText = "중지됨";
    document.getElementById('status-text').innerText = "상태 : 대기 중";
    document.getElementById('webcam-container').innerHTML = "";
    webcam = null;
}

window.onload = function() {
    document.getElementById('start-btn').onclick = init;
    document.getElementById('exit-btn').onclick = stopApp;
};