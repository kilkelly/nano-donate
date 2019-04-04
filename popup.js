var version = 'v1.0.2'
var pageDonation = 'page-donation'
var pageNoDonate = 'page-nodonate'
var pageBrainblocks = 'page-brainblocks'
var pageHistory = 'page-history'
var pageDonationSuccessful = 'page-donation-successful'
var pageDonationUnsuccessful = 'page-donation-unsuccessful'
var pageFirstUse = 'page-first-use'
var nanoCrawlerAccountURL = 'https://nanocrawler.cc/explorer/account/'
var nanoCrawlerBlockURL = 'https://nanocrawler.cc/explorer/block/'
var validNanoAddress = /^[+-]?((\.\d+)|(\d+(\.\d+)?))$/
var amountValid = false
var raiMultiplier = 1000000

// ---------------------------------------------------

document.addEventListener('DOMContentLoaded', function () {
  var nanoDonationFormElement = $('nano-donation-form')
  var nanoDonationAmountElement = $('nano-donation-amount')
  var nanoAmountErrorElement = $('nano-amount-error')
  var nanoDonationSubmitElement = $('nano-donation-submit')
  var footerLinkNanocharts = $('footer-link-nanocharts')
  var footerLinkNanoDonate = $('footer-link-nano-donate')
  var footerLinkGithub = $('footer-link-github')
  var backLinkElement = $('back-link')
  var historyLinkElement = $('history-link')
  var historyLinkDonationSuccessfulElement = $('history-link-donation-successful')
  var donationsHistoryElement = $('donations-history')
  var donationSuccessfulDetailsElement = $('donation-successful-details')
  var suggestionElements = document.getElementsByClassName('suggestion')

  chrome.storage.local.get({nanoAddressCache: {}}, function ({ nanoAddressCache }) {    
  // chrome.runtime.getBackgroundPage(function (background) {
    // Check whether user has agreed to first use message
    chrome.storage.local.get({agree: false}, function ({ agree }) {
      if (!agree) {
        showPage(pageFirstUse, {
          historyActive: false,
          backActive: false
        })
        $('i-agree').onclick = function () {
          chrome.storage.local.set({agree: true})
          main()
        }
      } else {
        main()
      }
    })

    // -----

    function main () {
      // Query current tab
      chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        // Get cache entry which associates current URL to Nano address (if any)
        var nanoAddressCacheEntry = nanoAddressCache[tabs[0].id] || {}

        var nanoAddress = nanoAddressCacheEntry.nanoAddress
        var url = nanoAddressCacheEntry.url

        // Set event handlers
        nanoDonationAmountElement.onkeyup = nanoDonationAmountChanged
        nanoDonationFormElement.onsubmit = onNanoDonationFormSubmit
        Array.from(suggestionElements).forEach(function (suggestionElement) {
          suggestionElement.onclick = onSuggestionClicked
        })
        historyLinkElement.onclick = historyLinkDonationSuccessfulElement.onclick = onHistoryLinkClicked
        backLinkElement.onclick = onBackLinkClicked

        // Check if web page is enabled to accept Nano donations (if Nano address exists in meta tag)
        if (nanoAddress) {
          $('website').innerText = url
          setNanoAddress($('address'))
          var addressQRCode = new QRCode($('address-qr-code'), {
            text: nanoAddress,
            width: 120,
            height: 120,
            correctLevel: QRCode.CorrectLevel.M
          })
          nanoDonationFormElement.onsubmit = onNanoDonationFormSubmit
          showPage(pageDonation, { backActive: false })
        } else {
          showPage(pageNoDonate, { backActive: false })
        }

        // -----

        function onNanoDonationFormSubmit (event) {
          event.preventDefault()
          var nanoDonationAmountElementValue = parseFloat(nanoDonationAmountElement.value)
          var nanoDonationAmount = parseFloat((nanoDonationAmountElementValue * raiMultiplier).toFixed(0))
          var token

          if (amountValid) {
            showPage(pageBrainblocks, {
              footerActive: false,
              historyActive: false,
              githubActive: false,
              backActive: true
            })

            // Render the Nano button
            brainblocks.Button.render({
              // Pass in payment options
              payment: {
                currency: 'rai',
                amount: nanoDonationAmount,
                destination: nanoAddress
              },
              // Handle successful payments
              onPayment: function (data) {
                token = data.token

                fetch ('https://api.brainblocks.io/api/session/' + token + '/verify', {
                  method: 'get'
                })
                .then(function (response) {
                  return response.json()
                })
                .then(function (data) {
                  // Check whether Brainblocks response matches our existing values
                  if (
                    nanoDonationAmount === data.amount_rai &&
                    nanoAddress === data.destination &&
                    token === data.token
                  ) {
                    // Build up latest donation
                    var latestDonation = {
                      timestamp: Date.now(),
                      amount: nanoDonationAmountElementValue,
                      url: url,
                      sender: data.sender,
                      destination: data.destination,
                      send_block: data.send_block,
                      brainblocks_token: data.token
                    }

                    $('nano-donation-amount-success').innerText = '⋰·⋰ ' + nanoDonationAmountElementValue

                    donationSuccessfulDetailsElement.innerHTML= `
                      <table id="donation-history-item">
                        <tr>
                          <td>Date</td>
                          <td>${new Date(latestDonation.timestamp).toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td>Amount Donated</td>
                          <td>⋰·⋰ ${latestDonation.amount}</td>
                        </tr>
                        <tr>
                          <td>Donated To</td>
                          <td><a href="${latestDonation.url}" target="_blank">${latestDonation.url}</a></td>
                        </tr>
                        <tr>
                          <td>Sender Address</td>
                          <td><a href="${nanoCrawlerAccountURL + latestDonation.sender}" target="_blank">${latestDonation.sender}</a></td>
                        </tr>
                        <tr>
                          <td>Destination Address</td>
                          <td><a href="${nanoCrawlerAccountURL + latestDonation.destination}" target="_blank">${latestDonation.destination}</a></td>
                        </tr>
                        <tr>
                          <td>Send Block</td>
                          <td><a href="${nanoCrawlerBlockURL + latestDonation.send_block}" target="_blank">${latestDonation.send_block}</a></td>
                        </tr>
                        <!--tr>
                          <td>Brainblocks Token</td>
                          <td>${latestDonation.brainblocks_token}</td>
                        </tr-->              
                      </table>
                    `

                    showPage(pageDonationSuccessful, {}, 'Donate again?')

                    // Save donation to local storage, along with previous donations
                    chrome.storage.local.get({history: []}, function ({ history }) {
                      chrome.storage.local.set({history: [latestDonation, ...history]})
                    })
                  } else {
                    throw new Error('Payment error')
                  }
                })
                .catch(function (error) {
                  showPage(pageDonationUnsuccessful)
                  console.log(error)
                })
              }
            }, '#nano-button')
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
          } else if (!validNanoAddress.test(amount)) {
            nextDisallow('Invalid amount')
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

        // Shorten long Nano address for display purposes
        function shortenNanoAddress (nanoAddress) {
          return nanoAddress
          // return nanoAddress.substring(0, 10) + '...' + nanoAddress.substring(58, 64)
        }

        // -----

        function setNanoAddress (element) {
          element.innerText = shortenNanoAddress(nanoAddress)
          element.href = nanoCrawlerAccountURL + nanoAddress
        }

        // -----

        function onSuggestionClicked (event) {
          nanoDonationAmountElement.value = event.target.title
          nextAllow()
        }

        // -----

        function onBackLinkClicked (event) {
          if (nanoAddress) {
            $('nano-donation-amount').value = null
            $('nano-button').innerHTML = ''
            showPage(pageDonation, { backActive: false })
          } else {
            showPage(pageNoDonate, { backActive: false })
          }
        }

        // -----

        // Donation history
        function onHistoryLinkClicked (event) {
          var donationsHistoryHtml = ''

          // Get history of donations from local storage
          chrome.storage.local.get({history: []}, function ({ history }) {
            history.forEach(function (donation) {
              // Build HTML for this donation
              donationsHistoryHtml += `
                <table id="donation-history-item">
                  <tr>
                    <td>Date</td>
                    <td>${new Date(donation.timestamp).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>Amount Donated</td>
                    <td>⋰·⋰ ${donation.amount}</td>
                  </tr>
                  <tr>
                    <td>Donated To</td>
                    <td><a href="${donation.url}" target="_blank">${donation.url}</a></td>
                  </tr>
                  <tr>
                    <td>Sender Address</td>
                    <td><a href="${nanoCrawlerAccountURL + donation.sender}" target="_blank">${donation.sender}</a></td>
                  </tr>
                  <tr>
                    <td>Destination Address</td>
                    <td><a href="${nanoCrawlerAccountURL + donation.destination}" target="_blank">${donation.destination}</a></td>
                  </tr>
                  <tr>
                    <td>Send Block</td>
                    <td><a href="${nanoCrawlerBlockURL + donation.send_block}" target="_blank">${donation.send_block}</a></td>
                  </tr>
                  <!--tr>
                    <td>Brainblocks Token</td>
                    <td>${donation.brainblocks_token}</td>
                  </tr-->              
                </table>
              `
            })

            // If there are no donations insert default HTML
            donationsHistoryHtml = donationsHistoryHtml || '<p>You have not made any donations yet.</p>'

            donationsHistoryElement.innerHTML = donationsHistoryHtml
            showPage(pageHistory, { historyActive: false }, 'Donate Now')
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
    }, backLinkText = 'Cancel') {
      $(pageBrainblocks).style.display = 'none'
      $(pageNoDonate).style.display = 'none'
      $(pageDonation).style.display = 'none'
      $(pageHistory).style.display = 'none'
      $(pageDonationSuccessful).style.display = 'none'
      $(pageDonationUnsuccessful).style.display = 'none'
      $(pageFirstUse).style.display = 'none'
      $(page).style.display = 'block'

      // Set the centextual text for the back link
      backLinkElement.innerText = backLinkText

      // Check whether to activate the links in the footer
      // (to prevent clicking away during the donation process)
      if (footerActive) {
        footerLinkNanocharts.innerHTML = '<a href="https://nanocharts.info/" target="_blank">Nano Charts</a>'
        footerLinkNanoDonate.innerHTML = '<a href="https://nanocharts.info/nano-donate.html" target="_blank">Nano Donate (' + version + ')</a>'
      } else {
        footerLinkNanocharts.innerHTML = 'Nano Charts'
        footerLinkNanoDonate.innerHTML = 'Nano Donate (' + version + ')'
      }

      // Check whether to activate the link to Donation History in the header
      // (to prevent clicking away during the donation process)
      if (historyActive) {
        historyLinkElement.style.display = 'block'
      } else {
        historyLinkElement.style.display = 'none'
      }

      // Check whether to activate the Back link in the header
      if (backActive) {
        backLinkElement.style.display = 'block'
      } else {
        backLinkElement.style.display = 'none'
      }

      // Check whether to activate the link to GitHub in the footer
      // (to prevent clicking away during the donation process)
      if (githubActive) {
        footerLinkGithub.innerHTML = '<a href="https://github.com/kilkelly/nano-donate" target="_blank">Source Code on GitHub</a>'
      } else {
        footerLinkGithub.innerHTML = ''
      }
    }

  })
})

// ---------------------------------------------------
// ---------------------------------------------------

function $ (name) {
  return document.getElementById(name)
}
