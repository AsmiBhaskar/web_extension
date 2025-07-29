// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scanContacts') {
    const bodyText = document.body.innerText;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /\b(?:\+\d{1,3}[ -]?)?(?:\(\d{1,4}\)[ -]?|\d{1,4}[ -]?)?\d{1,4}[ -]?\d{1,4}[ -]?\d{1,9}\b/g;
    const lines = bodyText.split(/\n|\r/);
    let groupedContacts = [];
    let allEmails = new Set();
    let allPhones = new Set();
    let allNames = new Set();
    lines.forEach(line => {
      const emails = line.match(emailRegex) || [];
      const phones = (line.match(phoneRegex) || []).filter(num => num.replace(/\D/g, '').length >= 7);
      let name = '';
      // Try to find a name before the first email or phone
      if (emails.length > 0) {
        const before = line.split(emails[0])[0].trim();
        const nameMatch = before.match(/([A-Z][a-z]+( [A-Z][a-z]+)+)$/);
        if (nameMatch) name = nameMatch[0];
      } else if (phones.length > 0) {
        const before = line.split(phones[0])[0].trim();
        const nameMatch = before.match(/([A-Z][a-z]+( [A-Z][a-z]+)+)$/);
        if (nameMatch) name = nameMatch[0];
      }
      emails.forEach(email => allEmails.add(email));
      phones.forEach(phone => allPhones.add(phone));
      if (name) allNames.add(name);
      // Group by line: if any email or phone, create a contact
      if ((emails.length || phones.length) && (name || emails.length || phones.length)) {
        groupedContacts.push({
          name,
          email: emails[0] || '',
          phone: phones[0] || ''
        });
      }
    });
    // Fallback: add any emails/phones/names not already grouped
    allEmails.forEach(email => {
      if (!groupedContacts.some(c => c.email === email)) {
        groupedContacts.push({ name: '', email, phone: '' });
      }
    });
    allPhones.forEach(phone => {
      if (!groupedContacts.some(c => c.phone === phone)) {
        groupedContacts.push({ name: '', email: '', phone });
      }
    });
    allNames.forEach(name => {
      if (!groupedContacts.some(c => c.name === name)) {
        groupedContacts.push({ name, email: '', phone: '' });
      }
    });
    chrome.storage.local.set({ scrapedContacts: groupedContacts }, () => {
      sendResponse({ success: true, contacts: groupedContacts });
    });
    // Required for async sendResponse
    return true;
  }
}); 