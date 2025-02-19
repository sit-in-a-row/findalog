import { createElement } from "../utils/createElement.mjs"
import { checkDuplication } from "../utils/checkDuplication.mjs"

export function createLandingTitle() {
    checkDuplication('landing');

    const title = createElement('div', 'landingTitleContainer', 'landingTitleContainer');
    const landingTitle = createElement('div', 'landingTitle', 'landingTitle')

    title.appendChild(landingTitle);

    return title
}

export function initTypeIt() {
    (new TypeIt("#landingTitle", {
        speed: 50,
        startDelay: 1500,
        afterComplete: function (instance) {
            // instance.destroy();
        }
    })
        .type("Sit_in_a_row's", { delay: 100 })
        .move(null, {to: "START", instant: false})
        .move(1, { delay: 100})
        .delete(1)
        .type("S")
        .move(null, {to: "END", instant: true, delay: 300})
        .type("<span class='landing-title-row2'> <br> Daily Log</span>", {delay: 1000, speed: 100})
        .go()
    );
}

export function hideTypeIt() {
    const typeIt = document.getElementById('landingTitleContainer');
    if (typeIt.classList.contains('title-hidden')) {
        typeIt.classList.remove('title-hidden');
    } else {
        typeIt.classList.add('title-hidden');
    }
}

export function hideModelViewer() {
    const modelViewer = document.getElementById('macbook')
        if (modelViewer.classList.contains('modelViewer-hidden')) {
        modelViewer.classList.remove('modelViewer-hidden');
    } else {
        modelViewer.classList.add('modelViewer-hidden');
    }
}