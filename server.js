const express = require("express");
const dotenv = require("dotenv");
const { getPosts, getPostContent } = require("./notion");
const path = require("path");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

// 정적 파일 서빙 (예: CSS, JS 등)
app.use(express.static(path.join(__dirname, "public")));

/**
 * 전체 글 목록 API
 * 기존 /posts 대신 /api/posts 사용 (클라이언트와 URL 충돌 방지)
 */
app.get("/api/posts", async (req, res) => {
  const posts = await getPosts();
  res.json(posts);
});

/**
 * 특정 글 본문 API
 * 기존 /post/:id 대신 /api/post/:id 사용
 */
app.get("/api/post/:id", async (req, res) => {
  const postId = req.params.id;
  const content = await getPostContent(postId);
  // 내용이 없거나 오류 메시지가 포함되면 404 응답
  if (!content || content.includes("오류로 인해")) {
    return res.status(404).json({ error: "Not Found" });
  }
  res.json({ content });
});

/**
 * 페이지 라우팅
 * - 홈 ("/") 및 "/{page.id}" 형태의 URL 모두 index.html 반환
 *   -> 클라이언트에서 현재 URL에 따라 API를 호출해 내용을 로드합니다.
 */
app.get(["/", "/:id"], (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

/**
 * 잘못된 요청은 홈으로 리다이렉트
 */
app.use((req, res) => {
  res.redirect("/");
});

/*
 * ─────────────────────────────────────────────────────────
 *  require.main === module  체크
 * ─────────────────────────────────────────────────────────
 */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Local server is running at http://localhost:${PORT}`);
  });
}

module.exports = app;
