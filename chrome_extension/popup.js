// Helper to display contacts
function displayContacts(contacts) {
  const display = document.getElementById('contactsDisplay');
  if (!contacts || contacts.length === 0) {
    display.textContent = 'No contacts found.';
    return;
  }
  let html = '<table style="width:100%;border-collapse:collapse;font-size:0.97em;">';
  html += '<tr><th style="border-bottom:1px solid #ccc;text-align:left;">Name</th><th style="border-bottom:1px solid #ccc;text-align:left;">Email</th><th style="border-bottom:1px solid #ccc;text-align:left;">Phone</th></tr>';
  contacts.forEach(c => {
    html += `<tr><td>${c.name || ''}</td><td>${c.email || ''}</td><td>${c.phone || ''}</td></tr>`;
  });
  html += '</table>';
  display.innerHTML = html;
}

// Load contacts from storage
function loadContacts() {
  chrome.storage.local.get(['scrapedContacts'], (result) => {
    displayContacts(result.scrapedContacts || []);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadContacts();

  document.getElementById('scanBtn').addEventListener('click', () => {
    document.getElementById('statusMsg').textContent = 'Scanning...';
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['content.js']
      }, () => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'scanContacts' }, (response) => {
          if (response && response.success) {
            displayContacts(response.contacts);
            document.getElementById('statusMsg').textContent = 'Contacts scanned and saved!';
          } else {
            document.getElementById('statusMsg').textContent = 'Failed to scan contacts.';
          }
        });
      });
    });
  });

  document.getElementById('initiateCallBtn').addEventListener('click', () => {
    const script = document.getElementById('callScript').value.trim();
    chrome.storage.local.get(['scrapedContacts'], (result) => {
      const contacts = result.scrapedContacts || [];
      if (!contacts.length || !script) {
        document.getElementById('statusMsg').textContent = 'Please scan contacts and enter a call script.';
        return;
      }
      // Send all contacts to backend
      Promise.all(contacts.map(contact => {
        return fetch('http://127.0.0.1:8000/api/contacts/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: contact.name,
            email: contact.email,
            phone: contact.phone
          })
        })
        .then(res => res.json())
        .then(savedContact => {
          return fetch('http://127.0.0.1:8000/api/call-scripts/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contact: savedContact.id,
              script_text: script
            })
          });
        });
      }))
      .then(() => {
        document.getElementById('statusMsg').textContent = 'All contacts sent to backend!';
      })
      .catch(err => {
        document.getElementById('statusMsg').textContent = 'Failed to send data to backend.';
      });
    });
  });

  document.getElementById('clearDataBtn').addEventListener('click', () => {
    chrome.storage.local.remove(['scrapedContacts'], () => {
      displayContacts([]);
      document.getElementById('statusMsg').textContent = 'Contact data cleared.';
    });
  });
}); 