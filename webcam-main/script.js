/**
 * Study Guard - 최종 통합 스크립트
 */

const URL = "./my_model/"; // 모델 경로 (프로젝트 폴더 내부로 이동 후 수정)
const VIDEO_PATH = "./npc_video/"; // npc_video 폴더를 webcam-main 폴더 안에 넣어주세요.
let model, webcam, labelContainer, maxPredictions;
let isRunning = false;
let animationId = null;
let successTimerId = null; // 목표 시간 달성 타이머를 관리할 변수
let remainingTimeStr = "00:00"; // 화면에 표시할 남은 시간 문자열

// --- NPC 비디오 및 상태 관리 변수 ---
let warningCount = 0;

// --- 상태 변화 기록(작전 로그) 변수 ---
let actionLogs = [];
let lastLoggedState = "";
let isDistractedState = false; // 현재 딴짓 상태인지 여부
let distractionStartTime = 0; // 딴짓이 시작된 시간

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
 * [추가] 상태 로그 기록 및 UI 업데이트 함수
 */
function addStateLog(stateName) {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    actionLogs.push({ time: timeString, state: stateName });
    
    const tbody = document.getElementById('log-table-body');
    if (tbody) {
        tbody.innerHTML = "";
        actionLogs.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${log.time}</td><td>${log.state}</td>`;
            tbody.appendChild(tr);
        });
    }
}

/**
 * [3-1] 시작 버튼 클릭 시 초기화 및 시작 영상 재생
 */
async function init() {
    if (isRunning) return;

    // --- 공부 시간 입력받기 ---
    const inputTime = document.getElementById('study-time-input').value;
    const studyDurationMinutes = parseInt(inputTime, 10);
    if (isNaN(studyDurationMinutes) || studyDurationMinutes < 30) {
        alert("최소 30분 이상 설정해야 합니다.");
        return;
    }

    // 메인 페이지로 화면 전환
    switchPage('main-page');

    // 태그 재확인
    npcVideo = document.getElementById('npc-video');
    npcPlaceholder = document.getElementById('npc-placeholder');
    document.getElementById('prediction-text').innerText = "시작 중...";

    // 1. 웹캠 및 모델 설정
    if (!webcam) await setupWebcam();
    if (!model) await loadModel();
    if (!model) return;

    // 새 공부 시작 시 이전 로그 초기화
    actionLogs = [];
    lastLoggedState = "";
    isDistractedState = false;
    distractionStartTime = 0;
    if (document.getElementById('log-table-body')) {
        document.getElementById('log-table-body').innerHTML = "";
    }

    // 2. 시작 영상 재생 후 감시 루프 시작 (영문 파일명으로 변경)
    playNpcSequence(['start_in.mp4', 'start_out.mp4'], () => {
        console.log("시작 영상 완료, 감시를 시작합니다.");
        isRunning = true;
        animationId = window.requestAnimationFrame(loop);

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
            stopApp();
            showResultPage(false);
        });
    }
}

/**
 * [3-3] 성공 상태 처리 (필요 시 호출)
 */
function triggerSuccess() {
    playNpcSequence(['success.mp4'], () => {
        stopApp();
        showResultPage(true);
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
        isDistractedState = false;
        distractionStartTime = 0;
        return;
    }

    // [수정] 딴짓(휴대폰, 자리비움, 졸기)이 20초 이상 지속될 때 로그 기록 및 경고 영상 재생
    if (best.probability > 0.8) {
        if (best.className === "Focus(공부중)") {
            if (isDistractedState) {
                isDistractedState = false;
                distractionStartTime = 0;
            }

            if (lastLoggedState !== "Focus(공부중)") {
                addStateLog("Focus(공부중)");
                lastLoggedState = "Focus(공부중)";
            }
            
            if (isRunning) {
                document.getElementById('status-text').innerText = `상태 : 감시 중 (정상) | 남은 시간: ${remainingTimeStr}`;
            }
        } else if (["Distracted(졸기,엎드려 자기)", "Phone(휴대폰 사용)", "Away(자리비움)"].includes(best.className)) {
            if (!isDistractedState) {
                isDistractedState = true;
                distractionStartTime = Date.now();
            }

            const elapsedDistractionSec = (Date.now() - distractionStartTime) / 1000;
            
            // 화면 하단에 딴짓 20초 카운트다운을 시각적으로 표시
            document.getElementById('status-text').innerText = `상태 : 딴짓 감지 (${Math.floor(elapsedDistractionSec)}/20초) | 남은 시간: ${remainingTimeStr}`;

            if (elapsedDistractionSec >= 20) {
                // 20초 돌파 시 현재 딴짓 상태를 로그에 기록
                if (best.className !== lastLoggedState) {
                    addStateLog(best.className);
                    lastLoggedState = best.className;
                }
                
                // 경고 영상 재생
                triggerWarning();
                
                // 경고 발생 후 타이머 리셋
                isDistractedState = false;
                distractionStartTime = 0;
            }
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
}

// --- 화면 전환 및 결과 페이지 처리 ---
function switchPage(pageId) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

function showResultPage(isSuccess) {
    switchPage('result-page');
    const title = document.getElementById('result-title');
    const message = document.getElementById('result-message');
    
    if (isSuccess) {
        title.innerText = "성공!";
        title.style.color = "#2ecc71"; // 녹색
        message.innerText = "목표 시간을 달성했습니다. 수고하셨습니다!";
    } else {
        title.innerText = "실패...";
        title.style.color = "#e74c3c"; // 적색
        message.innerText = "딴짓이 감지되어 공부 모드가 종료되었습니다.";
    }
}

// 이벤트 바인딩
window.onload = function () {
    npcVideo = document.getElementById('npc-video');
    npcPlaceholder = document.getElementById('npc-placeholder');
    //시작 페이지 START 버튼
    document.getElementById('real-start-btn').onclick = init;

    // 성공 버튼 : 누르면 즉시 성공 영상 재생 후 종료
    document.getElementById('success-btn').onclick = () => {
        triggerSuccess();
    };

    //실패 버튼 : 누르면 즉시 실패 영상 재생 후 종료
    document.getElementById('fail-btn').onclick = () => {
        playNpcSequence(['fail1.mp4', 'fail2.mp4'], () => {
            stopApp();
            showResultPage(false);
        });
    };

    // 종료 버튼 클릭 시 실패 영상 세트 재생 후 종료
    document.getElementById('exit-btn').onclick = () => {
        playNpcSequence(['fail1.mp4', 'fail2.mp4'], () => {
            stopApp();
            showResultPage(false);
        });
    };

    // 결과 페이지 처음으로 버튼
    document.getElementById('go-home-btn').onclick = () => {
        switchPage('start-page');
    };

    // 시작 페이지 -> 기록 페이지 이동 버튼
    document.getElementById('go-record-btn').onclick = () => {
        switchPage('record-page');
    };

    // 기록 페이지 -> 대기실(시작 페이지) 복귀 버튼
    document.getElementById('back-to-lobby-btn').onclick = () => {
        switchPage('start-page');
    };
};

// 종료 버튼: 영상 없이 즉시 앱 중지 (기능 분리) 추후 수정시 사용하사면 됩니다. (백주은)
    /* document.getElementById('exit-btn').onclick = () => {
        if(confirm("프로그램을 종료하시겠습니까?")) {
            stopApp();
        }
    };
}; */