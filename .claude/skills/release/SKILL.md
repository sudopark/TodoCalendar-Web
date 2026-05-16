---
name: release
description: production 배포 릴리즈를 진행한다. 최신 develop → 버전 입력 → develop 커밋/푸시 → master PR → skill 이 직접 npm test + E2E 통과 확인 → merge commit → master 머지커밋에 태그 push → tag push 가 prod CD 트리거. 사용자 발화 "릴리즈해", "/release", "release v1.2.3" 등으로 시작.
---

# Release

production 배포 릴리즈 워크플로. develop 의 변경을 master 로 올리고 **tag push** 로 prod CD 를 트리거한다.

**Core principle:** 이 흐름은 사용자가 정의한 규약이다. 단계 순서, 머지 옵션(merge commit), tag 위치(머지커밋) 는 변경 금지.

## Flow

| 단계 | 액션 | 비고 |
|---|---|---|
| 1 | 최신 develop 동기화 | branch 확인, dirty tree abort, fetch + pull |
| 2 | 버전 입력 받기 | `vX.Y.Z` semver, `v` 접두 자동 |
| 3 | `package.json` version 업데이트 → develop commit + push | 메시지: `chore(release): vX.Y.Z` |
| 4 | master 로 PR 생성 | base=master, head=develop, 직전 태그 이후 changelog 자동 첨부 |
| 5 | **로컬에서 전체 테스트 + E2E 직접 실행** | 이 repo PR 은 CI 미설정 — skill 이 직접 `npm test` + `npm run test:e2e` 돌려서 통과 확인. 실패 시 abort + 사용자 보고 |
| 6 | **merge commit 모드** 로 머지 | `gh pr merge --merge` (rebase 아님 — 글로벌 규약 예외) |
| 7 | master 머지커밋에 태그 push | tag = 입력값 (`v` 포함). `git tag → git push origin <tag>` |
| 8 | 결과 보고 | tag URL, PR URL, deploy workflow run URL |

## Steps

### 1. 최신 develop 동기화

```bash
git rev-parse --abbrev-ref HEAD   # develop 인지 확인 — 아니면 git checkout develop
git status --porcelain            # dirty 면 abort (모르는 변경분 섞이지 않게)
git fetch origin
git pull --rebase origin develop
```

dirty working tree 면 **abort**. 모르는 변경분을 release commit 에 섞으면 안 됨.

### 2. 버전 입력 받기

사용자 발화에 버전이 같이 있으면(`release v1.2.3`) 그대로 사용, 없으면 묻기.

검증:
- 정규식 `^v?\d+\.\d+\.\d+$` 매치
- `v` 접두 없으면 자동 추가 → tag 와 commit message 는 `v` 포함
- `package.json.version` 에 들어가는 값은 `v` 제외 (npm 규약)
- 직전 태그(`git describe --tags --abbrev=0` — 없을 수도 있음) 와 비교해 **역행/중복 시 사용자 재확인**

### 3. `package.json` version 업데이트 → develop commit + push

```bash
# package.json 의 "version" 필드를 입력값(v 제외)으로 변경
npm version <X.Y.Z> --no-git-tag-version --allow-same-version
# package-lock.json 도 같이 갱신됨
git add package.json package-lock.json
git commit -m "chore(release): vX.Y.Z"
git push origin develop
```

`npm version --no-git-tag-version` 으로 tag 는 만들지 말 것. tag 는 7단계에서 master 머지커밋에 만든다.

### 4. master 로 PR 생성

```bash
PREV_TAG=$(git describe --tags --abbrev=0 2>/dev/null || true)
RANGE=${PREV_TAG:+$PREV_TAG..HEAD}
CHANGELOG=$(git log --oneline ${RANGE:-HEAD~20..HEAD})

gh pr create \
  --base master \
  --head develop \
  --title "Release vX.Y.Z" \
  --body "$(cat <<EOF
## Release vX.Y.Z

### Changes since $PREV_TAG
$CHANGELOG

### Checklist (skill 자동 검증)
- [ ] \`npm test\` (unit/component)
- [ ] \`npm run test:e2e\` (E2E)
- [ ] staging preview channel 빌드 확인 (develop push 로 자동 트리거됨)
EOF
)"
```

PR URL 사용자에게 전달.

### 5. skill 이 직접 전체 테스트 실행 — **게이트**

이 repo PR 은 CI 미설정. push 만으로 어떤 검증도 안 됨. **skill 이 직접** 로컬에서 통과 확인한다.

```bash
npm test                  # unit/component (Vitest)
npm run test:e2e          # E2E (Playwright — webServer 자동 기동)
```

판단:
- 전부 PASS → 6단계 자동 진행
- 하나라도 FAIL → **abort**. 사용자에게 실패 로그 / 영상(`test-results/*.webm`) 보고. release PR 은 열어둔 채. 사용자가 결정 (수정 후 재시도 / 릴리즈 중단).

발견된 이슈는 별도 PR/커밋으로 처리하라고 안내. 현 release PR 에 hotfix 푸시하면 release 단위가 흐려짐.

### 6. merge commit 모드로 머지 — **`--merge` 명시**

```bash
gh pr merge <PR#> --merge --delete-branch
```

⚠️ **글로벌 CLAUDE.md "rebase merge 기본" 의 예외**. release PR 만 merge commit 으로. 이유: develop 의 모든 커밋이 master 에 그대로 보존되어야 회귀 추적·릴리즈 단위 인식이 가능. rebase/squash 로 합치면 release 직전 develop 의 commit 단위가 사라짐.

### 7. master 머지커밋에 태그 push

```bash
git checkout master
git pull origin master
MERGE_SHA=$(git log -1 --format=%H)
git tag -a vX.Y.Z -m "release vX.Y.Z" "$MERGE_SHA"
git push origin vX.Y.Z
```

tag 는 **annotated** (`-a -m`) 로. lightweight 보다 메타데이터(태거, 날짜, 메시지) 가 남아 추적에 유리.

tag push 가 `firebase-deploy-production.yml` 의 트리거 — push 직후 prod CD 가 자동 시작.

### 8. 결과 보고

다음 URL 들 모아 사용자에게 전달:
- PR: `https://github.com/sudopark/TodoCalendar-Web/pull/<PR#>`
- Tag: `https://github.com/sudopark/TodoCalendar-Web/releases/tag/vX.Y.Z`
- Deploy run: `gh run list --workflow firebase-deploy-production.yml --limit 1`

## Red Flags

| 증상 / 생각 | 실제 의미 |
|---|---|
| "develop 이 아닌 다른 브랜치에서 시작" | abort. 1단계 발동 위치 잘못 |
| "dirty working tree 라 stash 하고 진행" | 모르는 변경분 같이 commit 되면 release 단위 오염. abort 가 default |
| "이전 태그보다 낮은 버전" | 사용자 확정 받기. hotfix branch 외엔 비정상 |
| "테스트 일부만 돌리고 머지" | 5단계는 `npm test` + `npm run test:e2e` **둘 다** PASS 가 게이트 |
| "테스트 FAIL 인데 머지 강행" | abort 가 default. release PR 닫지 말고 사용자 보고 |
| "rebase 가 깔끔하니까 rebase 로 머지" | release 만 merge commit 예외. 위배 |
| "tag 안 만들고 머지만 하고 끝" | CD 안 돌음. tag push 가 트리거 |
| "tag 를 develop 머리에" | 잘못. tag 는 **master 머지커밋** 에 |
| "lightweight tag 로 충분" | annotated 가 표준 — 메타데이터 보존 |
| "PR 에 hotfix 같이 푸시" | release 단위 흐려짐. 별 PR 로 |
| "CI 기다려야지" | 이 repo PR 은 CI 미설정. skill 이 로컬에서 직접 돌려야 함 |

## Invocation

- `/release`
- `릴리즈해`
- `릴리즈 v1.2.3` / `release v1.2.3` (버전 같이 주면 2단계 prompt 생략)

기본은 1~8단계 순차 자동 진행. 5단계 테스트 FAIL 시에만 중단 + 사용자 보고.
