import { createLandingTitle, hideModelViewer, hideTypeIt, initTypeIt } from "/js/components/landing_title.mjs"
import { createElement } from "/js/utils/createElement.mjs";

let tag_list = {};

function main() {
    document.body.appendChild(createLandingTitle());
    initTypeIt();
    loadPosts();
}

const progressBar = document.querySelector(".progress-bar");

function resetProgressBar() {
    progressBar.style.width = "0%";
    progressBar.style.opacity = "0";
}

// 클릭 직후에 프로그레스바가 0%에서 100%로 차오르는 함수
function startFakeProgress() {
    resetProgressBar();
    // 먼저 보이도록
    progressBar.style.opacity = "1";
    progressBar.style.width = "0%";

    // 강제 리플로우
    progressBar.getBoundingClientRect();

    // 0% -> 100% (2초 동안)
    progressBar.style.transition = "width 2s linear, opacity 0.5s ease-out";
    setTimeout(() => {
        progressBar.style.width = "100%";
    }, 0);
}

function endFakeProgress() {
    // 요청이 끝난 뒤 약간의 텀을 두고 서서히 사라지게
    setTimeout(() => {
        progressBar.style.opacity = "0";
        setTimeout(() => {
            resetProgressBar();
        }, 500);
    }, 200); // 원하는 타이밍에 맞춰 조절
}

async function loadPosts() {
    const res = await fetch("/posts");
    const posts = await res.json();

    const listContainer = document.getElementById("post-list");
    listContainer.innerHTML = "";

    posts.forEach((post) => {
        const div = document.createElement("div");
        div.className = "post-item";

        const postTitle = createElement('h2', 'post-title', 'post-title');
        postTitle.innerText = post.title;
        div.appendChild(postTitle);

        const postListInfo = createElement('div', 'post-list-info', 'post-list-info');
        const postDate = createElement('p', 'post-date', 'post-date');
        postDate.innerText = post.date;
        postListInfo.appendChild(postDate);
        div.appendChild(postListInfo);

        const postTags = createElement('div', 'post-tags', 'post-tags');
        for (let i=0; i<post.tags.length; i++) {
            const postTag = createElement('div', 'post-tag', `post-tag_${i}`);
            postTag.innerText = post.tags[i];
            
            let tag_type = post.tags[i];

            if (!tag_list[tag_type]) {
                tag_list[tag_type] = 1; 
            } else {
                tag_list[tag_type] += 1; 
            }           
            classList_for_tags(tag_type, postTag);

            postTags.appendChild(postTag);
        }
        postListInfo.appendChild(postTags);

//         div.innerHTML = `
//   <h2>${post.title}</h2>
//   <div class="post-list-info">
//     <p>${post.date}</p>
//     <p>${post.tags.join(", ")}</p>
//   </div>
// `;
        div.addEventListener('click', ()=>{
            loadPost(`${post.id}`);
            hideTypeIt();
        })
        listContainer.appendChild(div);
    });

    onclick="loadPost('${post.id}')"

    document.getElementById('blog-h1').addEventListener('click', () => {
        goBack();
    });

    addTagList();
}

async function loadPost(pageId) {

    // 1) 클릭 직후부터 바가 보이도록
    startFakeProgress();


    // 2) 한 프레임 뒤에 fetch 시작
    setTimeout(async () => {
        const res = await fetch(`/post/${pageId}`);
        const data = await res.json(); // { content: "<p>...</p>" }

        // 본문 표시
        document.getElementById("post-list").style.display = "none";
        const contentContainer = document.getElementById("post-content");
        contentContainer.style.display = "block";
        contentContainer.innerHTML = data.content;

        if (window.MathJax) {
            window.MathJax.typeset();
        }

        var toggles = document.querySelectorAll('.toggle-block');
        console.log(toggles);
        for (let i = 0; i < toggles.length; i++) {
            toggles[i].addEventListener('click', function() {
                if (this.classList.contains('clicked-toggle')) {
                    this.classList.remove('clicked-toggle');
                } else {
                    this.classList.add('clicked-toggle');
                }
            });
        }

        // 3) 로딩 끝 → progressbar 사라짐
        endFakeProgress();

        hideModelViewer();
    }, 0);
}

function goBack() {
    hideTypeIt();
    hideModelViewer();
    document.getElementById("post-list").style.display = "grid";
    document.getElementById("post-content").style.display = "none";
}

function addTagList() {
    const tagContainer = document.getElementById('tag-list');
    tagContainer.innerHTML = "";  // 기존 목록 초기화
    for (let tag in tag_list) {  // 객체 순회
        const tagDiv = createElement('div', 'tag_item', `tag_item_${tag}`);
        tagDiv.innerText = `${tag} (${tag_list[tag]})`;  // 태그와 카운트 함께 출력
        classList_for_tags(tag, tagDiv);

        tagContainer.appendChild(tagDiv);
    }
}

function classList_for_tags(switch_main, classList_added) {
    switch (switch_main) {
        case 'Financial Engineering':
            classList_added.classList.add('financial_engineering');
            break;
        case 'Math':
            classList_added.classList.add('math');
            break;
        default:
            console.log('main.js에서 태그 추가 필요');
            break;
    }
}

main();