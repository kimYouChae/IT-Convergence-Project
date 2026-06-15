# StudyGuard

웹캠 기반 AI 행동 인식으로 공부 집중도를 관리하는 프론트엔드 웹 서비스

<img width="1920" height="906" alt="Image" src="https://github.com/user-attachments/assets/e77479ec-c01f-4279-a987-3456fcaa7144" />

## 목차
- [프로젝트 소개](#프로젝트-소개)
- [핵심 기능](#핵심-기능)
- [기술 스택 및 아키텍처](#기술-스택-및-아키텍처)
- [서비스 흐름도](#서비스-흐름도)
- [AI 모델 개발 과정](#ai-모델-개발-과정)
- [트러블슈팅](#트러블슈팅)
- [화면 구성](#화면-구성)
- [성과 및 한계](#성과-및-한계)
- [팀원 구성](#팀원-구성)

## ✨프로젝트 소개

많은 학생들이 혼자 공부할 때 집중력을 유지하는 데 어려움을 겪는다. 스마트폰 사용, 자리 이탈, 무의식적인 딴짓 등으로 학습 효율이 저하되지만, 기존 타이머 기반 공부 앱은 단순히 시간만 측정할 뿐 실제 집중 여부는 판단하지 못한다는 한계가 있다.

StudyGuard는 "AI가 직접 사용자의 행동을 관찰하여 딴짓을 감지하면 어떨까?"라는 아이디어에서 출발한 웹 기반 공부 보조 서비스다. 사용자가 공부 중일 때 웹캠을 통해 행동을 실시간으로 분석하고, 딴짓이 감지되면 화면에 감시 NPC(군인 캐릭터)가 등장해 경고를 줌으로써 자연스럽게 집중을 유도한다.

타겟 사용자는 다음과 같다.
- 시험을 준비하는 수험생 및 대학생
- 장시간 집중이 필요한 자기주도 학습자
- 꾸준한 공부 습관 형성을 원하는 사용자

## ✨핵심 기능

1. 실시간 행동 인식
   - 웹캠 영상을 입력받아 Teachable Machine 모델이 Focus / Phone / Away 세 가지 상태를 분류하고 UI에 실시간 표시

2. 딴짓 감지 및 경고 시스템
   - 딴짓 상태가 20초간 누적되면 경고 1회 발생
   - 단계별(1차/2차/3차)로 NPC 영상이 재생되며 경고 단계에 따라 처리

3. 라이프(하트) 시스템
   - 세션 시작 시 하트 3개 제공, 딴짓 감지 시마다 1개씩 차감
   - 모두 소진되면 세션 실패(게임 오버)

4. 공부 세션 관리
   - 사용자가 공부 시간을 직접 설정(최소 30분)하고, 타이머로 측정, 종료 버튼으로 세션 종료

5. 결과 피드백 및 기록 페이지
   - 성공/실패 결과 및 NPC 영상 출력, 딴짓 발생 시간 및 행동 로그 기록
   - 행동 분석망(도넛/막대 그래프)으로 공부/폰사용/자리비움 비율 시각화

6. 사운드/TTS
   - 상황별(클릭, 공부 시작, 경고, 성공, 실패 등) 7종의 사운드와 독일어 TTS 음성을 적용해 군사/작전 테마의 몰입감 강화

## ✨기술 스택 및 아키텍처

별도 서버 없이 동작하는 순수 프론트엔드 기반 구조로 설계되었다.

- Frontend: HTML(페이지 구조), CSS(UI 디자인 및 레이아웃), JavaScript(타이머 및 이벤트 제어)
- AI/ML: 사용자 웹캠 영상을 입력받아, Google Teachable Machine으로 학습한 Focus/Phone/Away 모델을 TensorFlow.js를 통해 브라우저에서 직접 추론(실시간 행동 인식)
- 개발 환경: Visual Studio Code
- 버전 관리: GitHub
- 배포: Netlify (GitHub push 시 자동 배포)

전체 구조는 "사용자 + 웹캠 → Frontend(HTML/CSS/JS) → AI/ML(Teachable Machine + TensorFlow.js) → 개발/버전관리/배포(VSCode-GitHub-Netlify)"의 흐름으로 구성된다.

<img width="500" height="400" alt="Image" src="https://github.com/user-attachments/assets/c4e15bcb-2e9d-42cf-8b70-049612f4e388" />

## ✨서비스 흐름도

1. 시작: 목표 공부 시간을 설정(최소 30분)하고 START 버튼 클릭
2. 공부 세션 진행: 웹캠으로 행동을 실시간 분석하여 Focus/Phone/Away 상태를 UI에 표시
3. 경고: 딴짓이 20초 누적되면 경고 1회와 함께 하트 1개 차감, NPC 영상 재생
4. 분기: 하트가 남아 있으면 세션 계속, 하트가 0이 되면 즉시 실패 처리
5. 종료 판정: 목표 시간 도달 시 하트가 남아 있으면 성공, 모두 소진되면 실패
6. 기록: 결과와 딴짓 발생 시각, 행동 로그가 "나의 기록실"에 저장

즉, 성공/실패는 "목표 시간 도달 여부"와 "남은 하트 수"의 조합으로 결정된다.

<img width="400" height="350" alt="Image" src="https://github.com/user-attachments/assets/e2084fac-66d5-4145-a7cd-aff0a9eabdb4" />

## ✨AI 모델 개발 과정

<details>
  <summary><b>데이터 수집 및 클래스 설계</b></summary>
  <ul>
    <li>초기에는 Focus / Phone / Away / Distracted 4가지 클래스로 데이터를 수집함</li>
    <li>클래스별 50~100장(목표 200~400장 이상)을 집, 학교, 카페 등 다양한 장소와 조명에서 정면 및 측면 각도로 촬영</li>
    <li>특정 인물이나 환경에 편향되지 않도록 여러 인물이 참여하였으며, 수집된 데이터는 외부 공유 없이 팀 내부에서만 사용</li>
  </ul>
</details>

<details>
  <summary><b>1차 학습 및 문제점 분석</b></summary>
  <ul>
    <li>1차 학습 후 다음과 같은 오분류가 발견됨
      <ul>
        <li>마스크 착용 시 Focus와 Phone 사이 오분류</li>
        <li>검정색 마우스 등 물체를 손에 들면 Phone으로 인식</li>
        <li>얼굴이 조금만 가려져도 Phone으로 인식</li>
      </ul>
    </li>
    <li>원인 분석
      <ul>
        <li>Phone 클래스 편향: 모델이 조금이라도 이상한 부분이 있으면 전부 Phone으로 판단하는 경향</li>
        <li>잘못된 특징 학습: "휴대폰 사용 행동"이 아닌 "얼굴 가림, 물체, 자세"와 같은 시각적 특징을 기준으로 학습됨</li>
        <li>Focus-Phone 경계 불명확: 마스크 착용이나 거리 변화 등 환경이 조금만 바뀌어도 두 클래스 간 예측이 흔들림</li>
        <li>Negative 데이터 부족: 반례 데이터가 부족하여 오분류가 반복적으로 발생</li>
      </ul>
    </li>
    <li>이미지</li>
    <img width="221" height="462" alt="Image" src="https://github.com/user-attachments/assets/61492db7-a195-41e3-a5c0-04afdeddb33f" />
  </ul>
</details>

<details>
  <summary><b>개선 과정</b></summary>
  <ul>
    <li>Focus 클래스에 얼굴 가림, 물체 사용, 시선 변화 등의 데이터를 추가</li>
    <li>동일한 환경에서 모든 클래스를 함께 촬영하여 배경 편향을 제거</li>
    <li>Phone 클래스는 단순히 물체를 들고 있는 상태가 아닌, 실제 휴대폰 사용 행동이 명확히 드러나는 데이터로 구성</li>
    <li>데이터 추가 → 재학습 → 테스트 → 오분류 분석의 과정을 반복</li>
    <li>얼굴 가림, 좌우 시선 변화, 거리 변화, 물체를 든 상황 등 다양한 상황별로 Focus와 Phone 데이터를 각 30장씩 짝지어 촬영하여 약 300장을 새로 수집</li>
  </ul>
</details>

<details>
  <summary><b>2차 학습 및 혼동 행렬 분석</b></summary>
  <ul>
    <li>개선된 데이터로 2차 학습을 진행한 결과, 일부 문제가 개선되었으나 다음과 같은 한계가 남아 있었음
      <ul>
        <li>얼굴 일부가 가려지면 여전히 Phone으로 오인식</li>
        <li>얼굴 방향에 따라 다른 클래스로 잘못 인식</li>
        <li>카메라와의 거리 변화에 따라 Phone으로 오분류</li>
        <li>동일한 데이터셋으로 학습해도 매번 결과가 조금씩 달라지는 현상 발견(Teachable Machine의 학습 초기화 방식에 따른 한계)</li>
      </ul>
    </li>
    <li>혼동 행렬(Confusion Matrix) 분석 결과
      <ul>
        <li>Focus 10/10 (100%)</li>
        <li>Away 6/7</li>
        <li>Phone 9/10</li>
        <li>Distracted 0/8 (0%)</li>
      </ul>
    </li>
    <li>이미지</li>
    <img width="570" height="494" alt="Image" src="https://github.com/user-attachments/assets/495c6d74-e53c-4739-8e51-5a3f012f1e84" />
    <li>전체 정확도는 약 71.4%였음. Focus, Phone, Away는 개선되었으나, Distracted 클래스는 거의 모든 케이스가 Phone으로 오분류되는 문제가 확인됨. 졸거나 엎드리는 자세가 휴대폰을 내려다보는 자세와 시각적으로 매우 유사하게 인식되기 때문</li>
  </ul>
</details>

<details>
  <summary><b>Distracted 클래스 제거 결정 및 최종 3개 클래스 모델</b></summary>
  <ul>
    <li>혼동 행렬 분석 결과를 바탕으로 팀 회의에서 Distracted 클래스를 삭제하기로 결정
      <ul>
        <li>실제 웹캠 환경에서는 카메라 각도상 엎드려 자는 모습이 제대로 잡히지 않음</li>
        <li>조는 행동 자체가 동작이 매우 작아 Teachable Machine이 의미 있는 패턴을 학습하기 어려움</li>
      </ul>
    </li>
    <li>최종적으로 Focus, Phone, Away 3개 클래스로 모델을 재구성</li>
    <li>3개 클래스로 축소한 이후에도 일부 오분류는 여전히 발생하고 있으나, 구조적으로 학습이 불가능한 클래스를 제거하여 모델의 혼란을 줄였다는 점에 의미가 있음. 남은 오분류 문제는 추가 데이터 수집과 테스트를 통해 지속적으로 개선해 나갈 계획</li>
  </ul>
</details>

## ✨트러블슈팅

<details>
  <summary><b>모바일 레이아웃 붕괴 문제</b></summary>
  <ul>
    <li>🚫문제: 베타 테스트 결과, 모바일 환경에서 공통적인 레이아웃 문제가 발견됨
      <ul>
        <li>세로 모드: 화면 좌측 장식용 군인 이미지가 화면 중앙으로 쏠리면서 타이틀, 시간 입력창, START 버튼 등 핵심 UI를 가리는 현상이 발생</li>
        <li>가로 모드: 화면 세로 높이가 줄어들면서 하단 상태 표시줄과 조작 버튼(성공/실패/종료)이 화면 밖으로 잘려나가지만, 세로 스크롤이 불가능하여 접근할 수 없는 현상이 발생</li>
        <li>동일한 유형의 증상이 아이폰 14 Pro, 갤럭시 S23+, 갤럭시 플립 4 등 다른 기종에서도 반복적으로 확인됨</li>
      </ul>
    </li>
    <img width="688" height="1123" alt="Image" src="https://github.com/user-attachments/assets/4c35a3d2-22bf-4791-bafc-02966d593d8e" />
    <li>🧾원인: PC 기준의 고정 단위(px, 100vh)와 강제 숨김(overflow: hidden) 설정에서 비롯됨. 화면 크기를 고정값으로 지정한 구조가 다양한 모바일 화면 크기와 가로/세로 전환에 유연하게 대응하지 못해, 화면 붕괴 및 스크롤 불가 현상으로 이어짐</li>
    <li>💡 해결:
      <ul>
        <li>반응형 유연화: 고정 픽셀 대신 가변 단위(%, max-width)를 도입하여 다양한 기기 크기에 맞춰 늘어나는 반응형(Fluid) 레이아웃을 구축</li>
        <li>터치 및 시야 확보: 미디어 쿼리를 적용하여 모바일 화면에서는 장식용 NPC 이미지를 축소 및 반투명 처리함으로써, 본문 가림 현상과 터치 오동작을 차단</li>
        <li>스크롤 및 배열 최적화: 높이 제한을 완화하여 세로 스크롤을 활성화하고, 기기를 가로 모드로 전환했을 때 Flexbox 배열 방향을 전환함으로써 좁은 공간에서의 UI 접근성을 개선</li>
      </ul>
      이를 통해 다양한 모바일 기종과 화면 방향에서도 핵심 UI가 가려지거나 잘리지 않고, 스크롤 및 버튼 클릭이 정상적으로 동작하도록 개선함
    </li>
    <img width="692" height="1135" alt="Image" src="https://github.com/user-attachments/assets/41899e1d-53cb-4832-b4ed-df59fe92a7aa" />
  </ul>
</details>

<details>
  <summary><b>Distracted 클래스 오분류 문제</b></summary>
  <ul>
    <li>🚫문제: 2차 학습 결과 Distracted 클래스의 정확도가 0%(8건 중 0건)로, 거의 모든 케이스가 Phone으로 오분류됨</li>
    <img width="570" height="494" alt="Image" src="https://github.com/user-attachments/assets/c0374918-0e42-426f-800e-3eb515b52237" />
    <li>🧾원인: 졸거나 엎드리는 자세가 휴대폰을 내려다보는 자세와 시각적으로 매우 유사해 모델이 구분하지 못했고, 실제 웹캠 환경(각도상 엎드린 모습이 제대로 잡히지 않음)과 졸음 행동의 작은 동작 특성상 Teachable Machine이 의미 있는 패턴을 학습하기 어려운 구조였음</li>
    <li>💡해결: 팀 회의를 통해 Distracted 클래스를 제거하고, Focus/Phone/Away 3개 클래스로 모델을 재구성함. 구조적으로 학습이 불가능한 클래스를 제거하여 모델의 혼란을 줄였으며, 남은 오분류 문제는 추가 데이터 수집과 테스트를 통해 지속적으로 개선할 계획</li>
  </ul>
</details>

<details>
  <summary><b>경고 로직 민감도 문제</b></summary>
  <ul>
    <li>🚫문제: 초기에는 행동 인식 결과가 변경되는 즉시 경고를 발생시켰는데, 1초마다 인식 상태가 바뀌면서 잠깐 고개를 돌리는 정도의 동작에도 경고가 발생하는 문제가 있었음</li>
    <li>🧾원인: 즉시 반응형 경고 로직으로 인해, 짧은 시간의 자세 변화도 딴짓으로 즉시 판정됨</li>
    <li>💡해결: 딴짓 상태(Phone/Away)가 20초간 누적되었을 때 경고 1회가 발생하도록 로직을 수정함. 화면 좌측 하단에 "상태: 딴짓 감지(20/20초) | 남은 시간: 28:20"과 같이 현재 인식 상태, 누적 시간, 남은 세션 시간을 함께 표시하여 사용자가 자신의 상태를 실시간으로 확인할 수 있도록 구현함</li>
    <img width="443" height="92" alt="Image" src="https://github.com/user-attachments/assets/c9382d88-cb8e-4e41-b2c2-1e970ee38cfa" />
  </ul>
</details>

## ✨화면 구성

<details>
  <summary><b>시작 화면</b></summary>
  <p>프로젝트 타이틀과 목표 공부 시간을 입력하는 화면으로, START 버튼을 통해 세션을 시작한다.</p>
  <img width="1920" height="1020" alt="Image" src="https://github.com/user-attachments/assets/940ef4c3-b576-4a5b-8db2-5b1cfadf962f" />
</details>

<details>
  <summary><b>메인 화면</b></summary>
  <p>좌측에는 NPC 영상, 우측에는 사용자 웹캠 화면이 배치되며, 하단에는 인식 결과, 하트(라이프) 아이콘, 현재 상태 및 누적 시간, 그리고 성공/실패/STOP 버튼이 위치한다.</p>
  <p>NPC 영상은 사용자의 행동 상태에 따라 연동된다.</p>
  <ul>
    <li>시작 시: NPC가 등장하여 공부 시작을 알리는 영상 재생</li>
    <li>1·2차 딴짓 시: NPC가 방 안으로 걸어와 경고하는 영상 출력</li>
    <li>3차 딴짓(실패) 시: 세션 실패 처리와 함께 실패 화면 출력</li>
    <li>성공 시: NPC가 박수를 치며 격려하는 보상 영상 출력</li>
  </ul>
  <p>화면은 NPC 영상 영역과 사용자 웹캠 영역으로 분리되어 있으며, 인식 결과(Focus/Phone/Away)와 각 상태별 확률, 남은 하트, 현재 상태 및 남은 시간이 함께 표시된다.</p>
  <img width="1920" height="1020" alt="Image" src="https://github.com/user-attachments/assets/f267bd97-9fea-4a4e-9435-688a671bc827" />
</details>

<details>
  <summary><b>성공 화면</b></summary>
  <p>"성공! 목표 시간을 달성했습니다. 수고하셨습니다!" 문구와 함께 대기실 복귀 버튼이 표시된다.</p>
  <img width="1920" height="1020" alt="Image" src="https://github.com/user-attachments/assets/53996389-08ea-4f68-9810-79d65596e033" />
</details>

<details>
  <summary><b>실패 화면</b></summary>
  <p>"실패... 딴짓이 감지되어 공부 모드가 종료되었습니다." 문구와 함께 대기실 복귀 버튼이 표시된다.</p>
  <img width="1920" height="1020" alt="Image" src="https://github.com/user-attachments/assets/caca5b2a-6488-4d9a-9476-a67799c28fcb" />
</details>

<details>
  <summary><b>나의 기록실 화면</b></summary>
  <p>누적 집중 시간, 행동 분석망(도넛/막대 그래프를 통한 Focus/Phone/Away 비율), 작전 로그(세션별 성공/실패 기록)를 확인할 수 있다.</p>
  <img width="1920" height="1020" alt="Image" src="https://github.com/user-attachments/assets/6be5fc24-82c4-42a1-99e3-fda8ba97f6ef" />
  <img width="1920" height="1020" alt="Image" src="https://github.com/user-attachments/assets/10bace2e-ac0e-49ba-bf50-99d74bd8fb0f" />
</details>

## ✨성과 및 한계

<details>
  <summary><b>프로젝트 성과 요약</b></summary>
  <ul>
    <li>Teachable Machine을 활용한 행동 인식 모델을 1차/2차 학습 및 혼동 행렬 분석을 거쳐 개선하였으며, 구조적으로 학습이 어려운 Distracted 클래스를 제거하여 Focus/Phone/Away 3개 클래스 모델로 최종 구성하였다.</li>
    <li>실시간 행동 인식, 딴짓 감지 및 경고 시스템(20초 누적 임계값), 라이프(하트) 시스템, 공부 세션 관리, 결과 피드백 및 기록 기능을 모두 구현하였다.</li>
    <li>생성형 AI를 활용한 NPC 영상과 TTS 음성, 효과음을 상황별로 연동하여 게임적 몰입감을 강화하였다.</li>
    <li>시작, 메인, 성공, 실패, 나의 기록실 화면을 포함한 전체 UI/UX를 완성하고 Netlify를 통해 웹에 배포하였다.</li>
    <li>베타 테스트를 통해 모바일 환경에서의 레이아웃 붕괴 문제를 발견하고, 반응형 레이아웃 적용을 통해 해결하였다.</li>
  </ul>
</details>

<details>
  <summary><b>결론 및 한계</b></summary>
  <ul>
    <li>Focus/Phone/Away 3개 클래스로 축소한 이후에도 일부 오분류는 여전히 발생하고 있다. 이는 추가 데이터 수집과 재학습을 통해 개선될 수 있을 것으로 보인다.</li>
    <li>Teachable Machine의 학습 초기화 방식으로 인해 동일한 데이터셋으로 재학습하더라도 매번 모델 성능에 미세한 차이가 발생하는 한계가 있다.</li>
    <li>본 서비스는 PC 환경을 기준으로 설계되어, 모바일 환경에서는 일부 화면에서 장식 이미지의 비중이 커서 목표 시간 입력창과 START 버튼을 확인하려면 스크롤이 필요한 상태이다. 모바일 환경에 대한 최적화는 향후 레이아웃 비중 조정 등 추가적인 UI/UX 개선을 통해 보완될 수 있을 것이다.</li>
  </ul>
</details>

## ✨팀원 구성

| 담당 업무 | 세부 역할 | 담당자 |
| --- | --- | --- |
| 머신러닝 | 웹캠 데이터 수집 (Focus, Phone, Away) | 김지현, 백주은, 채준혁 |
| 웹 연동 | Teachable Machine 모델 학습, 웹 환경에 모델 연동 및 카메라 인식 구현 | 백주은, 채준혁 |
| 머신러닝 테스트 | 오분류 케이스 분석, 데이터 재수집 및 재학습을 통한 성능 개선 검증 | 김지현, 박지은, 백주은, 채준혁 |
| UI/UX 디자인 | 웹 UI 디자인 제작, 화면 레이아웃 기획 및 게임적 요소 시각화 | 박지은 |
| AI 영상/음성 및 사운드 제작 | 생성형 AI를 활용한 NPC(군인) 영상 제작, TTS를 활용한 NPC 음성 생성 | 김지현 |
| 기획 및 문서 작업 | 프로젝트 기획서 및 최종 보고서 작성, 프로젝트 일정 및 진행 상황 관리 | 김지현 |
