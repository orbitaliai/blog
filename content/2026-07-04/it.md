# Annuncio del server Model Context Protocol (MCP) di Orbitali: Costruisci agenti vocali direttamente dal tuo IDE

![Annuncio del server Model Context Protocol (MCP) di Orbitali: Costruisci agenti vocali direttamente dal tuo IDE](header.png)

Basta scrivere chiamate REST ripetitive. Ora i tuoi agenti di programmazione IA possono creare, aggiornare e gestire dinamicamente gli agenti vocali di Orbitali durante il tuo normale flusso di sviluppo.

Negli ultimi mesi, il modo in cui gli sviluppatori costruiscono software è cambiato radicalmente. Non scriviamo più codice in isolamento; facciamo pair programming con assistenti IA agentici come Claude Code, Cursor e Windsurf. Questi assistenti non si limitano a suggerire righe di autocompletamento: leggono codebase, cercano documentazione, eseguono comandi da terminale e creano intere funzionalità da zero.

Tuttavia, persisteva un importante punto di attrito: collegare questi assistenti di codice a servizi esterni. Se volevi che il tuo partner di programmazione IA configurasse o testasse un servizio esterno come **Orbitali**, doveva chiederti di cliccare manualmente su una dashboard web o copiare e incollare comandi curl di API dalla documentazione.

Oggi abbattiamo questa barriera. Siamo entusiasti di annunciare il rilascio del **server Model Context Protocol (MCP) di Orbitali**, uno strumento open source che consente ai tuoi assistenti di codice IA di interagire direttamente con l'infrastruttura vocale in tempo reale di Orbitali.

---

## Cos'è MCP?

Sviluppato da Anthropic, il **Model Context Protocol (MCP)** è uno standard aperto che consente ai modelli IA di connettersi in modo sicuro a origini dati e strumenti esterni. Immaginalo come una porta USB-C per l'IA: una volta che un servizio implementa un server MCP, qualsiasi client IA compatibile (come Claude Code o Cursor) può comprendere e interagire istantaneamente con i suoi tool, API e risorse.

Lanciando il nostro server MCP, offriamo ai tuoi agenti di codice locali un set di "mani" per costruire, modificare e testare i receptionist vocali di Orbitali direttamente all'interno del tuo ambiente di sviluppo.

---

## Come funziona: L'architettura

Il server MCP di Orbitali viene eseguito localmente sul tuo computer. Viene avviato dal tuo agente di codice tramite input/output standard (`stdio`) e comunica in modo sicuro con il gateway delle API pubbliche di Orbitali (`/public/v1`) utilizzando la tua chiave API.

```
┌────────────────────────┐           stdio (Locale)          ┌────────────────────────┐
│   TUO AGENTE DI CODICE │ ────────────────────────────────> │   SERVER MCP ORBITALI  │
│  - Claude / Cursor     │ <──────────────────────────────── │  - Runtime locale Node │
└────────────────────────┘                                   └───────────┬────────────┘
                                                                         │
                                                             HTTPS       │  Richiesta API
                                                             (Sicuro)    │  con Chiave API
                                                                         ▼
                                                             ┌─────────────────────────┐
                                                             │   API PUBBLICA ORBITALI │
                                                             │ https://api.orbitali.ai │
                                                             └─────────────────────────┘
```

Invece di richiedere al tuo agente di scrivere chiamate REST grezze, validare schemi di payload e gestire l'autenticazione manualmente, il server MCP espone **tool sicuri per il flusso di lavoro**. L'agente chiama semplicemente funzioni di alto livello e il server MCP le traduce in corrette interazioni API.

---

## Funzionalità e strumenti chiave

Il server MCP espone un ricco set di tool per gestire la tua infrastruttura vocale:

### 1. Gestione del ciclo di vita degli agenti vocali
* **`list_agents`**: Recupera tutti gli agenti vocali nel tuo account, inclusi i loro prompt, modelli vocali e configurazioni webhook.
* **`get_or_create_agent`**: Recupera un agente esistente tramite nome o ne crea uno nuovo al volo.
* **`patch_agent`**: Aggiorna a livello programmatico parametri dell'agente quali prompt di sistema, lingua, modello vocale (es. impostazioni speech-to-speech), temperatura e latenza di risposta.

### 2. Collegamento di tool personalizzati agli agenti vocali
* **`list_agent_tools`**: Elenca le funzioni che l'agente vocale può richiamare durante una telefonata.
* **`ensure_agent_tools`**: Consente all'agente di codice di collegare nuovi tool (come webhook di prenotazione o query su database) al receptionist vocale, garantendo che l'agente disponga del corretto schema API per recuperare dati del mondo reale durante la conversazione.

### 3. Gestione della Knowledge Base RAG
* **`list_knowledge_documents`**: Elenca i documenti allegati all'agente.
* **`upload_knowledge_document`**: Carica file `.txt`, `.md` o `.pdf` nella knowledge base dell'agente, fornendogli contesto immediato (come cataloghi prodotti o policy aziendali) da consultare durante le chiamate.
* **`delete_knowledge_document`**: Rimuove i documenti obsoleti dalla memoria dell'agente.

### 4. Test diretto di sessioni in tempo reale
* **`create_realtime_session`**: Genera credenziali WebRTC temporanee per avviare subito una sessione vocale a bassa latenza e testare localmente il modello speech-to-speech dell'agente.

---

## Configurazione in 60 secondi

Il server è distribuito via npm e funziona con Node o Bun. Per configurarlo con il tuo assistente di codice preferito, ti servirà una chiave API di Orbitali (disponibile nella dashboard di Orbitali sotto **Settings → API Keys**).

### Con Claude Code
Esegui il seguente comando per installare e registrare automaticamente il server:

```bash
claude mcp add orbitali --env ORBITALI_API_KEY=sk_your_key -- bunx @orbitali/mcp
```

### Con Cursor o Windsurf
Aggiungi la configurazione direttamente al file `.cursor/mcp.json` o `.windsurf/mcp.json` del tuo progetto:

```json
{
  "mcpServers": {
    "orbitali": {
      "command": "bunx",
      "args": ["@orbitali/mcp"],
      "env": {
        "ORBITALI_API_KEY": "sk_your_key",
        "ORBITALI_API_BASE_URL": "https://api.orbitali.ai"
      }
    }
  }
}
```

---

## Una panoramica pratica nel mondo reale

Vediamo come questo cambia il tuo flusso di lavoro quotidiano. Immagina di sviluppare un sistema di prenotazione per uno studio dentistico. Hai creato un server Express locale per gestire le prenotazioni.

Con il server MCP di Orbitali abilitato, puoi fornire una singola istruzione al tuo assistente di programmazione:

> "Crea un receptionist vocale chiamato 'Dental Reception Bot' che aiuti i pazienti a prenotare appuntamenti. Collegalo al mio endpoint locale di prenotazione POST su `https://b832-72-10.ngrok-free.app/api/bookings`, e carica `clinic_hours.md` come contesto. Infine, forniscimi un comando per testarlo."

Il tuo agente di codice eseguirà autonomamente i seguenti passaggi:
1. Analizza la struttura della tua API locale e legge `clinic_hours.md`.
2. Esegue **`get_or_create_agent`** per registrare `Dental Reception Bot` con le relative impostazioni vocali.
3. Esegue **`upload_knowledge_document`** per allegare `clinic_hours.md` alla memoria dell'agente.
4. Esegue **`ensure_agent_tools`** per registrare il tool di prenotazione con lo schema JSON corretto, puntandolo al tuo tunnel ngrok.
5. Esegue **`create_realtime_session`** per recuperare un token WebRTC e generare un link di test.

Nel giro di pochi secondi, l'agente risponde:
> *"Ho creato l'agente vocale, caricato gli orari e collegato il tool di prenotazione. Puoi testare il tuo agente eseguendo questo script client WebRTC o accedendo alla console di test di Orbitali."*

Non hai dovuto scrivere una sola richiesta API, né formattare payload JSON, né lasciare il tuo terminale.

---

## Open Source ed estendibile

Crediamo fermamente che gli strumenti per sviluppatori debbano essere aperti e trasparenti. Il server MCP di Orbitali è interamente open source ed è ospitato su GitHub. Se desideri esaminare il codice sorgente, segnalare un problema o aggiungere tool personalizzati, visita il repository:

👉 **[github.com/orbitaliai/mcp](https://github.com/orbitaliai/mcp)**

Non vediamo l'ora di scoprire quali applicazioni vocali costruirai con Orbitali e MCP. Inizia oggi stesso e lascia che il tuo assistente di codice faccia il lavoro pesante!
