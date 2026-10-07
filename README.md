# FigCheck 0.3.23

웹 요소를 선택해 크기·여백·색상·글꼴을 확인하고, 필요할 때 Figma 디자인과 비교하는 로컬 도구입니다. **JSON 없이 웹 탐색부터 시작할 수 있습니다.** 서버·로그인 없이 동작하며 분석 데이터를 외부로 전송하지 않습니다.

## 설치

저장소에는 실행용 빌드가 포함되어 있어 사용만 할 때는 Node.js가 필요 없습니다. 아래 경로는 저장소 루트 기준입니다.

| 앱 | 설치 대상 |
|---|---|
| Chrome 140 이상 | `chrome://extensions` → 개발자 모드 → 압축해제된 확장 프로그램 로드 → **`apps/chrome-extension/dist`** 폴더 |
| Figma 개발 플러그인 | Plugins → Development → Import plugin from manifest → **`apps/figma-plugin/dist/manifest.json`** |

확장을 업데이트하면 확장 관리 화면에서 새로고침하고 DevTools를 다시 여세요. Figma는 플러그인을 종료한 뒤 다시 실행해 헤더의 버전을 확인합니다. Figma manifest의 `main`과 `ui`는 같은 dist 폴더의 `code.js`, `ui.html`을 가리킵니다. [설치·문제 해결](docs/설치-사용.md)

## 웹 요소부터 확인하기

1. 일반 웹페이지에서 DevTools를 열고 **FigCheck ⇄** 탭으로 이동합니다.
2. **요소 선택**을 누른 뒤 페이지의 요소를 클릭하거나 Enter로 확정합니다. Elements에서 선택한 `$0`도 사용할 수 있습니다.
3. DevTools에서 영역 구조·색상·타이포그래피를 확인합니다. 페이지에는 기준 **A**의 윤곽과 작은 박스 도식이 고정됩니다.
4. **Alt를 누른 채 다른 요소 B 위로 이동**하면 가로·세로 간격, 포함된 박스의 네 방향 거리, 맞닿음·겹침을 확인합니다. Alt를 떼면 B와 거리선만 사라지고 A는 유지됩니다.

| 조작 | 동작 |
|---|---|
| 선택 중 ↑ / ↓ | 부모 / 이전 자식으로 뎁스 탐색 |
| 클릭 / Enter | 표시된 요소 확정 |
| Alt + hover | 고정 A와 B의 거리 측정; B는 비교 대상을 바꾸지 않음 |
| 휠·Alt+휠 | 네이티브 페이지 스크롤; **뎁스 탐색에 사용하지 않음** |
| Esc | 선택/고정 표시 종료; 이미 수집한 선택·비교 값은 유지 |
| Ctrl+Shift+X | DevTools가 열린 페이지에서 선택 켜기/끄기; 충돌 시 `chrome://extensions/shortcuts`에서 조정 |

Ctrl 확대·Shift 스크롤·입력 필드와 다른 단축키는 불필요하게 가로채지 않습니다. 측정에 실제 사용한 단독 Alt 해제만 메뉴 포커스 전환을 줄이기 위해 처리합니다.

박스 도식의 **Border·Padding**은 각 영역 좌상단, Radius는 네 모서리 아이콘과 값으로 표시합니다. 도식은 비례 축척이 아닙니다. 페이지 오버레이의 치수와 거리는 `getBoundingClientRect()`의 **축 정렬 렌더링 경계, CSS px**이며 작성한 margin/padding 값이나 실제 칠해진 픽셀 간격이 아닙니다. CSS width/height·변환 전 크기와 다를 수 있습니다. [선택·거리·자동 갱신](docs/요소선택-시각비교.md)

수동 갱신 버튼 없이 선택한 웹 값을 자동 반영합니다. 활성 패널에서 약 **750ms 간격**으로 값 변화를 확인하고, 바뀐 경우만 다시 수집합니다. 평가 시간과 백그라운드 제한으로 지연될 수 있으며 모든 애니메이션 프레임을 기록하지 않습니다. 오버레이와 패널도 매 프레임 동기화하는 방식은 아닙니다.

## 필요한 경우 Figma와 비교하기

1. Figma에서 노드 하나를 선택하고 FigCheck를 실행합니다. 추출된 속성을 확인한 뒤 **JSON 복사** 또는 **파일 저장**을 사용합니다.
2. DevTools의 **Figma 비교 추가**에서 JSON을 붙여넣고 디자인 적용을 누르거나, 하단 Figma 비교 영역에서 파일을 가져옵니다. 현재 Web 선택은 유지됩니다.
3. 여러 노드가 든 JSON이면 비교할 노드를 직접 선택합니다. **차이만 / 전체 비교값**으로 결과를 보고, 추가 정보에서 미지원·미확인·사용자 제외 이유를 확인합니다.

JSON 초안은 적용 전까지 기존 비교를 바꾸지 않습니다. 잘못된 JSON도 기존 디자인을 유지합니다. 가져온 디자인은 브라우저 로컬 저장소에 보관되며 **지우기**로 삭제합니다. DOM 스냅샷은 메모리에서만 유지합니다. Figma의 노드 선택 변경은 자동 추출하며 같은 노드의 속성을 수정했다면 플러그인의 다시 추출을 사용합니다.

앱 버전 **0.3.23**, 교환 JSON `schemaVersion: "1.0"`, Figma Plugin API `1.0.0`은 서로 다른 버전입니다. 스키마는 `schemas/figcheck-1.0.schema.json`, 예제는 `fixtures/sample.json`, `fixtures/sample-nested.json`에 있습니다.

## 지원 속성과 비교 기준

- 크기, Padding 4방향, row/column gap
- font family·size·weight·line-height·letter-spacing
- 글자·배경 색상, Border 4면 두께·색상, Radius 4모서리, 자체 opacity
- 근거를 확인할 수 있는 일반 외부/내부 박스 그림자: 여러 겹·추가·누락 구분

그림자는 Figma NORMAL 효과와 Inspect CSS 근거가 확인되는 범위에서 비교합니다. CSS 추출 실패·복합 합성·미수집을 `none`이나 0으로 추정하지 않으며, 원본과 제외 이유를 표시합니다. [속성 조건](docs/지원-속성.md) · [그림자 지원 범위](docs/0.3.9-box-shadows.md) · [그림자 근거 보존](docs/0.3.10-shadow-visibility.md)

차이는 **웹 − Figma**, 점수는 양쪽 모두 지원되는 포함 속성의 일치 비율입니다. `unknown`·`unsupported`·사용자 제외는 분모에서 빠지며 비교 가능 값이 없으면 점수를 표시하지 않습니다. 톱니바퀴에서 비교 항목과 색상 표기(HEX/RGB/HSL)를 조정합니다. 색상 표기 변경은 원본이나 계산 결과를 바꾸지 않습니다.

기본 허용 오차는 크기·간격·테두리·반경 ±1px, 글꼴 수치 ±0.5px, sRGB 채널 ±1, alpha·opacity ±0.01입니다. fontWeight와 정규화한 fontFamily는 같아야 합니다. 작은 부동소수점 표현 오차는 별도로 보정합니다.

## 제한

- 수동으로 고른 단일 HTML 요소를 대상으로 합니다. iframe 내부·SVG·열린 Shadow DOM 내부의 페이지 선택/측정은 제한됩니다. 닫힌 Shadow DOM 내부에는 접근하지 않습니다.
- transform/zoom·분절된 inline·복합 paint·gradient·P3·미해결 normal/auto/%/calc 등은 속성별로 미지원 또는 미확인 처리합니다. N/A는 0이 아닙니다.
- 거리 측정은 같은 문서의 렌더 경계 기준이며 핀치 확대·루트 변환 등의 제한이 있습니다. 회전한 요소도 축 정렬 경계입니다.
- CSS 규칙은 원인 **후보**입니다. cascade 승자·소스 줄·source map·Tailwind 원인을 확정하지 않습니다. 값이 같고 규칙 출처만 바뀌면 다시 선택하기 전까지 후보가 갱신되지 않을 수 있습니다.
- 상태 간 자동 비교, 디자인 자동 매칭, 전체 페이지 분석, AI 수정 제안은 구현하지 않았습니다.
- 실제 Figma 앱 호스트와 물리적 Windows Alt/브라우저 메뉴 동작은 자동 검증하지 못했습니다. 브라우저 키 입력과 합성 포커스 경합 검증을 이와 구분합니다.

## 개발·검증

Node.js 22 이상, npm, 패키징용 Python 3을 사용합니다.

```sh
npm ci
npx playwright install chromium
npm run verify          # 타입 검사 → 린트 → 빌드 → 핵심 테스트
npm run test:picker     # 실제 확장: 선택·뎁스·Alt·스크롤·오버레이
npm run test:browser    # 실제 DevTools + Figma 모의 호스트/UI
npm run fixture         # http://127.0.0.1:4173
npm run package         # release/에 로컬 ZIP과 SHA-256 생성
```

브라우저 테스트는 fixture 서버를 직접 실행하므로 별도의 `npm run fixture`와 **동시에 실행하지 마세요**. 격리된 임시 브라우저 프로필을 사용합니다. 설치된 Chromium 계열 브라우저를 지정하려면 `FIGCHECK_BROWSER_PATH` 환경변수에 실행 파일 경로를 설정합니다. Windows npm 실행 경로 문제가 있으면 `scripts/figcheck.ps1`의 install/verify/fixture/browser/package 명령도 사용할 수 있습니다.

실행용 dist는 추적합니다. `node_modules/`, `artifacts/`, `release/`, 로그·환경 파일은 커밋하지 않습니다. 검증 결과와 캡처는 로컬 `artifacts/`에 생성됩니다. [검증 범위](docs/검증.md)
