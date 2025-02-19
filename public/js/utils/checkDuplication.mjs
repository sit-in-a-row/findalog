export function createElement(tag, className, id) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }
    
    if (id) {
        element.id = id;
    }

    return element;
}

export function checkDuplication(id) {
    const element = document.getElementById(id);
    if (element && element.parentNode) {
        element.parentNode.removeChild(element);
    }
}