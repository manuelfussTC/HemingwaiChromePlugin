document.addEventListener("DOMContentLoaded", function () {
  // DOM-Elemente
  const apiKeyInput = document.getElementById("apiKey");
  const saveApiKeyButton = document.getElementById("saveApiKey");
  const endpointSelect = document.getElementById("endpointSelect");
  const parameterInputsDiv = document.getElementById("parameterInputs");
  const output = document.getElementById("output");
  const sendButton = document.getElementById("sendToHemingwai");
  const copyButton = document.getElementById("copyResult");
  const loadingIndicator = document.getElementById("loadingIndicator");

  // Variablen für die API-Kommunikation
  let selectedEndpoint = null;
  let endpointParameters = {};
  let apiKey = "";
  let selectedText = "";

  // Event-Listener für das Schließen des Fensters
  window.addEventListener("beforeunload", function() {
    // Sende Nachricht an den Background-Service-Worker, dass das Popup geschlossen wurde
    try {
      chrome.runtime.sendMessage({ action: "closePopup" }, function(response) {
        // Ignoriere Fehler, die auftreten könnten, wenn der Background-Service-Worker nicht mehr aktiv ist
        if (chrome.runtime.lastError) {
          console.log("Fehler beim Senden der closePopup-Nachricht:", chrome.runtime.lastError);
        }
      });
    } catch (e) {
      console.error("Fehler beim Schließen des Popups:", e);
    }
  });

  // API-Schlüssel aus dem Chrome-Speicher laden
  chrome.storage.sync.get("hemingwaiApiKey", function(data) {
    if (data.hemingwaiApiKey) {
      apiKey = data.hemingwaiApiKey;
      apiKeyInput.value = apiKey;
      loadEndpoints();
    }
  });

  // Prüfen, ob ausgewählter Text vom Kontextmenü vorhanden ist
  chrome.runtime.sendMessage({ action: "getSelectedText" }, function(response) {
    if (response && response.selectedText) {
      selectedText = response.selectedText;
      // Wir speichern den Text, um ihn später in das entsprechende Feld einzufügen
    }
  });

  // API-Schlüssel speichern
  saveApiKeyButton.addEventListener("click", function() {
    apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.sync.set({ "hemingwaiApiKey": apiKey }, function() {
        showMessage("API-Schlüssel gespeichert!", "success", apiKeyInput);
        loadEndpoints();
      });
    } else {
      showMessage("Bitte gib einen gültigen API-Schlüssel ein", "error", apiKeyInput);
    }
  });

  // Funktion für API-Anfragen
  function makeApiRequest(url, method, body) {
    return fetch(url, {
      method: method || "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey
      },
      body: body ? JSON.stringify(body) : undefined
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(err => {
          throw new Error(err.message || `HTTP-Fehler ${response.status}`);
        });
      }
      return response.json();
    });
  }

  // Alle verfügbaren Hemingwai-Endpoints laden
  function loadEndpoints() {
    if (!apiKey) return;

    showLoading(true);
    
    // Neuer API-Endpoint für verfügbare Endpoints
    makeApiRequest("https://hemingwai.de/api/available_endpoints", "GET")
      .then(data => {
        endpointSelect.innerHTML = "<option value='' disabled selected>Bitte wählen...</option>";
        
        if (data.success && data.endpoints && Array.isArray(data.endpoints)) {
          data.endpoints.forEach(endpoint => {
            let option = document.createElement("option");
            option.value = endpoint.endpointId;
            option.textContent = endpoint.name;
            option.title = endpoint.description || "";
            endpointSelect.appendChild(option);
          });
        }
      })
      .catch(error => {
        showMessage("Fehler beim Laden der Endpoints: " + error.message, "error");
      })
      .finally(() => {
        showLoading(false);
      });
  }

  // Wenn der User einen Endpoint auswählt, lade die Parameter-Definitionen
  endpointSelect.addEventListener("change", function () {
    selectedEndpoint = endpointSelect.value;
    if (!selectedEndpoint) return;

    showLoading(true);
    
    // Neuer API-Endpoint für Endpoint-Informationen
    makeApiRequest(`https://hemingwai.de/api/endpoint_info?endpoint_id=${selectedEndpoint}`, "GET")
      .then(data => {
        if (data.success && data.endpoint && data.endpoint.parameters) {
          endpointParameters = data.endpoint.parameters;
          parameterInputsDiv.innerHTML = ""; // Vorherige Felder löschen

          // Dynamisch Eingabefelder für jeden Parameter erstellen
          Object.keys(endpointParameters).forEach(param => {
            const paramInfo = endpointParameters[param];
            const paramContainer = document.createElement("div");
            paramContainer.className = "parameter-item";
            
            const label = document.createElement("label");
            label.textContent = paramInfo.description || param;
            label.setAttribute("for", param);
            
            let input;
            if (paramInfo.type === "text" && paramInfo.multiline) {
              input = document.createElement("textarea");
            } else {
              input = document.createElement("input");
              input.type = paramInfo.type === "number" ? "number" : "text";
            }
            
            input.id = param;
            input.name = param;
            input.placeholder = paramInfo.placeholder || param;
            
            if (paramInfo.default) {
              input.value = paramInfo.default;
            }
            
            // Wenn wir ausgewählten Text haben und dieser Parameter für Text ist,
            // fügen wir den ausgewählten Text ein
            if (selectedText && (param === "text" || param === "content" || param === "input")) {
              input.value = selectedText;
              selectedText = ""; // Zurücksetzen, damit wir es nicht mehrfach einfügen
            }
            
            // Event-Listener für Enter-Taste hinzufügen
            input.addEventListener("keydown", function(event) {
              if (event.key === "Enter" && !event.shiftKey) {
                // Bei Textarea nur reagieren, wenn nicht Shift+Enter (für neue Zeile)
                if (input.tagName.toLowerCase() !== "textarea" || event.key === "Enter") {
                  event.preventDefault(); // Standardverhalten verhindern
                  sendButton.click(); // Verarbeiten-Button klicken
                }
              }
            });
            
            paramContainer.appendChild(label);
            paramContainer.appendChild(input);
            parameterInputsDiv.appendChild(paramContainer);
          });
        }
      })
      .catch(error => {
        showMessage("Fehler beim Laden der Parameter: " + error.message, "error");
      })
      .finally(() => {
        showLoading(false);
      });
  });

  // Request an Hemingwai senden
  sendButton.addEventListener("click", function () {
    if (!selectedEndpoint) {
      showMessage("Bitte wähle einen Endpoint aus", "error");
      return;
    }

    if (!apiKey) {
      showMessage("Bitte gib einen API-Schlüssel ein", "error");
      return;
    }

    // Werte aus den dynamischen Input-Feldern sammeln
    let parameters = {};
    let isValid = true;

    Object.keys(endpointParameters).forEach(param => {
      const input = document.getElementById(param);
      if (input) {
        const value = input.value.trim();
        
        // Prüfen, ob ein erforderlicher Parameter fehlt
        if (endpointParameters[param].required && !value) {
          showMessage(`Parameter "${param}" ist erforderlich`, "error", input);
          isValid = false;
        }
        
        parameters[param] = value;
      }
    });

    if (!isValid) return;

    showLoading(true);
    output.textContent = "";
    copyButton.disabled = true;

    // API-Endpoint für die Ausführung
    makeApiRequest("https://hemingwai.de/api/execute", "POST", {
      endpoint_id: selectedEndpoint,
      parameters: parameters
    })
      .then(data => {
        console.log("API-Antwort:", data); // Logge die vollständige Antwort zur Inspektion
        
        if (data.success && data.output) {
          // Neues Format mit output-Schlüssel
          output.textContent = data.output;
          copyButton.disabled = false;
        } else if (data.success && data.data && data.data.execution_result && data.data.execution_result.response) {
          output.textContent = data.data.execution_result.response;
          copyButton.disabled = false;
        } else if (data.success && data.result) {
          // Alternative Antwortstruktur
          output.textContent = data.result;
          copyButton.disabled = false;
        } else if (data.success && data.response) {
          // Weitere alternative Antwortstruktur
          output.textContent = data.response;
          copyButton.disabled = false;
        } else if (data.success && typeof data.data === 'string') {
          // Falls data.data direkt ein String ist
          output.textContent = data.data;
          copyButton.disabled = false;
        } else if (data.success && data.data && typeof data.data.response === 'string') {
          // Falls data.data.response ein String ist
          output.textContent = data.data.response;
          copyButton.disabled = false;
        } else {
          // Wenn keine bekannte Struktur gefunden wurde, zeige die gesamte Antwort an
          output.textContent = "Unbekanntes Antwortformat. Rohdaten:\n\n" + JSON.stringify(data, null, 2);
          copyButton.disabled = false;
        }
      })
      .catch(error => {
        showMessage("Fehler bei der Verarbeitung: " + error.message, "error");
        output.textContent = "Fehler: " + error.message;
      })
      .finally(() => {
        showLoading(false);
      });
  });

  // Ergebnis in die Zwischenablage kopieren
  copyButton.addEventListener("click", function() {
    const text = output.textContent;
    
    // Text in die Zwischenablage kopieren
    navigator.clipboard.writeText(text)
      .then(() => {
        // Erfolgreiche Kopier-Animation anzeigen
        const originalText = copyButton.textContent;
        copyButton.textContent = "✓ Kopiert!";
        copyButton.classList.add("success-button");
        
        // Nach 2 Sekunden zurücksetzen
        setTimeout(() => {
          copyButton.textContent = originalText;
          copyButton.classList.remove("success-button");
        }, 2000);
      })
      .catch(err => {
        // Fehlermeldung anzeigen
        showMessage("Fehler beim Kopieren: " + err, "error", copyButton);
      });
  });

  // Hilfsfunktionen
  function showLoading(isLoading) {
    loadingIndicator.style.display = isLoading ? "flex" : "none";
  }

  function showMessage(message, type, element) {
    // Bestehende Fehlermeldungen entfernen
    const existingMessages = document.querySelectorAll(".error, .success");
    existingMessages.forEach(msg => msg.remove());

    const messageElement = document.createElement("div");
    messageElement.className = type;
    messageElement.textContent = message;

    if (element) {
      element.parentNode.insertBefore(messageElement, element.nextSibling);
      
      // Nachricht nach 3 Sekunden ausblenden
      setTimeout(() => {
        messageElement.remove();
      }, 3000);
    } else {
      output.textContent = message;
    }
  }
}); 