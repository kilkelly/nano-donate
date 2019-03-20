chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.text === 'nano_address') {
    var nanoAddress
    // Search for 'nano' meta tag in document
    Array.from(document.getElementsByTagName('meta')).filter(function (metaTag) {
      if (metaTag.getAttribute('name') === 'nano') {
        nanoAddress = metaTag.getAttribute('content')
      }
    })[0]
    sendResponse(nanoAddress)
  }
})