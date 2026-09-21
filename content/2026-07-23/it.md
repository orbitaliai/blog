# Tu possiedi la logica, Orbitali esegue l'agente: Come costruire agenti webhook sicuri

![Tu possiedi la logica, Orbitali esegue l'agente: Come costruire agenti webhook sicuri](header.png)

Quando si integra la Voice AI nel software aziendale, gli sviluppatori affrontano una decisione architetturale critica: **Dove risiedono i dati dei clienti?**

Nelle piattaforme vocali di prima generazione, l'approccio standard consiste nel sincronizzare ogni elemento. Se desideri che il tuo agente vocale saluti un cliente per nome, conosca i suoi ordini recenti o acceda alla cronologia delle prenotazioni, devi esportare quei dati nel database proprietario della piattaforma vocale. Devi configurare i campi personalizzati per i contatti, impostare sincronizzazioni periodiche e replicare le tue regole di business all'interno della loro dashboard.

Per i team SaaS che integrano la voce (ICP 2) e i System Integrator (ICP 3) che operano con aziende consolidate, questo schema è inaccettabile. Crea un enorme carico di gestione per la sincronizzazione dei dati, espande la superficie di attacco della sicurezza e introduce complesse problematiche di conformità (HIPAA, GDPR, SOC 2) duplicando informazioni personali identificabili (PII) su ambienti di terze parti.

In **Orbitali**, crediamo in una netta separazione delle responsabilità: **Tu possiedi la logica e i record dei clienti; Orbitali gestisce il runtime stateless dell'agente.**

Sfruttando gli agenti vocali basati su Webhook, puoi costruire sistemi conversazionali altamente personalizzati e sicuri, mantenendo tutti i dati sensibili e la logica di business all'interno del tuo database backend. Vediamo come implementare questa architettura utilizzando gli hook del ciclo di vita di Orbitali e gli eventi webhook firmati crittograficamente.

---

## Il saluto dinamico: `agent:assistant-request`

Invece di codificare rigidamente istruzioni di sistema o sincronizzare profili cliente su Orbitali, puoi costruire i prompt a livello programmatico in tempo reale nel momento stesso in cui la chiamata si connette.

Quando viene avviata una chiamata, Orbitali attiva l'hook del ciclo di vita `agent:assistant-request`. Questo webhook richiede al tuo backend le istruzioni specifiche, le variabili dinamiche e il messaggio di benvenuto personalizzato che devono guidare la chiamata.

Ad esempio, quando un utente compone il tuo numero telefonico, Orbitali invia il numero del chiamante alla tua API. Il tuo sistema cerca il record, identifica chi sta chiamando, verifica la presenza di eventi imminenti (come una visita clinica fissata per il giorno successivo) e inietta tale contesto direttamente nello spazio di memoria dell'agente.

Ecco come gestire questo flusso in un backend Node.js/Express:

```javascript
const express = require('express');
const app = express();
app.use(express.json());

// Simulazione di ricerca nel database
const db = {
  getCustomerByPhone: (phone) => {
    if (phone === '+15550199') {
      return { id: 'cust_982', name: 'Pedro' };
    }
    return null;
  },
  getUpcomingAppointment: (customerId) => {
    if (customerId === 'cust_982') {
      return { date: '2026-07-24T10:00:00Z', type: 'Clinical checkup' };
    }
    return null;
  }
};

app.post('/webhook/agent-assistant-request', (req, res) => {
  const { caller_id } = req.body;
  
  // 1. Recupera l'utente dal tuo database
  const customer = db.getCustomerByPhone(caller_id);
  
  if (customer) {
    // 2. Recupera il contesto (es. un appuntamento domani)
    const appointment = db.getUpcomingAppointment(customer.id);
    
    if (appointment) {
      // 3. Inietta il prompt dinamico e il saluto personalizzato
      return res.json({
        prompt: `Sei un assistente professionale di Clinic Care. Stai parlando con ${customer.name}, che ha in programma un/a ${appointment.type} per domani. Il tuo obiettivo è aiutarlo a confermare, cancellare o riprogrammare l'appuntamento. Mantieni risposte cortesi e concise.`,
        first_message: `Buongiorno ${customer.name}, chiama per riprogrammare la sua visita in clinica fissata per domani?`
      });
    }
  }

  // Istruzioni predefinite di fallback per chiamanti non riconosciuti
  return res.json({
    prompt: "Sei un receptionist professionale di Clinic Care. Chiedi al chiamante il suo nome e come puoi essergli utile.",
    first_message: "Grazie per aver chiamato Clinic Care. Come posso aiutarla oggi?"
  });
});
```

Con questo modello, Orbitali non memorizza mai "Pedro" o i suoi record di visita clinica sui propri server. Il runtime vocale riceve un contesto di prompt temporaneo per la durata della telefonata, esegue il ciclo audio-testo-audio e lo elimina non appena viene inviato l'evento di chiusura della chiamata.

---

## Azioni sicure: Verifica delle firme HMAC

Un agente vocale non è solo un receptionist; è un motore transazionale. Un agente che parla con Pedro deve essere in grado di *riprogrammare* quell'appuntamento. Per farlo, l'agente utilizza il **Tool Calling** (o chiamata di funzioni).

Quando l'agente decide di invocare un tool, Orbitali invia una richiesta POST al Server URL configurato. Tuttavia, poiché questo endpoint può modificare record reali del database (ad esempio modificando la data di un appuntamento), è fondamentale verificare che le richieste in arrivo provengano autenticamente da Orbitali e non da attori malevoli che falsificano le richieste.

Per proteggere questo perimetro, Orbitali firma ogni payload webhook utilizzando una firma crittografica HMAC-SHA256, associata a una chiave segreta impostata nella tua dashboard. Validando questa firma, garantisci che solo le sessioni vocali autorizzate possano mutare i dati nel tuo database.

Ecco una tipica implementazione di un middleware Express per verificare le firme HMAC:

```javascript
const crypto = require('crypto');

function verifyOrbitaliWebhook(req, res, next) {
  const signatureHeader = req.headers['x-orbitali-signature'];
  const webhookSecret = process.env.ORBITALI_WEBHOOK_SECRET;

  if (!signatureHeader || !webhookSecret) {
    return res.status(401).json({ error: 'Unauthorized: Missing signature or signing secret' });
  }

  // Calcola l'HMAC SHA256 del corpo grezzo del payload
  const hmac = crypto.createHmac('sha256', webhookSecret);
  const rawBody = JSON.stringify(req.body);
  const computedSignature = hmac.update(rawBody).digest('hex');

  // Confronto a tempo costante per prevenire attacchi di temporizzazione (timing attacks)
  const signatureBuffer = Buffer.from(signatureHeader, 'hex');
  const computedBuffer = Buffer.from(computedSignature, 'hex');

  if (signatureBuffer.length !== computedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, computedBuffer)) {
    return res.status(403).json({ error: 'Forbidden: Request signature is invalid' });
  }

  next();
}

// Rotta protetta per la gestione del tool
app.post('/webhook/tools/reschedule-appointment', verifyOrbitaliWebhook, (req, res) => {
  const { appointment_id, new_date } = req.body;
  
  // Aggiorna in modo sicuro il record nel database
  db.updateAppointment(appointment_id, new_date);
  
  res.json({
    status: 'success',
    message: `Appuntamento riprogrammato con successo per il giorno ${new_date}.`
  });
});
```

Questo approccio garantisce la sovranità assoluta sui dati:
1. **Autenticazione dinamica**: I tuoi endpoint webhook convalidano l'identità crittografica di Orbitali prima di qualsiasi operazione di scrittura.
2. **Zero telemetria permanente**: Nessuna API di terze parti ha accesso in scrittura al tuo database; richiedono azioni esclusivamente attraverso webhook sicuri.

---

## Perché questa architettura vince per team SaaS e System Integrator

Per i team che realizzano software solido e resiliente, questa chiara separazione architetturale offre tre grandi vantaggi:

### Sovranità su sicurezza e conformità
Se operi nei settori sanitario, finanziario o legale, sincronizzare dati PII con un provider vocale richiede la firma di accordi BAA (Business Associate Agreements), audit continui sulla crittografia dei database altrui e la gestione di complesse richieste di cancellazione GDPR. Con Orbitali, poiché i profili dei clienti non risiedono mai nel nostro database, il tuo perimetro di compliance rimane del tutto inalterato.

### Nessun carico di sincronizzazione
La sincronizzazione dei dati è notoriamente fragile. Se un cliente aggiorna il proprio recapito telefonico o fissa un appuntamento tramite portale web, sincronizzare tale modifica su una dashboard vocale in tempo reale richiede complesse pipeline di eventi. Recuperando il contesto dinamicamente tramite `agent:assistant-request`, il tuo agente vocale ottiene sempre l'unica fonte di verità direttamente dal tuo database SQL/NoSQL.

### Sviluppo locale rapido
Poiché l'agente vocale fa affidamento unicamente sui tuoi webhook locali, non è necessario ricompilare o ridistribuire la configurazione dell'agente nel cloud quando modifichi le regole di business. Puoi usare strumenti come Ngrok o Cloudflare Tunnels per instradare le richieste webhook al tuo server di sviluppo locale, modificare i tuoi endpoint Express e verificare immediatamente il comportamento dell'agente, riducendo drasticamente il ciclo di feedback dello sviluppatore.

---

## Riepilogo: Mantenere la logica dove appartiene

Costruire integrazioni vocali enterprise non deve significare scendere a compromessi su sicurezza o proprietà dei dati. Con l'architettura basata su webhook di Orbitali:
* **Orbitali** funge da runtime di streaming in tempo reale ad alte prestazioni — gestendo segnalazione SIP, flussi WebRTC, TTS a bassissima latenza ed esecuzione LLM.
* **Il tuo Backend** mantiene il controllo esclusivo sui prompt di sistema, sul database PII e sui permessi di scrittura transazionali.

Pronto a creare un agente webhook sicuro? Consulta la nostra documentazione per sviluppatori e inizia oggi stesso.
