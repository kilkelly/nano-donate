var nanoAddress
// Search for 'nano' meta tag in document
Array.from(document.getElementsByTagName('meta')).filter(function (metaTag) {
  if (metaTag.getAttribute('name') === 'nano') {
    nanoAddress = metaTag.getAttribute('content')
  }
})[0]

chrome.runtime.sendMessage({ nanoAddress })
