var version = 'v1.2.0'

var nanoCrawlerAccountURL = 'https://nanocrawler.cc/explorer/account/'
var nanoCrawlerBlockURL = 'https://nanocrawler.cc/explorer/block/'
var validNanoAmount = /^[+]?((\d+)|(\.\d{1,6})|(\d+(\.\d{1,6})))$/
// var validNanoAmount = /^[+]?((\.\d+)|(\d+(\.\d+)?))$/
var amountValid = false
const raiMultiplier = 1000000
const AVATAR_FILE_LOCATION = 'images/nano-donate-avatar.png'
const SUP_HTML = '<sup title="This text was supplied by the website owner, not Nano Donate"> *</sup>'
// var debug = true
var debug = false

var pageAddressChoiceElement = $('page-address-choice')
var pageDonationElement = $('page-donation')
var pageNoDonateElement = $('page-nodonate')
var pagePaymentChoiceElement = $('page-payment-choice')
var pageBrainblocksElement = $('page-brainblocks')
var pageQRCodeElement = $('page-qr-code')
var pageHistoryElement = $('page-history')
var pageDonationSuccessfulElement = $('page-donation-successful')
var pageDonationUnsuccessfulElement = $('page-donation-unsuccessful')
var pageFirstUseElement = $('page-first-use')
var addressElement = $('address')
var addressQRCodeElement = $('address-qr-code')
var addressQRCodePageElement = $('address-qr-code-page')
var nanoDonationFormElement = $('nano-donation-form')
var nanoDonationAmountElement = $('nano-donation-amount')
var nanoAmountErrorElement = $('nano-amount-error')
var nanoDonationSubmitElement = $('nano-donation-submit')
var footerLinkNanochartsElement = $('footer-link-nanocharts')
var footerLinkNanoDonateElement = $('footer-link-nano-donate')
var footerLinkGithubElement = $('footer-link-github')
var backLinkElement = $('back-link')
var historyLinkElement = $('history-link')
var historyLinkDonationSuccessfulElement = $('history-link-donation-successful')
var donationsHistoryElement = $('donations-history')
var donationSuccessfulDetailsElement = $('donation-successful-details')
var brainblocksButtonElement = $('brainblocks-button')
var paymentQRCodeElement = $('payment-qr-code')
var pagePaymentChoiceAmountElement = $('page-payment-choice-amount')
var pagePaymentChoiceAccountOwnerElement = $('page-payment-choice-account-owner')
var pageBrainblocksAccountOwnerElement = $('page-brainblocks-account-owner')
var pageQRCodeAccountOwnerElement = $('page-qr-code-account-owner')
var pageBrainblocksAmountElement = $('page-brainblocks-amount')
var pageQRCodeAmount = $('page-qr-code-amount')
var suggestionElements = document.getElementsByClassName('suggestion')
var addressChoicesElement = $('address-choices')
var nanoDonateEntryTitleElement = $('nano-donate-entry-title')
var nanoDonateEntryImageElement = $('nano-donate-entry-image')
var nanoDonateEntryAddressOwnerElement = $('nano-donate-entry-address-owner')
var nanoDonateEntryRoleElement = $('nano-donate-entry-role')
var websiteWrapper = $('website-wrapper')
var asteriskText = $('asterisk-text')
var debugElement = $('debug')

// ---------------------------------------------------

document.addEventListener('DOMContentLoaded', function () {
  chrome.storage.local.get({nanoAddressCache: {}}, function ({ nanoAddressCache }) {
    // Check whether user has agreed to first use message
    chrome.storage.local.get({agree: false}, function ({ agree }) {
      if (!agree) {
        showPage(pageFirstUseElement, {
          historyActive: false,
          backActive: false
        })
        $('i-agree').onclick = function () {
          chrome.storage.local.set({agree: true})
          start()
        }
      } else {
        start()
      }
    })

    // -----

    function start () {
      // Query current tab
      chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        // Get cache entry which associates current URL to Nano address (if any)
        var nanoAddressCacheEntry = nanoAddressCache[tabs[0].id] || {}

        var nanoDonateEntries = nanoAddressCacheEntry.nanoDonateEntries || []
        var nanoDonateEntry

        var url = nanoAddressCacheEntry.url
        $('website').innerText = url

        nanoDonateEntries.map(function (nanoDonateEntry_) {
          // Perform XSS prevention on all website supplied values (except address as it has to be valid already to get to this point)
          nanoDonateEntry_.addressOwner = filterXSS(nanoDonateEntry_.addressOwner)
          nanoDonateEntry_.image = filterXSS(nanoDonateEntry_.image)
          nanoDonateEntry_.role = filterXSS(nanoDonateEntry_.role)
          nanoDonateEntry_.title = filterXSS(nanoDonateEntry_.title)

          let role = nanoDonateEntry_.role ? ' (' + nanoDonateEntry_.role + ')' : ''
          let image = nanoDonateEntry_.metaTag
                      ? ''
                      : nanoDonateEntry_.image || AVATAR_FILE_LOCATION

          let addressChoiceElement = document.createElement('button')
          addressChoiceElement.innerHTML = `<img src="${image}" style="width:25px" /> <span>${nanoDonateEntry_.addressOwner + role}</span>`
          addressChoiceElement.onclick = function () {
            // Set chosen Nano Donate entry to be the one used throughout the entire app flow
            nanoDonateEntry = nanoDonateEntry_
            nanoDonateEntrySetup()
            showPage(pageDonationElement, { backActive: !!nanoDonateEntries.length })
          }
          addressChoicesElement.appendChild(addressChoiceElement)
        })

        // Set event handlers
        nanoDonationAmountElement.onkeyup = nanoDonationAmountChanged
        nanoDonationFormElement.onsubmit = onNanoDonationFormSubmit
        Array.from(suggestionElements).forEach(function (suggestionElement) {
          suggestionElement.onclick = onSuggestionClicked
        })
        historyLinkElement.onclick = historyLinkDonationSuccessfulElement.onclick = onHistoryLinkClicked
        backLinkElement.onclick = onBackLinkClicked
        $('payment-choice-brainblocks').onclick = paymentChoiceBrainblocksClicked
        $('payment-choice-qr-code').onclick = paymentChoiceQRCodeClicked
        nanoDonationFormElement.onsubmit = onNanoDonationFormSubmit

        // Show Nano Donate entry choices
        if (nanoDonateEntries.length > 1) {
          showPage(pageAddressChoiceElement, { backActive: false })
        } else if (nanoDonateEntries.length === 1) { // Process the sole Nano Donate entry
          nanoDonateEntry = nanoDonateEntries[0]
          nanoDonateEntrySetup()
          showPage(pageDonationElement, { backActive: false })
        } else { // There are no Nano Donate entries
          showPage(pageNoDonateElement, { backActive: false })
        }

        // -----

        function nanoDonateEntrySetup () {
          setNanoAddress(addressElement, nanoDonateEntry.address)
          setNanoAddress(addressQRCodePageElement, nanoDonateEntry.address)
          addressQRCodeElement.innerHTML = ''

          var addressQRCode = new QRCode(addressQRCodeElement, {
            text: nanoDonateEntry.address,
            width: 90,
            height: 90,
            colorDark: '#444',
            correctLevel: QRCode.CorrectLevel.M
          })

          if (nanoDonateEntry.metaTag) {
            nanoDonateEntryTitleElement.innerText = 'Donate to this web page'
            show(websiteWrapper)
            nanoDonateEntryImageElement.innerHTML = nanoDonateEntryAddressOwnerElement.innerText = nanoDonateEntryRoleElement.innerText = ''
            hide(asteriskText)
          } else {
            if (nanoDonateEntry.title) {
              nanoDonateEntryTitleElement.innerHTML = nanoDonateEntry.title + SUP_HTML
            } else {
              nanoDonateEntryTitleElement.innerHTML = 'Donate to'
            }
            nanoDonateEntryAddressOwnerElement.innerHTML = nanoDonateEntry.addressOwner
            nanoDonateEntryRoleElement.innerHTML = nanoDonateEntry.role && ' (' + nanoDonateEntry.role + ')'
            if (nanoDonateEntry.role) {
              nanoDonateEntryRoleElement.innerHTML += SUP_HTML
            } else {
              nanoDonateEntryAddressOwnerElement.innerHTML += SUP_HTML
            }

            nanoDonateEntryImageElement.innerHTML = `<img src="${nanoDonateEntry.image ? nanoDonateEntry.image : AVATAR_FILE_LOCATION}" style="width: 75px" />`

            hide(websiteWrapper)
            show(asteriskText)
          }
        }

        // -----

        function onNanoDonationFormSubmit (event) {
          event.preventDefault()
          var nanoDonationAmountElementValue = parseFloat(nanoDonationAmountElement.value)
          var nanoDonationAmount = parseFloat((nanoDonationAmountElementValue * raiMultiplier).toFixed(0))
          var nanoDonationAmountRaw = nanoDonationAmount + '000000000000000000000000'
          var token

          // Display debug information
          if (debug) {
            debugElement.innerHTML += `
            Mnano = ${nanoDonationAmountElementValue}<br/>
            nano = ${nanoDonationAmount}<br/>
            raw = ${nanoDonationAmountRaw}<br/>
            `
          }

          if (amountValid) {
            pagePaymentChoiceAmountElement.innerText = pageBrainblocksAmountElement.innerText = pageQRCodeAmount.innerText = nanoDonationAmountElementValue

            pagePaymentChoiceAccountOwnerElement.innerText =
              pageBrainblocksAccountOwnerElement.innerText =
              pageQRCodeAccountOwnerElement.innerText =
              nanoDonateEntry.metaTag
                ? ' to this web page'
                : nanoDonateEntry.addressOwner ? ' to ' + nanoDonateEntry.addressOwner : ''

            // Render the Nano button
            brainblocks.Button.render({
              // Pass in payment options
              payment: {
                currency: 'rai',
                amount: nanoDonationAmount,
                destination: nanoDonateEntry.address
              },
              // Handle successful payments
              onPayment: function (data) {
                token = data.token

                fetch('https://api.brainblocks.io/api/session/' + token + '/verify', {
                  method: 'get'
                })
                .then(function (response) {
                  return response.json()
                })
                .then(function (data) {
                  // Check whether Brainblocks response matches our existing values
                  if (
                    nanoDonationAmount === data.amount_rai &&
                    nanoDonateEntry.address === data.destination &&
                    token === data.token
                  ) {
                    // Build up latest donation
                    var latestDonation = {
                      timestamp: Date.now(),
                      amount: nanoDonationAmountElementValue,
                      url: url,
                      addressOwner: nanoDonateEntry.addressOwner, // may not exist
                      role: nanoDonateEntry.role, // may not exist
                      sender: data.sender,
                      destination: data.destination,
                      send_block: data.send_block,
                      brainblocks_token: data.token
                    }

                    $('nano-donation-amount-success').innerText = '⋰·⋰ ' + nanoDonationAmountElementValue                                        

                    donationSuccessfulDetailsElement.innerHTML= `<div id="donation">
                      ${buildDonationRow('Date', new Date(latestDonation.timestamp).toLocaleString())}
                      ${buildDonationRow('Amount Donated', `⋰·⋰ ${latestDonation.amount}`)}
                      ${buildDonationRow('Website URL', `<a href="${latestDonation.url}" target="_blank">${latestDonation.url}</a>`)}
                      ${buildDonationRow('Donated to', latestDonation.addressOwner + (latestDonation.role ? ' (' + latestDonation.role + ')' : ''))}
                      ${buildDonationRow('Sender Address', `<a href="${nanoCrawlerAccountURL + latestDonation.sender}" title="${latestDonation.sender}" target="_blank">${shortenNanoAddress(latestDonation.sender)}</a>`)}
                      ${buildDonationRow('Destination Address', `<a href="${nanoCrawlerAccountURL + latestDonation.destination}" title="${latestDonation.destination}" target="_blank">${shortenNanoAddress(latestDonation.destination)}</a>`)}
                      ${buildDonationRow('Send Block', `<a href="${nanoCrawlerBlockURL + latestDonation.send_block}" title="${latestDonation.send_block}" target="_blank">${shortenBlockHash(latestDonation.send_block)}</a>`)}
                      ${/* buildDonationRow('BrainBlocks Token', latestDonation.brainblocks_token) */''}
                    </div>`

                    showPage(pageDonationSuccessfulElement, {}, 'Donate Again?')

                    // Save donation to local storage, along with previous donations
                    chrome.storage.local.get({history: []}, function ({ history }) {
                      chrome.storage.local.set({history: [latestDonation, ...history]})
                    })
                  } else {
                    throw new Error('Payment error')
                  }
                })
                .catch(function (error) {
                  showPage(pageDonationUnsuccessfulElement)
                  console.log(error)
                })
              }
            }, '#brainblocks-button')

            var paymentQRCodeText = 'nano:' + nanoDonateEntry.address + '?amount=' + nanoDonationAmountRaw

            // Refresh payment QR code
            var paymentQRCode = new QRCode(paymentQRCodeElement, {
              text: paymentQRCodeText,
              width: 120,
              height: 120,
              correctLevel: QRCode.CorrectLevel.M
            })

            // Display debug information
            if (debug) {
              debugElement.innerHTML += `
              paymentQRCodeText = ${paymentQRCodeText}<br/>
              `
            }

            // Show payment choice page
            showPage(pagePaymentChoiceElement, {
              footerActive: false,
              historyActive: false,
              githubActive: false,
              backActive: true
            })
          }
        }

        // -----

        function nanoDonationAmountChanged (event) {
          var amount = event.target.value.trim()
          var maxAmount = 99
          var minAmount = 0.0001
          var warnAmount = 50

          // Handle 'Next' button status and possible error text for entered Nano amount
          if (amount === '') {
            nextDisallow()
          } else if (amount === 0) {
            nextDisallow()
          } else if (!validNanoAmount.test(amount)) {
            nextDisallow('Invalid amount. Must be a number in format XX.XXXXXX')
          } else if (amount > maxAmount) {
            nextDisallow('Maximum donation is ' + maxAmount + ' Nano. Choose smaller amount.')
          } else if (amount < minAmount) {
            nextDisallow('Minimum donation is ' + minAmount + ' Nano. Choose larger amount.')
          } else if (amount > warnAmount) {
            nextAllow('Donating more than ' + warnAmount + ' Nano, are you sure?')
          } else {
            nextAllow()
          }
        }

        // -----

        function nextAllow (text = '') {
          nanoAmountErrorElement.innerText = text
          amountValid = true
          nanoDonationSubmitElement.disabled = false
        }

        // -----

        function nextDisallow (text = '') {
          nanoAmountErrorElement.innerText = text
          amountValid = false
          nanoDonationSubmitElement.disabled = true
        }

        // -----

        // Shorten Nano address for display purposes
        function shortenNanoAddress (nanoAddress) {
          return nanoAddress.substring(0, 10) + '...' + nanoAddress.substring(58, (nanoAddress.startsWith('nano_') ? 65 : 64))
        }

        // -----

        // Shorten block hash for display purposes
        function shortenBlockHash (blockHash) {
          return blockHash.substring(0, 10) + '...' + blockHash.substring(54, 64)
        }        

        // -----

        function setNanoAddress (element, nanoAddress) {
          // element.innerText = shortenNanoAddress(nanoAddress)
          element.innerText = nanoAddress
          element.href = nanoCrawlerAccountURL + nanoAddress
        }

        // -----

        function buildDonationRow (type, content) {
          return (
          `<div class="row">
            <div class="type">${type}</div>
            <div class="content">${content}</div>
          </div>`
          )
        }

        // -----

        function onSuggestionClicked (event) {
          nanoDonationAmountElement.value = event.target.title
          nextAllow()
        }

        function paymentChoiceBrainblocksClicked () {
          showPage(pageBrainblocksElement, {
            footerActive: false,
            historyActive: false,
            githubActive: false,
            backActive: true
          })
        }

        // -----

        function paymentChoiceQRCodeClicked () {
          showPage(pageQRCodeElement, {
            footerActive: false,
            historyActive: false,
            githubActive: false,
            backActive: true
          }, 'Donate Again?')
        }

        // -----

        function onBackLinkClicked (event) {
          // Clear debug information
          if (debug) {
            debugElement.innerHTML = ''
          }

          if (nanoDonateEntries.length) {
            nanoDonationAmountElement.value = ''
            brainblocksButtonElement.innerHTML = ''
            paymentQRCodeElement.innerHTML = ''
            nextDisallow()
            if (nanoDonateEntries.length > 1) {
              showPage(pageAddressChoiceElement, { backActive: false })
            } else {
              showPage(pageDonationElement, { backActive: false })
            }
          } else {
            showPage(pageNoDonateElement, { backActive: false })
          }
        }

        // -----

        // Donation history
        function onHistoryLinkClicked (event) {
          var donationsHistoryHtml = ''

          // Get history of donations from local storage
          chrome.storage.local.get({history: []}, function ({ history }) {
            history.forEach(function ({
              timestamp,
              amount,
              url,
              addressOwner,
              role,
              sender,
              destination,
              send_block,
              brainblocks_token
            }) {
              donationsHistoryHtml += `<div id="donation">
                ${buildDonationRow('Date', new Date(timestamp).toLocaleString())}
                ${buildDonationRow('Amount Donated', `⋰·⋰ ${amount}`)}
                ${buildDonationRow('Website URL', `<a href="${url}" target="_blank">${url}</a>`)}
                ${buildDonationRow('Donated to', addressOwner + (role ? ' (' + role + ')' : ''))}
                ${buildDonationRow('Sender Address', `<a href="${nanoCrawlerAccountURL + sender}" title="${sender}" target="_blank">${shortenNanoAddress(sender)}</a>`)}
                ${buildDonationRow('Destination Address', `<a href="${nanoCrawlerAccountURL + destination}" title="${destination}" target="_blank">${shortenNanoAddress(destination)}</a>`)}
                ${buildDonationRow('Send Block', `<a href="${nanoCrawlerBlockURL + send_block}" title="${send_block}" target="_blank">${shortenBlockHash(send_block)}</a>`)}
                ${/* buildDonationRow('BrainBlocks Token', brainblocks_token) */''}
              </div>`
            })

            // If there are no donations insert default HTML
            donationsHistoryHtml = donationsHistoryHtml || '<p>Your donation history is empty.</p>'            
            donationsHistoryElement.innerHTML = donationsHistoryHtml
            console.log(donationsHistoryElement.innerHTML)
            showPage(pageHistoryElement, { historyActive: false }, 'Back')
          })
        }
      })
    }

    // -----

    function showPage (page, {
      footerActive = true,
      historyActive = true,
      githubActive = true,
      backActive = true
    } = {
      footerActive: true,
      historyActive: true,
      githubActive: true,
      backActive: true
    }, backLinkText = 'Start Over') {
      hide(pageAddressChoiceElement)
      hide(pagePaymentChoiceElement)
      hide(pageBrainblocksElement)
      hide(pageQRCodeElement)
      hide(pageNoDonateElement)
      hide(pageDonationElement)
      hide(pageHistoryElement)
      hide(pageDonationSuccessfulElement)
      hide(pageDonationUnsuccessfulElement)
      hide(pageFirstUseElement)
      show(page)

      // Set the centextual text for the back link
      backLinkElement.innerText = '< ' + backLinkText

      // Check whether to activate the links in the footer
      // (to prevent clicking away during the donation process)
      if (footerActive) {
        footerLinkNanochartsElement.innerHTML = '<a href="https://nanocharts.info/" target="_blank">Nano Charts</a>'
        footerLinkNanoDonateElement.innerHTML = '<a href="https://nanocharts.info/nano-donate.html" target="_blank">Nano Donate (' + version + ')</a>'
      } else {
        footerLinkNanochartsElement.innerHTML = 'Nano Charts'
        footerLinkNanoDonateElement.innerHTML = 'Nano Donate (' + version + ')'
      }

      // Check whether to activate the link to Donation History in the header
      // (to prevent clicking away during the donation process)
      if (historyActive) {
        show(historyLinkElement)
      } else {
        hide(historyLinkElement)
      }

      // Check whether to activate the Back link in the header
      if (backActive) {
        show(backLinkElement)
      } else {
        hide(backLinkElement)
      }

      // Check whether to activate the link to GitHub in the footer
      // (to prevent clicking away during the donation process)
      if (githubActive) {
        footerLinkGithubElement.innerHTML = '<a href="https://github.com/kilkelly/nano-donate" target="_blank">Source Code on GitHub</a>'
      } else {
        footerLinkGithubElement.innerHTML = ''
      }
    }

  })
})

// ---------------------------------------------------
// ---------------------------------------------------

function $ (name) {
  return document.getElementById(name)
}

function show (element) {
  element.style.display = 'block'
}

function hide (element) {
  element.style.display = 'none'
}
