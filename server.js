const express = require("express");
const dotenv = require("dotenv");
const { getPosts, getPostContent } = require("./notion");
const path = require("path");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, "public")));

// 전체 글 목록 API
app.get("/posts", async (req, res) => {
  const posts = await getPosts();
  res.json(posts);
});

// 특정 글 본문 API
app.get("/post/:id", async (req, res) => {
  const postId = req.params.id;
  const content = await getPostContent(postId);
  res.json({ content });
});

// 메인 페이지
app.get("*", (req, res) => {
  // 마지막 라우트
  res.sendFile(path.join(__dirname, "views", "index.html"));
});
/*
 * ─────────────────────────────────────────────────────────
 *  require.main === module  체크
 * ─────────────────────────────────────────────────────────
 * 이 파일이 "직접 실행"된 경우에만 포트를 열고,
 * import/require 된 경우(Vercel dev/배포 등)에는 listen()을 건너뜀
 */
if (require.main === module) {
  // 로컬 개발 환경에서 직접 실행: node server.js
  app.listen(PORT, () => {
    console.log(`Local server is running at http://localhost:${PORT}`);
  });
}

// Vercel 등에서 서버리스 핸들러로 사용하기 위해 내보내기
module.exports = app;
