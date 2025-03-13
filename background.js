// Hintergrund-Service-Worker für das Hemingwai Chrome-Plugin

// Globale Variable für das Popup-Fenster
let popupWindow = null;

// Kontextmenü-Einträge erstellen, wenn das Plugin installiert wird
chrome.runtime.onInstalled.addListener(() => {
  // Kontextmenü-Eintrag für markierten Text
  chrome.contextMenus.create({
    id: "hemingwai-selected-text",
    title: "Mit Hemingwai verarbeiten",
    contexts: ["selection"]
  });
});

// Kontextmenü-Klick-Handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "hemingwai-selected-text") {
    // Ausgewählten Text an das Popup senden
    const selectedText = info.selectionText;
    
    // Speichere den ausgewählten Text
    chrome.storage.local.set({ "selectedText": selectedText }, function() {
      // Öffne das Popup in einem separaten Fenster
      openPopupWindow();
    });
  }
});

// Funktion zum Öffnen des Popups in einem separaten Fenster
function openPopupWindow() {
  // Wenn das Fenster bereits geöffnet ist, fokussiere es
  if (popupWindow) {
    try {
      chrome.windows.get(popupWindow.id, (win) => {
        if (win && !chrome.runtime.lastError) {
          chrome.windows.update(popupWindow.id, { focused: true });
        } else {
          // Fenster existiert nicht mehr, erstelle ein neues
          createNewPopupWindow();
        }
      });
    } catch (e) {
      // Bei Fehler ein neues Fenster erstellen
      createNewPopupWindow();
    }
  } else {
    // Kein Fenster vorhanden, erstelle ein neues
    createNewPopupWindow();
  }
}

// Funktion zum Erstellen eines neuen Popup-Fensters
function createNewPopupWindow() {
  // Bildschirmgröße ermitteln
  chrome.system.display.getInfo(function(displayInfo) {
    if (displayInfo && displayInfo.length > 0) {
      const display = displayInfo[0];
      const screenWidth = display.bounds.width;
      const screenHeight = display.bounds.height;
      
      // Fensterbreite und -höhe (90% des Bildschirms)
      const windowWidth = Math.floor(screenWidth * 0.9);
      const windowHeight = Math.floor(screenHeight * 0.9);
      
      // Position berechnen (zentriert)
      const left = Math.floor((screenWidth - windowWidth) / 2);
      const top = Math.floor((screenHeight - windowHeight) / 2);
      
      // Fenster erstellen
      chrome.windows.create({
        url: chrome.runtime.getURL("popup.html"),
        type: "popup",
        width: windowWidth,
        height: windowHeight,
        left: left,
        top: top,
        focused: true
      }, function(window) {
        popupWindow = window;
        
        // Überwache das Fenster, um zu erkennen, wenn es geschlossen wird
        chrome.windows.onRemoved.addListener(function windowClosedListener(windowId) {
          // Sicherstellen, dass popupWindow nicht null ist, bevor wir auf seine Eigenschaften zugreifen
          if (popupWindow && windowId === popupWindow.id) {
            // Fenster wurde geschlossen, setze popupWindow zurück
            popupWindow = null;
            // Entferne den Listener
            chrome.windows.onRemoved.removeListener(windowClosedListener);
          }
        });
      });
    } else {
      // Fallback, wenn keine Display-Informationen verfügbar sind
      chrome.windows.create({
        url: chrome.runtime.getURL("popup.html"),
        type: "popup",
        width: 1200,
        height: 800,
        focused: true
      }, function(window) {
        popupWindow = window;
        
        // Überwache das Fenster, um zu erkennen, wenn es geschlossen wird
        chrome.windows.onRemoved.addListener(function windowClosedListener(windowId) {
          // Sicherstellen, dass popupWindow nicht null ist, bevor wir auf seine Eigenschaften zugreifen
          if (popupWindow && windowId === popupWindow.id) {
            // Fenster wurde geschlossen, setze popupWindow zurück
            popupWindow = null;
            // Entferne den Listener
            chrome.windows.onRemoved.removeListener(windowClosedListener);
          }
        });
      });
    }
  });
}

// Wenn auf das Extension-Icon geklickt wird
chrome.action.onClicked.addListener(() => {
  openPopupWindow();
});

// Nachricht vom Popup empfangen
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSelectedText") {
    // Gespeicherten ausgewählten Text zurückgeben
    chrome.storage.local.get("selectedText", function(data) {
      sendResponse({ selectedText: data.selectedText || "" });
      // Nach dem Senden den gespeicherten Text löschen
      chrome.storage.local.remove("selectedText");
    });
    return true; // Wichtig für asynchrone Antwort
  }
  
  // Wenn das Popup geschlossen werden soll
  if (request.action === "closePopup") {
    try {
      if (popupWindow && popupWindow.id) {
        chrome.windows.remove(popupWindow.id, function() {
          if (chrome.runtime.lastError) {
            console.log("Fehler beim Schließen des Fensters:", chrome.runtime.lastError);
          }
          popupWindow = null;
        });
      } else {
        // Fenster existiert bereits nicht mehr
        popupWindow = null;
      }
    } catch (e) {
      console.error("Fehler beim Schließen des Popups:", e);
      popupWindow = null;
    }
    return true;
  }
  
  // API-Proxy für Hemingwai-Anfragen
  if (request.action === "apiRequest") {
    const { url, method, headers, body } = request;
    
    // Verwende XMLHttpRequest anstelle von fetch, um mehr Kontrolle zu haben
    const xhr = new XMLHttpRequest();
    xhr.open(method || "GET", url, true);
    
    // Headers setzen
    Object.keys(headers || {}).forEach(key => {
      xhr.setRequestHeader(key, headers[key]);
    });
    
    // Event-Handler für die Antwort
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          sendResponse({ success: true, data });
        } catch (e) {
          sendResponse({ success: false, error: "Fehler beim Parsen der Antwort: " + e.message });
        }
      } else {
        sendResponse({ success: false, error: "HTTP-Fehler: " + xhr.status });
      }
    };
    
    // Event-Handler für Fehler
    xhr.onerror = function() {
      sendResponse({ success: false, error: "Netzwerkfehler" });
    };
    
    // Anfrage senden
    xhr.send(body ? JSON.stringify(body) : null);
    
    return true; // Wichtig für asynchrone Antwort
  }
}); 