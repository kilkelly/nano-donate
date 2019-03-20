var nanoAddressCache = new Map()

// ---------------------------------------------------

// When tab updated
chrome.tabs.onUpdated.addListener(function (tabId, _, tab) {
  chrome.tabs.sendMessage(tabId, {text: 'nano_address'}, function (nanoAddress) {
    if (/^(xrb_|nano_)[13][13-9a-km-uw-z]{59}$/.test(nanoAddress)) {
      nanoAddressCache.set(tabId, {
        url: tab.url,
        nanoAddress: nanoAddress
      })
      chrome.browserAction.setIcon({
        path: 'images/nano-donate-active-128.png',
        tabId: tabId
      })
    } else {
      nanoAddressCache.set(tabId, {
        url: tab.url,
        nanoAddress: ''
      })
      chrome.browserAction.setIcon({
        path: 'images/nano-donate-inactive-128.png',
        tabId: tabId
      })
    }
  })
})

// ---------------------------------------------------

// When tab removed (closed)
chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  nanoAddressCache.delete(tabId)
})
