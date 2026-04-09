/**
 * Study Guard - 최종 통합 스크립트
 */

const URL = "./my_model/"; // 모델 경로 (프로젝트 폴더 내부로 이동 후 수정)
const VIDEO_PATH = "./npc_video/"; // NPC 영상 폴더 경로
let model, webcam, labelContainer, maxPredictions;
let isRunning = false;
let animationId = null;

// --- NPC 비디오 및 상태 관리 변수 ---
let warningCount = 0;
let distractionStack = 0;
const DISTRACTION_THRESHOLD = 200; // 약 10초간 유지될 때 경고 (프레임 단위) **1초 = 20프레임 입니다.

let npcVideo;
let npcPlaceholder;

/**
 * [공통] 영상을 순서대로 재생하는 함수
 */
function playNpcSequence(sources, onComplete = null) {
    let currentIdx = 0;

    if (npcPlaceholder) npcPlaceholder.style.display = 'none';
    if (npcVideo) {
        npcVideo.style.display = 'block';
        npcVideo.muted = false;
    }

    const playNext = () => {
        if (currentIdx < sources.length) {
            const videoSrc = VIDEO_PATH + sources[currentIdx];
            console.log("재생 중:", videoSrc);
            npcVideo.src = videoSrc;
            npcVideo.play().catch(e => {
                console.error("재생 실패(경로 및 파일명 확인):", videoSrc, e);
            });
            currentIdx++;
        } else {
            // 모든 영상 재생 완료 시
            if (onComplete) onComplete();
        }
    };

    npcVideo.onended = playNext;
    playNext();
}

/**
 * [3-1] 시작 버튼 클릭 시 초기화 및 시작 영상 재생
 */
async function init() {
    if (isRunning) return;

    // 태그 재확인
    npcVideo = document.getElementById('npc-video');
    npcPlaceholder = document.getElementById('npc-placeholder');
    document.getElementById('prediction-text').innerText = "시작 중...";

    // 1. 웹캠 및 모델 설정
    if (!webcam) await setupWebcam();
    if (!model) await loadModel();
    if (!model) return;

    // 2. 시작 영상 재생 후 감시 루프 시작
    playNpcSequence(['시작-들어오는.mp4', '시작-나가는.mp4'], () => {
        console.log("시작 영상 완료, 감시를 시작합니다.");
        isRunning = true;
        animationId = window.requestAnimationFrame(loop);
        document.getElementById('status-text').innerText = "상태 : 감시 중";
        distractionStack = 0;
    });
}

/**
 * [3-2] 경고 단계 처리 함수
 */
function triggerWarning() {
    // 이미 경고 영상이 재생 중일 때는 추가 실행 방지
    if (!npcVideo.paused && npcVideo.src !== "") return;

    warningCount++;
    console.log(`경고 발생! 현재 횟수: ${warningCount}`);

    if (warningCount === 1) {
        // 1차 경고 (파일명: 이미지 기준)
        playNpcSequence(['경고-방으로 들어오는.mp4', '경고-방밖으로나가는.mp4']);
    }
    else if (warningCount === 2) {
        // 2차 경고 (파일명: 언더바(_) 주의)
        playNpcSequence(['경고2_들어오기.mp4', '경고2_나가기.mp4']);
    }
    else if (warningCount >= 3) {
        // 3차 경고 (실패)
        playNpcSequence(['실패1.mp4', '실패2.mp4'], () => {
            alert("실패! 공부 모드가 종료됩니다.");
            stopApp();
        });
    }
}

/**
 * [3-3] 성공 상태 처리 (필요 시 호출)
 */
function triggerSuccess() {
    playNpcSequence(['성공-박수.mp4'], () => {
        alert("목표 달성! 수고하셨습니다.");
        stopApp();
    });
}

// --- Teachable Machine 기본 로직 ---

async function loadModel() {
    try {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        labelContainer = document.getElementById("label-container");
        labelContainer.innerHTML = "";
        for (let i = 0; i < maxPredictions; i++) {
            labelContainer.appendChild(document.createElement("div"));
        }
        document.getElementById('prediction-text').innerText = "모델 로드 완료";
    } catch (error) {
        console.error("모델 로드 실패:", error);
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
    await predict();
    animationId = window.requestAnimationFrame(loop);
}

/**
 * 예측 및 로직 판단
 */
async function predict() {
    if (!model) return;
    const prediction = await model.predict(webcam.canvas);
    let best = prediction[0];

    // 화면 결과 표시
    for (let i = 0; i < maxPredictions; i++) {
        labelContainer.childNodes[i].innerHTML = `${prediction[i].className}: ${prediction[i].probability.toFixed(2)}`;
        if (prediction[i].probability > best.probability) {
            best = prediction[i];
        }
    }

    document.getElementById('prediction-text').innerText = best.className;

    // NPC 영상이 재생 중인 동안은 딴짓 감지 카운트를 하지 않음
    if (!npcVideo.paused) {
        distractionStack = 0;
        return;
    }

    // [중요] 클래스 이름 100% 일치 확인
    if (best.className === "Distracted(졸기,엎드려 자기)" && best.probability > 0.9) {
        distractionStack++;
        document.getElementById('status-text').innerText = `상태 : 딴짓 감지 (${distractionStack}/${DISTRACTION_THRESHOLD})`;

        if (distractionStack >= DISTRACTION_THRESHOLD) {
            triggerWarning();
            distractionStack = 0;
        }
    } else {
        distractionStack = 0;
        if (isRunning) {
            document.getElementById('status-text').innerText = "상태 : 감시 중 (정상)";
        }
    }
}

/**
 * 앱 중지 및 초기화
 */
function stopApp() {
    isRunning = false;
    if (animationId) {
        window.cancelAnimationFrame(animationId);
        animationId = null;
    }
    if (webcam && webcam.webcam && webcam.webcam.srcObject) {
        webcam.webcam.srcObject.getTracks().forEach(track => track.stop());
    }

    if (npcVideo) {
        npcVideo.pause();
        npcVideo.src = ""; // 소스 초기화
        npcVideo.style.display = 'none';
    }
    if (npcPlaceholder) npcPlaceholder.style.display = 'flex';

    document.getElementById('prediction-text').innerText = "중지됨";
    document.getElementById('status-text').innerText = "상태 : 대기 중";
    document.getElementById('webcam-container').innerHTML = "";
    webcam = null;
    warningCount = 0;
    distractionStack = 0;
}

// 이벤트 바인딩
window.onload = function () {
    npcVideo = document.getElementById('npc-video');
    npcPlaceholder = document.getElementById('npc-placeholder');
    //시작버튼
    document.getElementById('start-btn').onclick = init;

    //실패 버튼 : 누르면 즉시 실패 영상 재생 후 종료
    document.getElementById('fail-btn').onclick = () => {
        playNpcSequence(['실패1.mp4', '실패2.mp4'], () => {
            stopApp();
            alert("수동 실패 처리가 완료되었습니다.");
        });
    };

    // 종료 버튼 클릭 시 실패 영상 세트 재생 후 종료
    document.getElementById('exit-btn').onclick = () => {
        playNpcSequence(['실패1.mp4', '실패2.mp4'], () => {
            stopApp();
        });
    };
};

// 종료 버튼: 영상 없이 즉시 앱 중지 (기능 분리) 추후 수정시 사용하사면 됩니다. (백주은)
    /* document.getElementById('exit-btn').onclick = () => {
        if(confirm("프로그램을 종료하시겠습니까?")) {
            stopApp();
        }
    };
}; */