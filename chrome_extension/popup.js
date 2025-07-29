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

// --- Real-time AI Call Streaming Logic ---
let ws = null;
let mediaRecorder = null;
let audioContext = null;
let transcriptText = '';

function appendTranscript(text) {
  transcriptText += text + ' ';
  document.getElementById('transcriptDisplay').textContent = transcriptText;
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

  document.getElementById('startCallBtn').addEventListener('click', async () => {
    document.getElementById('statusMsg').textContent = 'Starting call...';
    transcriptText = '';
    document.getElementById('transcriptDisplay').textContent = '';
    document.getElementById('startCallBtn').disabled = true;
    document.getElementById('stopCallBtn').disabled = false;

    // Get script from textarea
    const script = document.getElementById('callScript').value.trim();
    if (!script) {
      document.getElementById('statusMsg').textContent = 'Please enter a call script.';
      document.getElementById('startCallBtn').disabled = false;
      document.getElementById('stopCallBtn').disabled = true;
      return;
    }

    // Generate a random session ID for demo
    const sessionId = Math.random().toString(36).substring(2, 12);
    ws = new WebSocket(`ws://127.0.0.1:8000/ws/call-session/${sessionId}/`);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      // Send the script as the first message
      ws.send(JSON.stringify({ type: 'script', script }));
      document.getElementById('statusMsg').textContent = 'Call started. Speak now!';
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        // Assume transcript text
        appendTranscript(event.data);
      } else {
        // Play received audio chunk
        if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
        event.data.arrayBuffer().then((buf) => {
          audioContext.decodeAudioData(buf, (buffer) => {
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start(0);
          });
        });
      }
    };

    ws.onerror = (e) => {
      document.getElementById('statusMsg').textContent = 'WebSocket error.';
      document.getElementById('startCallBtn').disabled = false;
      document.getElementById('stopCallBtn').disabled = true;
    };

    ws.onclose = () => {
      document.getElementById('statusMsg').textContent = 'Call ended.';
      document.getElementById('startCallBtn').disabled = false;
      document.getElementById('stopCallBtn').disabled = true;
      if (mediaRecorder) mediaRecorder.stop();
      mediaRecorder = null;
      ws = null;
    };

    // Start audio recording and send chunks
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0 && ws && ws.readyState === WebSocket.OPEN) {
        e.data.arrayBuffer().then((buf) => ws.send(buf));
      }
    };
    mediaRecorder.start(250); // Send every 250ms
  });

  document.getElementById('stopCallBtn').addEventListener('click', () => {
    if (mediaRecorder) mediaRecorder.stop();
    if (ws) ws.close();
    document.getElementById('startCallBtn').disabled = false;
    document.getElementById('stopCallBtn').disabled = true;
    document.getElementById('statusMsg').textContent = 'Call stopped.';
  });
}); 