(function () {
  const IMAGE_BUTTON_TEXT = 'Выберите другое изображение';
  const IMAGE_BUTTON_REPLACEMENT = 'Добавить изображение';

  const normalizePastedText = (value) => value
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  const replaceImageButtonLabels = (root) => {
    const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];

    while (walker.nextNode()) {
      if (walker.currentNode.nodeValue.includes(IMAGE_BUTTON_TEXT)) {
        nodes.push(walker.currentNode);
      }
    }

    nodes.forEach((node) => {
      node.nodeValue = node.nodeValue.replaceAll(IMAGE_BUTTON_TEXT, IMAGE_BUTTON_REPLACEMENT);
    });
  };

  const pastePlainText = (event) => {
    const target = event.target;
    const editor = target.closest && target.closest('textarea, input[type="text"], [contenteditable="true"]');
    if (!editor) return;

    const text = event.clipboardData && event.clipboardData.getData('text/plain');
    if (!text) return;

    event.preventDefault();
    const normalized = normalizePastedText(text);

    if (editor.matches('textarea, input[type="text"]')) {
      const start = editor.selectionStart || 0;
      const end = editor.selectionEnd || start;
      const before = editor.value.slice(0, start);
      const after = editor.value.slice(end);
      editor.value = `${before}${normalized}${after}`;
      const nextPosition = start + normalized.length;
      editor.setSelectionRange(nextPosition, nextPosition);
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    document.execCommand('insertText', false, normalized);
  };

  document.addEventListener('paste', pastePlainText, true);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
          replaceImageButtonLabels(node.nodeType === Node.ELEMENT_NODE ? node : node.parentNode);
        }
      });
    });
  });

  const start = () => {
    replaceImageButtonLabels(document.body);
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
