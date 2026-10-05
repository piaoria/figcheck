# Figma 연결·오류 — 0.2.3

플러그인이 계속 추출 중이거나 예전 화면이면 닫고 `apps/figma-plugin/dist/manifest.json`을 다시 가져와 실행하세요. 외부 manifest도 유효하지만 같은 플러그인을 중복 등록할 필요는 없습니다. UI 상단 버전과 접힌 연결 상태의 UI/host 빌드는 0.2.3이어야 합니다. manifest의 API 1.0.0은 앱 버전과 별개입니다.

정확히 노드 하나를 선택합니다. 선택 없음/다중 선택은 안내를 표시합니다. 속성만 바꾸면 새로 추출을 누르세요. 응답 대기에는 한 번의 제한 시간이 있으며, 응답이 없으면 재시도 안내를 표시합니다. 이전 요청 ID나 이미 만료된 응답은 새 결과를 되살리지 않습니다. API 예외는 연결·오류 상세에 표시됩니다.

UI는 Figma 부모와의 handshake 후 요청 ID를 붙여 추출하고 host는 UI ready 전 selectionchange를 보관합니다. iframe 메시지의 event.source가 null인 중계도 허용하되 parent/source와 메시지 형태·ID를 검증합니다. 이 구조는 빌드된 host mock과 실제 Chromium UI 중계 시험으로 검증했습니다. 실제 Figma 호스트 실행 시험은 아직 하지 못했으므로 Figma 내부 환경의 모든 연결 문제를 해결했다고 단정하지 않습니다.

문제가 남으면 연결 상세의 UI/host 빌드와 오류 내용을 확인하세요. 디자인이나 DOM을 외부에 자동 전송하지 않습니다.
