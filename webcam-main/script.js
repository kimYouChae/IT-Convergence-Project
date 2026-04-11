/**
 * Study Guard - 최종 통합 스크립트
 */

const URL = "./my_model/"; // 모델 경로 (프로젝트 폴더 내부로 이동 후 수정)
const VIDEO_PATH = "../npc_video/"; // NPC 영상 폴더가 상위 폴더에 있는 경우
let model, webcam, labelContainer, maxPredictions;
let isRunning = false;
let animationId = null;
let successTimerId = null; // 목표 시간 달성 타이머를 관리할 변수
let remainingTimeStr = "00:00"; // 화면에 표시할 남은 시간 문자열

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
    if (!npcVideo) {
        console.error("오류: HTML에서 'npc-video' 요소를 찾을 수 없습니다. index.html이 최신 상태인지 확인해 주세요.");
        if (onComplete) onComplete();
        return;
    }

    npcVideo.style.display = 'block';
    npcVideo.muted = false;

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

    // --- 공부 시간 입력받기 ---
    const inputTime = prompt("몇 분 동안 공부하시겠습니까? (숫자만 입력)", "50");
    if (inputTime === null) return; // 취소 버튼 클릭 시 시작 안 함
    const studyDurationMinutes = parseInt(inputTime, 10);
    if (isNaN(studyDurationMinutes) || studyDurationMinutes <= 0) {
        alert("올바른 시간을 입력해 주세요.");
        return;
    }

    // 태그 재확인
    npcVideo = document.getElementById('npc-video');
    npcPlaceholder = document.getElementById('npc-placeholder');
    document.getElementById('prediction-text').innerText = "시작 중...";

    // 1. 웹캠 및 모델 설정
    if (!webcam) await setupWebcam();
    if (!model) await loadModel();
    if (!model) return;

    // 2. 시작 영상 재생 후 감시 루프 시작 (영문 파일명으로 변경)
    playNpcSequence(['start_in.mp4', 'start_out.mp4'], () => {
        console.log("시작 영상 완료, 감시를 시작합니다.");
        isRunning = true;
        animationId = window.requestAnimationFrame(loop);
        distractionStack = 0;

        // --- 남은 시간 카운트다운 로직 ---
        let totalSeconds = studyDurationMinutes * 60;
        const updateTimerStr = () => {
            const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
            const s = (totalSeconds % 60).toString().padStart(2, '0');
            remainingTimeStr = `${m}:${s}`;
        };
        
        updateTimerStr();
        document.getElementById('status-text').innerText = `상태 : 감시 중 | 남은 시간: ${remainingTimeStr}`;

        // 1초마다 남은 시간 감소 및 화면 업데이트
        successTimerId = setInterval(() => {
            if (isRunning) {
                totalSeconds--;
                updateTimerStr();
                
                // predict 함수 실행과 무관하게 타이머 UI 갱신
                const currentText = document.getElementById('status-text').innerText;
                const baseStatus = currentText.split(' | ')[0];
                document.getElementById('status-text').innerText = `${baseStatus} | 남은 시간: ${remainingTimeStr}`;

                if (totalSeconds <= 0) {
                    clearInterval(successTimerId);
                    triggerSuccess();
                }
            }
        }, 1000);
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
        // 1차 경고
        playNpcSequence(['warning1_in.mp4', 'warning1_out.mp4']);
    }
    else if (warningCount === 2) {
        // 2차 경고
        playNpcSequence(['warning2_in.mp4', 'warning2_out.mp4']);
    }
    else if (warningCount >= 3) {
        // 3차 경고 (실패)
        playNpcSequence(['fail1.mp4', 'fail2.mp4'], () => {
            alert("실패! 공부 모드가 종료됩니다.");
            stopApp();
        });
    }
}

/**
 * [3-3] 성공 상태 처리 (필요 시 호출)
 */
function triggerSuccess() {
    playNpcSequence(['success.mp4'], () => {
        alert("목표 시간 달성! 수고하셨습니다.");
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
            document.getElementById('status-text').innerText = `상태 : 딴짓 감지 (${distractionStack}/${DISTRACTION_THRESHOLD}) | 남은 시간: ${remainingTimeStr}`;

        if (distractionStack >= DISTRACTION_THRESHOLD) {
            triggerWarning();
            distractionStack = 0;
        }
    } else {
        distractionStack = 0;
        if (isRunning) {
                document.getElementById('status-text').innerText = `상태 : 감시 중 (정상) | 남은 시간: ${remainingTimeStr}`;
        }
    }
}

/**
 * 앱 중지 및 초기화
 */
function stopApp() {
    isRunning = false;
    if (successTimerId) {
        clearInterval(successTimerId); // 실행 중인 성공 타이머 취소
        successTimerId = null;
    }
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
        playNpcSequence(['fail1.mp4', 'fail2.mp4'], () => {
            stopApp();
            alert("수동 실패 처리가 완료되었습니다.");
        });
    };

    // 종료 버튼 클릭 시 실패 영상 세트 재생 후 종료
    document.getElementById('exit-btn').onclick = () => {
        playNpcSequence(['fail1.mp4', 'fail2.mp4'], () => {
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