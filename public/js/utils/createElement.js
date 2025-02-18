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