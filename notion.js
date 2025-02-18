/***************************************************
 * notion.js
 * -----------------------------------------------
 * - 노션 DB에서 글 목록을 가져오는 함수(getPosts)
 * - 특정 페이지의 모든 블록을 재귀적으로 탐색하여
 *   HTML 문자열로 변환(getPostContent)
 ***************************************************/
const { Client } = require("@notionhq/client");
require("dotenv").config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;

/**
 * 1) Notion에서 모든 children 블록을 가져오는 함수 (페이지네이션)
 */
async function getAllBlocks(blockId) {
  let allBlocks = [];
  let hasMore = true;
  let startCursor = undefined;

  while (hasMore) {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      start_cursor: startCursor,
    });

    allBlocks = allBlocks.concat(response.results);

    hasMore = response.has_more;
    startCursor = response.next_cursor;
  }

  return allBlocks;
}

/**
 * 2) rich_text 배열 → HTML 변환 (일반 텍스트 + 인라인 수식)
 */
/**
 * rich_text 배열 → HTML 변환
 *   - 일반 텍스트
 *   - 인라인 수식
 *   - bold, italic, underline, strikethrough, code, color 등 annotation 처리
 */
function parseRichText(richTexts = []) {
  return richTexts
    .map((rt) => {
      // 1) 인라인 수식 (equation) 처리
      if (rt.type === "equation") {
        // 인라인 수식: \( ... \)
        return `\\(${rt.equation.expression}\\)`;
      }

      // 2) 일반 텍스트
      if (rt.type === "text") {
        let text = rt.text.content ?? "";
        const { bold, italic, underline, strikethrough, code, color } = rt.annotations;

        // (1) 기본 텍스트 꾸밈
        if (bold) {
          text = `<strong>${text}</strong>`;
        }
        if (italic) {
          text = `<em>${text}</em>`;
        }
        if (underline) {
          text = `<u>${text}</u>`;
        }
        if (strikethrough) {
          text = `<s>${text}</s>`;
        }
        if (code) {
          text = `<code>${text}</code>`;
        }

        // (2) 색상 처리
        // Notion에는 'red', 'blue', 'green', ... 또는 'red_background' 같은 배경색도 있음
        if (color && color !== "default") {
          // 배경색
          if (color.endsWith("_background")) {
            // 예: 'red_background' -> 'red'
            const pureColor = color.replace("_background", "");
            text = `<span style="background-color:${pureColor};">${text}</span>`;
          }
          // 텍스트 색상
          else {
            text = `<span style="color:${color};">${text}</span>`;
          }
        }

        return text;
      }

      // 3) mention 등 다른 타입은 간단히 무시(혹은 원하는 대로 처리)
      return "";
    })
    .join("");
}

/**
 * 3) 블록 배열을 순회하여 HTML로 변환하는 함수 (재귀)
 */
async function blocksToHtml(blocks) {
  let html = "";

  for (const block of blocks) {
    const { id, type, has_children } = block;
    const blockData = block[type];

    switch (type) {
      case "paragraph": {
        const text = parseRichText(blockData.rich_text);
        html += `<p>${text}</p>`;
        break;
      }
      case "heading_1": {
        const text = parseRichText(blockData.rich_text);
        html += `<h1>${text}</h1>`;
        break;
      }
      case "heading_2": {
        const text = parseRichText(blockData.rich_text);
        html += `<h2>${text}</h2>`;
        break;
      }
      case "heading_3": {
        const text = parseRichText(blockData.rich_text);
        html += `<h3>${text}</h3>`;
        break;
      }
      case "bulleted_list_item": {
        const text = parseRichText(blockData.rich_text);
        html += `<ul><li>${text}</li></ul>`;
        break;
      }
      case "numbered_list_item": {
        const text = parseRichText(blockData.rich_text);
        html += `<ol><li>${text}</li></ol>`;
        break;
      }
      case "to_do": {
        const text = parseRichText(blockData.rich_text);
        html += `<div class="todo-item">
            <input type="checkbox" ${blockData.checked ? "checked" : ""}/>
            <span>${text}</span>
          </div>`;
        break;
      }
      case "toggle": {
        // 토글 블록
        const toggleSummary = parseRichText(blockData.rich_text);
        let toggleChildren = "";
        if (has_children) {
          // 하위 블록 재귀
          const childBlocks = await getAllBlocks(id);
          toggleChildren = await blocksToHtml(childBlocks);
        }
        html += `
          <details class="toggle-block">
            <summary>${toggleSummary}</summary>
            ${toggleChildren}
          </details>
        `;
        break;
      }
      case "quote": {
        const text = parseRichText(blockData.rich_text);
        html += `<blockquote>${text}</blockquote>`;
        break;
      }
      case "code": {
        const codeText = parseRichText(blockData.rich_text);
        html += `<pre><code class="language-${blockData.language || "plain"}">
${codeText}
          </code></pre>`;
        break;
      }
      case "equation": {
        // 블록 수식 (display math)
        html += `<p class="math-block">\\[${blockData.expression}\\]</p>`;
        break;
      }
      case "divider": {
        html += `<hr/>`;
        break;
      }
      case "image": {
        const imageUrl = blockData.file?.url || blockData.external?.url || "";
        html += `<img src="${imageUrl}" alt="Notion Image" class="notion-image"/>`;
        break;
      }
      case "column_list": {
        let columnListContent = "";
        if (has_children) {
          const childBlocks = await getAllBlocks(id);
          columnListContent = await blocksToHtml(childBlocks);
        }
        html += `<div class="column-list">${columnListContent}</div>`;
        break;
      }
      case "column": {
        let columnContent = "";
        if (has_children) {
          const childBlocks = await getAllBlocks(id);
          columnContent = await blocksToHtml(childBlocks);
        }
        html += `<div class="column">${columnContent}</div>`;
        break;
      }
      default: {
        html += `<div class="unsupported">[${type}] 블록은 아직 지원되지 않습니다.</div>`;
        break;
      }
    }
  }

  return html;
}

/**
 * 4) 특정 페이지(= 블록) 전체 HTML 콘텐츠를 가져오는 함수
 */
async function getPostContent(pageId) {
  try {
    // 1. 페이지네이션으로 모든 블록 가져오기
    const blocks = await getAllBlocks(pageId);
    // 2. 블록 배열을 HTML로 변환
    const html = await blocksToHtml(blocks);
    return html;
  } catch (error) {
    console.error("🚨 Error fetching page content:", error);
    return `<p class="error">오류로 인해 블록을 불러오지 못했습니다.</p>`;
  }
}

/**
 * 5) 노션 DB(글 목록) 조회
 */
async function getPosts() {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
    });
    return response.results.map((page) => ({
      id: page.id,
      title:
        page.properties?.이름?.title?.[0]?.plain_text || "제목 없음",
      date:
        page.properties?.날짜?.date?.start || "날짜 없음",
      tags:
        page.properties?.["다중 선택"]?.multi_select?.map((tag) => tag.name) ||
        [],
    }));
  } catch (error) {
    console.error("🚨 Error fetching posts from Notion:", error);
    return [];
  }
}

module.exports = {
  getPosts,
  getPostContent,
};
