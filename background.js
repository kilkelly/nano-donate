chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  var tab = sender.tab
  var nanoAddress = request.nanoAddress

  // Only continue if URL doesn't start with "chrome://"
  if (!tab.url.startsWith('chrome://')) {
    chrome.storage.local.get({nanoAddressCache: {}}, function ({ nanoAddressCache }) {
      // Valid Nano address found so add tab details to cache
      if (/^(xrb_|nano_)[13][13-9a-km-uw-z]{59}$/.test(nanoAddress)) {
        nanoAddressCache[tab.id] = {
          url: tab.url,
          nanoAddress
        }
        chrome.storage.local.set({ nanoAddressCache })
        chrome.browserAction.setIcon({
          path: 'images/nano-donate-active-128.png',
          tabId: tab.id
        })
      // No or invalid Nano address found so remove tab details from cache
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
