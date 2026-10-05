# FigCheck 0.3.7

Figma에서 선택한 노드 하나와 Chrome에서 선택한 DOM 하나를 로컬에서 비교합니다. 서버·DB·로그인 없이 JSON을 복사/붙여넣기하거나 파일로 교환합니다. 자동 매칭, AI, 전체 페이지 분석, Tailwind 수정 제안은 제공하지 않습니다.

사용할 때는 Node.js나 빌드가 필요 없습니다. [한국어 설치·사용 안내](docs/설치-사용.md)를 따라 Figma 개발 플러그인과 Chrome unpacked 확장을 로드하세요.

1. Figma에서 노드 하나 선택 → FigCheck → **JSON 복사**.
2. Chrome DevTools → FigCheck → JSON 붙여넣기 → 디자인 적용.
3. **요소 선택**으로 페이지의 DOM 하나를 클릭하거나 Elements의 `$0`를 사용합니다.
4. 차이와 이유를 확인합니다. unknown/unsupported는 점수에서 제외됩니다.

| 결과물 | 경로 |
|---|---|
| Figma 설치 manifest | `apps/figma-plugin/dist/manifest.json` |
| Chrome 확장 폴더 | `apps/chrome-extension/dist` |
| 단일·nested JSON | `fixtures/sample.json`, `fixtures/sample-nested.json` |
| 로컬 비교 페이지 | `fixtures/fixture.html` |
| 버전 있는 교환 스키마 | `schemas/figcheck-1.0.schema.json` |

앱 버전은 **0.3.7**이며, 교환 JSON schemaVersion **1.0**과 Figma Plugin API **1.0.0**은 별도 버전입니다. 바깥쪽 Figma manifest도 dist를 가리키므로 유효합니다. 설치에는 위의 dist manifest를 권장합니다.

width/height, padding 4방향, row/column gap, font family/size/weight/line-height/letter-spacing, text/background color, border widths/colors/radii, opacity를 비교합니다. 차이는 **actual − expected**, 점수는 양쪽 모두 supported인 속성의 일치 비율입니다. 비교 가능 속성이 없으면 점수를 표시하지 않습니다.

톱니바퀴 설정에서 비교 항목을 체크박스로 고릅니다. 그룹 전체와 개별 속성을 선택하고, 사용자 제외와 미지원을 따로 표시합니다. 모두 해제하면 일치율을 표시하지 않습니다. 모드 드롭다운은 없습니다. 기본 비교 기준은 크기·spacing·radius·border width ±1px, typography ±0.5px, sRGB 채널 ±1, alpha·opacity ±0.01입니다. fontWeight와 정규화한 fontFamily는 같아야 합니다. 이 기준과 별도로 아주 작은 표현 오차만 자동 처리합니다. [0.2.1 정확도·UX 변경](docs/0.2.1-정확도-UX.md)을 참고하세요.

CSSOM 규칙은 원인 **후보**입니다. cascade 승자·소스 줄 번호·source map·authoring Tailwind를 추정하지 않습니다. [비교·한계](docs/비교-한계.md), [요소 선택·단축키](docs/요소선택-시각비교.md), [검증 범위](docs/검증.md)를 참고하세요.

## 개발과 검증

Node.js 22 이상에서 실행합니다. TypeScript 모노레포의 앱 두 개와 독립 공통 스키마·비교 엔진 `packages/core`, 공통 CSS `packages/ui`로 구성합니다.

```powershell
npm ci
npm run verify
npm run fixture
npx playwright install chromium
npm run test:browser
npm run package
```

이 Windows의 npm 실행기가 잘못된 경로를 가리키면 `powershell -ExecutionPolicy Bypass -File scripts\figcheck.ps1 install`을 사용하세요. 같은 스크립트의 `verify`, `fixture`, `browser`, `package`도 지원합니다. ExecutionPolicy 옵션은 해당 실행에만 적용됩니다. fixture 주소는 http://127.0.0.1:4173 이며 Ctrl+C로 종료합니다. 브라우저 테스트는 격리된 임시 프로필을 사용합니다.

공식 API: [Figma manifest](https://developers.figma.com/docs/plugins/manifest/), [Figma selectionchange](https://developers.figma.com/docs/plugins/api/properties/figma-on/), [Chrome DevTools](https://developer.chrome.com/docs/extensions/how-to/devtools/extend-devtools), [inspectedWindow.eval](https://developer.chrome.com/docs/extensions/reference/api/devtools/inspectedWindow), [panels](https://developer.chrome.com/docs/extensions/reference/api/devtools/panels), [commands](https://developer.chrome.com/docs/extensions/reference/api/commands).

두 앱의 **?**에서 도움말을 확인합니다. [도움말·UX 근거](docs/0.2.2-도움말-UX.md) · [현재 28개 속성의 정확한 조건](docs/지원-속성.md).

Figma의 기본 결과는 속성 표입니다. JSON 원문은 **JSON 보기**에서, 복사·파일 저장은 표 화면에서 바로 사용합니다. DevTools는 **차이만 / 전체 비교값**으로 전환합니다. [0.2.3 변경·진단](docs/0.2.3-속성표-이동진단.md).

0.2.4는 한국 서비스의 공식 문서와 공개 화면을 참고하여 무채색 표, 한국어 시스템 글꼴과 정렬을 정리했습니다. [화면 검토와 출처](docs/0.2.4-화면-검토.md)에 적용 지점과 검증 범위를 설명합니다.

0.2.5는 두 속성 표에 동일한 방향 아이콘을 추가했습니다. [속성 아이콘 안내](docs/0.2.5-속성-아이콘.md)에 의미와 검증 범위를 설명합니다.

0.2.6에서는 연두 계열의 주요 동작과 단계별 상태 문구를 적용했습니다. [연두 테마와 상태 안내](docs/0.2.6-연두-테마-상태.md)를 참고하세요.

0.2.7은 아이보리 테마와 분류 아이콘, 선택 변경에도 유지되는 Figma 접힘 헤더를 적용했습니다. [아이보리와 분류 안내](docs/0.2.7-아이보리-분류.md)를 참고하세요.

0.2.8에서는 아이보리를 주요 동작 색으로 사용하고 **라이트 / 다크** 버튼으로 배경 테마를 고릅니다. 앱별 로컬 저장값이 우선이며, 없으면 처음 열 때 호스트 테마를 사용합니다. [테마 선택과 저장 안내](docs/0.2.8-테마-선택.md)를 참고하세요.

0.2.9는 오프라인 Pretendard 글꼴, 추출·비교 가능한 값 중심의 기본 표와 평평한 **자세히 보기**, **HEX / RGB / HSL** 로컬 표시 설정을 제공합니다. 원본 RGBA·JSON·비교 기준은 그대로 유지합니다. [글꼴·기본값·색상 안내](docs/0.2.9-글꼴-기본값-색상.md)를 참고하세요.


0.2.11은 **차가운 무채색 테마**입니다. 라이트는 charcoal 버튼과 흰 글자, 다크는 offwhite 버튼과 검정 글자로 주요 동작을 강조합니다. 실제 비교 색상 견본과 로컬 저장 설정은 유지합니다. [테마 상태별 안내](docs/0.2.11-무채색-테마.md)를 참고하세요.

0.3.7는 헤더의 **해/달 아이콘**으로 테마를 바꾸고 **톱니바퀴 설정**에서 색상 표기 및 DevTools의 비교 속성 포함을 조정합니다. 메인 입력과 결과는 유지합니다. [아이콘·설정 안내](docs/0.2.12-아이콘-설정.md)를 참고하세요.


0.3.7에서는 **구조·색상·폰트 정보**를 펼쳐 기본 Web 보기와 Figma 함께 보기를 전환합니다. 좁은 패널은 위아래 배치이며, 항목을 누르면 표나 제외 이유로 이동합니다. 폰트는 메타데이터만 표시합니다. [시각 비교 사용법과 정확한 범위](docs/0.3.7-시각-비교.md)를 확인하세요.

