const SERVER = 'http://localhost:8765';

async function saveCurrentTab(tab) {
  if (!tab?.url) return;
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') ||
      tab.url.startsWith('about:') || tab.url.startsWith('edge://')) return;

  try {
    const res = await fetch(`${SERVER}/api/bookmark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: tab.title || tab.url,
        url: tab.url,
        tags: [],
      }),
    });

    if (res.ok) {
      // Brief ✓ badge confirmation
      chrome.action.setBadgeText({ text: '✓', tabId: tab.id });
      chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
      setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000);
    }
  } catch {
    // Server not running — silently ignore
  }
}

// Keyboard shortcut (Cmd+Shift+D by default; remappable via chrome://extensions/shortcuts)
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'save-bookmark') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  saveCurrentTab(tab);
});

// Clicking the toolbar icon also saves
chrome.action.onClicked.addListener(saveCurrentTab);
