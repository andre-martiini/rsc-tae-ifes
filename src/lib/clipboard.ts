function copyTextWithHiddenTextarea(text: string) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  try {
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
}

export async function copyTextToClipboard(text: string) {
  if (!text) return false;

  const clipboard = navigator.clipboard;

  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to ClipboardItem and legacy copy.
    }
  }

  if (clipboard?.write && typeof ClipboardItem !== 'undefined') {
    try {
      const blob = new Blob([text], { type: 'text/plain' });
      await clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
      return true;
    } catch {
      // Fall through to legacy copy.
    }
  }

  try {
    return copyTextWithHiddenTextarea(text);
  } catch {
    return false;
  }
}
