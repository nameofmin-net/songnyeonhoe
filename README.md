# 2026 송년회 광장

픽셀 아트 메타버스 광장. 남녀 5:5 비율의 캐릭터가 저마다 다른 스타일로 광장을 돌아다니며 이모티콘, 말풍선, 이펙트로 반응합니다. 캐릭터 아래에는 3글자 이름이 표시됩니다.

- 라이브: https://nameofmin-net.github.io/songnyeonhoe/
- 인원: `?n=10`(기본) · `?n=30` · `?n=110`. 화면 아래 버튼으로도 바꿀 수 있습니다.
- 캐릭터를 클릭하면 반응하고, 「다 같이 건배」를 누르면 전원이 건배합니다.

## 구조
- `src/characters.js` — 절차적 캐릭터 생성기(헤어·상의·하의·모자·소품 조합, 고유 이름)
- `src/main.js` — 광장, 이동 AI, 대화, 이모티콘, 이펙트, 텍스트 레이어
- `pixelfx/` — [pixelfx](https://github.com/patch-gg/pixelfx) 코어와 이펙트 일부(MIT, LICENSE·NOTICE 참고)
- `node build.mjs` — esbuild로 묶어 단일 `index.html` 생성
