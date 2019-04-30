chrome.runtime.onMessage.addListener(function ({ nanoDonateEntries }, { tab }, sendResponse) {
  // Only continue if URL doesn't start with "chrome://"
  if (!tab.url.startsWith('chrome://')) {
    chrome.storage.local.get({nanoAddressCache: {}}, function ({ nanoAddressCache }) {
      // Valid Nano address/es found so add tab details to cache
      if (nanoDonateEntries.length) {
        nanoAddressCache[tab.id] = {
          url: tab.url,
          nanoDonateEntries
        }
        chrome.storage.local.set({ nanoAddressCache })
        chrome.browserAction.setIcon({
          path: 'images/nano-donate-active-128.png',
          tabId: tab.id
        })
      // No Nano addresses found so remove tab details from cache
      } else {
        delete nanoAddressCache[tab.id]
        chrome.storage.local.set({ nanoAddressCache })
        chrome.browserAction.setIcon({
          path: 'images/nano-donate-inactive-128.png',
          tabId: tab.id
        })
      }
    })
  }
})

// ---------------------------------------------------

// When tab removed (closed)
chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  chrome.storage.local.get({nanoAddressCache: {}}, function ({ nanoAddressCache }) {
    delete nanoAddressCache[tabId]
    chrome.storage.local.set({nanoAddressCache: nanoAddressCache})
  })
})
