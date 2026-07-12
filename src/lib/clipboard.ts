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

  // Remove caracteres de controle invisíveis (null bytes, etc.) que podem
  // truncar silenciosamente a cópia no navegador.
  const cleanText = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');

  const clipboard = navigator.clipboard;

  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(cleanText);
      return true;
    } catch {
      // Fall through to ClipboardItem and legacy copy.
    }
  }

  if (clipboard?.write && typeof ClipboardItem !== 'undefined') {
    try {
      const blob = new Blob([cleanText], { type: 'text/plain' });
      await clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
      return true;
    } catch {
      // Fall through to legacy copy.
    }
  }

  try {
    return copyTextWithHiddenTextarea(cleanText);
  } catch {
    return false;
  }
}
