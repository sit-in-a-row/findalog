import {
    createLandingTitle,
    hideModelViewer,
    hideTypeIt,
    initTypeIt
} from "/js/components/landing_title.mjs";
import {
    createElement
} from "/js/utils/createElement.mjs";

let is_init = true;
let tag_list = {};

// 간단한 페이드 아웃/인 헬퍼 함수 (Promise 기반)
function fadeOut(element, duration = 300) {
    return new Promise((resolve) => {
        element.style.transition = `opacity ${duration}ms`;
        element.style.opacity = 0;
        setTimeout(() => {
            resolve();
        }, duration);
    });
}

function fadeIn(element, duration = 300) {
    return new Promise((resolve) => {
        element.style.transition = `opacity ${duration}ms`;
        element.style.opacity = 1;
        setTimeout(() => {
            resolve();
        }, duration);
    });
}

async function main() {
    document.body.appendChild(createLandingTitle());
    initTypeIt();

    // blog-h1 클릭 시 홈(목록)으로 돌아가기
    const blogH1 = document.getElementById("blog-h1");
    if (blogH1) {
        blogH1.addEventListener("click", () => {
            goBack();
        });
    }

    // 초기 URL에 따라 로드: "/"이면 목록, "/{postId}"이면 해당 게시글 로드
    if (window.location.pathname === "/" || window.location.pathname === "") {
        await loadPosts();
    } else {
        const postId = window.location.pathname.slice(1); // '/' 제거
        history.replaceState({
            postId
        }, "", window.location.pathname);
        await loadPost(postId);
    }
}

const progressBar = document.querySelector(".progress-bar");

function resetProgressBar() {
    progressBar.style.width = "0%";
    progressBar.style.opacity = "0";
}

// 클릭 직후 0%에서 100%까지 채워지는 프로그레스바 효과
function startFakeProgress() {
    resetProgressBar();
    progressBar.style.opacity = "1";
    progressBar.style.width = "0%";
    // 강제 리플로우
    progressBar.getBoundingClientRect();
    progressBar.style.transition = "width 2s linear, opacity 0.5s ease-out";
    setTimeout(() => {
        progressBar.style.width = "100%";
    }, 0);
}

function endFakeProgress() {
    setTimeout(() => {
        progressBar.style.opacity = "0";
        setTimeout(() => {
            resetProgressBar();
        }, 500);
    }, 200);
}

async function loadPosts() {
    try {
        // API 엔드포인트를 /api/posts 로 호출
        const res = await fetch("/api/posts");
        const posts = await res.json();

        const listContainer = document.getElementById("post-list");
        listContainer.innerHTML = "";
        listContainer.style.display = "grid";
        // 초기 상태: 투명하게 시작
        listContainer.style.opacity = 0;

        posts.forEach((post) => {
            const div = document.createElement("div");
            div.className = "post-item";

            const postTitle = createElement("h2", "post-title", "post-title");
            postTitle.innerText = post.title;
            div.appendChild(postTitle);

            const postListInfo = createElement("div", "post-list-info", "post-list-info");
            const postDate = createElement("p", "post-date", "post-date");
            postDate.innerText = post.date;
            postListInfo.appendChild(postDate);
            div.appendChild(postListInfo);

            const postTags = createElement("div", "post-tags", "post-tags");
            post.tags.forEach((tag, index) => {
                const postTag = createElement("div", "post-tag", `post-tag_${index}`);
                postTag.innerText = tag;

                if (is_init) {
                    if (!tag_list[tag]) {
                        tag_list[tag] = 1;
                    } 
                    else {
                        tag_list[tag] += 1;
                    }
                }

                classList_for_tags(tag, postTag);
                postTags.appendChild(postTag);
            });
            postListInfo.appendChild(postTags);

            // 클릭 시 History API를 이용해 URL 변경 및 게시글 로드
            div.addEventListener("click", () => {
                history.pushState({
                    postId: post.id
                }, "", "/" + post.id);
                loadPost(post.id);
            });
            listContainer.appendChild(div);
        });
        is_init = false;

        await fadeIn(listContainer, 300);
        addTagList();
    } catch (error) {
        console.error("Error loading posts:", error);
    }
}

async function loadPost(pageId) {
    startFakeProgress();
    try {
        // API 엔드포인트 호출: /api/post/{id}
        const res = await fetch(`/api/post/${pageId}`);
        if (!res.ok) {
            // 잘못된 요청이면 URL을 "/"로 변경 후 목록 로드
            history.replaceState(null, "", "/");
            await loadPosts();
            return;
        }
        const data = await res.json();

        // 기존 게시글 목록이 보이고 있다면 페이드 아웃 처리
        const listContainer = document.getElementById("post-list");
        if (listContainer.style.display !== "none") {
            await fadeOut(listContainer, 300);
            listContainer.style.display = "none";
        }

        const contentContainer = document.getElementById("post-content");
        contentContainer.innerHTML = data.content;
        contentContainer.style.display = "block";
        contentContainer.style.opacity = 0;
        await fadeIn(contentContainer, 300);

        if (window.MathJax) {
            window.MathJax.typeset();
        }

        // 토글 블록 클릭 이벤트 처리
        const toggles = document.querySelectorAll(".toggle-block");
        toggles.forEach((toggle) => {
            toggle.addEventListener("click", function() {
                this.classList.toggle("clicked-toggle");
            });
        });
    } catch (err) {
        console.error("Error loading post:", err);
        history.replaceState(null, "", "/");
        await loadPosts();
    } finally {
        endFakeProgress();
    }
}

async function goBack() {
    history.pushState(null, "", "/");
    const contentContainer = document.getElementById("post-content");
    await fadeOut(contentContainer, 300);
    contentContainer.style.display = "none";

    const listContainer = document.getElementById("post-list");
    listContainer.style.display = "grid";
    listContainer.style.opacity = 0;

    // post-list 내부 요소가 없으면 loadPosts() 실행
    if (listContainer.children.length === 0) {
        await loadPosts();
    } else {
        await fadeIn(listContainer, 300);
    }
}

function addTagList() {
    const tagContainer = document.getElementById("tag-list");
    tagContainer.innerHTML = "";
    
    // "All" 태그 추가: 클릭 시 모든 게시글이 보임
    const allTagDiv = createElement("div", "tag_item", "tag_item_All");
    allTagDiv.innerText = "All";
    allTagDiv.dataset.tag = "All";
    allTagDiv.addEventListener("click", function() {
        // 다른 태그들의 active 제거 후 All 태그 active 설정
        document.querySelectorAll("#tag-list .tag_item").forEach(item => {
            item.classList.remove("active");
        });
        this.classList.add("active");
        // 모든 게시글 보이기
        document.querySelectorAll("#post-list .post-item").forEach(item => {
            item.style.display = "";
        });
    });
    tagContainer.appendChild(allTagDiv);
    
    // 기존 태그 목록 추가
    for (let tag in tag_list) {

        const tagDiv = createElement("div", "tag_item", `tag_item_${tag}`);
        tagDiv.innerText = `${tag} (${tag_list[tag]})`;
        tagDiv.dataset.tag = tag;
        classList_for_tags(tag, tagDiv);
        
        // 태그 클릭 시 필터링 이벤트 추가
        tagDiv.addEventListener("click", function() {
            const selectedTag = this.dataset.tag;
            // 다른 태그의 active 클래스 제거 후 현재 태그에 active 추가
            document.querySelectorAll("#tag-list .tag_item").forEach(item => {
                item.classList.remove("active");
            });
            this.classList.add("active");
            
            // #post-list 내부의 모든 게시글 카드 필터링
            document.querySelectorAll("#post-list .post-item").forEach(item => {
                // 카드 내부의 태그들(.post-tag) 검사
                const tags = item.querySelectorAll(".post-tag");
                let match = false;
                tags.forEach(tagEl => {
                    if (tagEl.innerText.trim() === selectedTag) {
                        match = true;
                    }
                });
                item.style.display = match ? "" : "none";
            });
        });
        tagContainer.appendChild(tagDiv);
    }
}


function classList_for_tags(tagName, element) {
    switch (tagName) {
        case "Financial Engineering":
            element.classList.add("financial_engineering");
            break;
        case "Math":
            element.classList.add("math");
            break;
        case "CFA":
            element.classList.add("cfa");
            break;
        case "MISC":
            element.classList.add("MISC");
            break;
        default:
            console.log("main.mjs에서 태그 추가 필요");
            break;
    }
}

// 브라우저의 앞으로가기/뒤로가기 이벤트 처리
window.onpopstate = function(event) {
    if (window.location.pathname === "/" || window.location.pathname === "") {
        // post-content를 숨기고, 목록을 다시 로드합니다.
        const contentContainer = document.getElementById("post-content");
        contentContainer.style.display = "none";
        loadPosts();
    } else {
        const postId = window.location.pathname.slice(1);
        loadPost(postId);
    }
};

main();