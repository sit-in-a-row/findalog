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
function parseRichText(richTexts = []) {
  return richTexts
    .map((rt) => {
      // 인라인 수식 처리
      if (rt.type === "equation") {
        return `\\(${rt.equation.expression}\\)`;
      }

      if (rt.type === "text") {
        let text = rt.text.content ?? "";
        const { bold, italic, underline, strikethrough, code, color } =
          rt.annotations;

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

        if (color && color !== "default") {
          if (color.endsWith("_background")) {
            const pureColor = color.replace("_background", "");
            text = `<span style="background-color:${pureColor};">${text}</span>`;
          } else {
            text = `<span style="color:${color};">${text}</span>`;
          }
        }
        return text;
      }
      // 그 외 타입은 필요에 따라 추가 처리 가능
      return "";
    })
    .join("");
}

/**
 * 3) 블록 배열을 순회하여 HTML로 변환하는 함수 (재귀)
 *    - 불렛/번호 리스트는 연속된 아이템을 그룹화하여 처리합니다.
 */
async function blocksToHtml(blocks) {
  let html = "";
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];
    const { id, type, has_children } = block;
    const blockData = block[type];

    // 연속된 불렛 리스트 아이템 그룹화
    if (type === "bulleted_list_item") {
      let bulletHtml = "";
      while (i < blocks.length && blocks[i].type === "bulleted_list_item") {
        const bulletBlock = blocks[i];
        const bulletText = parseRichText(
          bulletBlock[bulletBlock.type].rich_text
        );
        let bulletChildrenHtml = "";
        if (bulletBlock.has_children) {
          const childBlocks = await getAllBlocks(bulletBlock.id);
          bulletChildrenHtml = await blocksToHtml(childBlocks);
          if (bulletChildrenHtml.trim()) {
            bulletChildrenHtml = `<ul>${bulletChildrenHtml}</ul>`;
          }
        }
        bulletHtml += `<li>${bulletText}${bulletChildrenHtml}</li>`;
        i++;
      }
      html += `<ul>${bulletHtml}</ul>`;
      continue;
    }

    // 연속된 번호 리스트 아이템 그룹화
    if (type === "numbered_list_item") {
      let numberedHtml = "";
      while (i < blocks.length && blocks[i].type === "numbered_list_item") {
        const numberedBlock = blocks[i];
        const numberedText = parseRichText(
          numberedBlock[numberedBlock.type].rich_text
        );
        let numberedChildrenHtml = "";
        if (numberedBlock.has_children) {
          const childBlocks = await getAllBlocks(numberedBlock.id);
          numberedChildrenHtml = await blocksToHtml(childBlocks);
          if (numberedChildrenHtml.trim()) {
            numberedChildrenHtml = `<ol>${numberedChildrenHtml}</ol>`;
          }
        }
        numberedHtml += `<li>${numberedText}${numberedChildrenHtml}</li>`;
        i++;
      }
      html += `<ol>${numberedHtml}</ol>`;
      continue;
    }

    // 그 외 블록들 처리
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
      case "to_do": {
        const text = parseRichText(blockData.rich_text);
        html += `<div class="todo-item">
            <input type="checkbox" ${
              blockData.checked ? "checked" : ""
            }/>
            <span>${text}</span>
          </div>`;
        break;
      }
      case "toggle": {
        const toggleSummary = parseRichText(blockData.rich_text);
        let toggleChildren = "";
        if (has_children) {
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
        html += `<pre><code class="language-${
          blockData.language || "plain"
        }">
${codeText}
          </code></pre>`;
        break;
      }
      case "equation": {
        html += `<p class="math-block">\\[${blockData.expression}\\]</p>`;
        break;
      }
      case "divider": {
        html += `<hr/>`;
        break;
      }
      case "image": {
        const imageUrl =
          blockData.file?.url || blockData.external?.url || "";
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
      case "table": {
        // 테이블 블록 처리
        let tableHtml = `<table>`;
        if (has_children) {
          const tableRows = await getAllBlocks(id);
          for (const row of tableRows) {
            if (row.type === "table_row") {
              let rowHtml = `<tr>`;
              // 각 셀은 rich_text 객체 배열로 구성됨
              for (const cell of row.table_row.cells) {
                const cellContent = parseRichText(cell);
                rowHtml += `<td>${cellContent}</td>`;
              }
              rowHtml += `</tr>`;
              tableHtml += rowHtml;
            }
          }
        }
        tableHtml += `</table>`;
        html += tableHtml;
        break;
      }
      default: {
        html += `<div class="unsupported">[${type}] 블록은 아직 지원되지 않습니다.</div>`;
        break;
      }
    }
    i++;
  }

  return html;
}

/**
 * 4) 특정 페이지(= 블록) 전체 HTML 콘텐츠를 가져오는 함수
 */
async function getPostContent(pageId) {
  try {
    const blocks = await getAllBlocks(pageId);
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
